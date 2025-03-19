//! Double Auction Smart Contract for Prediction Markets
//! 
//! Implements an order book trading system with automatic price matching.
//! Uses AVL trees for efficient order management and supports decimal prices
//! through numerator/denominator scaling.

#[macro_use]
extern crate pbc_contract_codegen;

use pbc_contract_common::address::Address;
use pbc_contract_common::context::{CallbackContext, ContractContext};
use pbc_contract_common::events::EventGroup;
use defi_common::interact_mpc20;
use defi_common::token_balances::{DepositToken, TokenBalances};
use create_type_spec_derive::CreateTypeSpec;
use read_write_rpc_derive::ReadWriteRPC;
use read_write_state_derive::ReadWriteState;
use pbc_contract_common::avl_tree_map::AvlTreeMap;

/// Sequential identifier for orders, ensuring time priority within price levels
#[derive(Copy, Clone, Debug, ReadWriteRPC, ReadWriteState, CreateTypeSpec)]
pub struct LimitOrderId {
    raw_id: u64,
}

impl LimitOrderId {
    pub fn initial_id() -> Self {
        LimitOrderId { raw_id: 0 }
    }

    /// Generates next ID, panics if u64::MAX reached
    pub fn next(&self) -> Self {
        LimitOrderId {
            raw_id: self
                .raw_id
                .checked_add(1)
                .expect("All possible LimitOrderIds have been assigned"),
        }
    }

    pub fn from_raw(r: u64) -> Self {
        LimitOrderId { raw_id: r }
    }

    pub fn to_raw(&self) -> u64 {
       self.raw_id
    }
}

/// Token amount type (supports large quantities)
pub type TokenAmount = u128;

/// Price type (actual price = price * numerator/denominator)
pub type Price = u64;

/// Improved price calculation with better safety checks
fn total_price(amount: TokenAmount, price: Price, price_numerator: u64, price_denominator: u64) -> TokenAmount {
    assert!(price_denominator != 0, "Invalid price denominator");
    assert!(amount > 0, "Amount must be positive");
    assert!(amount >> 64 == 0, "Amount too large");
    
    // Safe multiplication steps
    let amount_times_price = amount.checked_mul(price as u128)
        .expect("Price calculation overflow");
    
    let after_denominator = amount_times_price.checked_div(price_denominator as u128)
        .expect("Division error");
        
    after_denominator.checked_mul(price_numerator as u128)
        .expect("Final price calculation overflow")
}

/// Order in the book specifying price, amount and ownership
#[derive(Copy, Clone, Debug, ReadWriteRPC, ReadWriteState, CreateTypeSpec)]
pub struct LimitOrder {
    pub amount: TokenAmount,
    pub price: Price,
    pub id: LimitOrderId,
    pub owner: Address,
    pub is_bid: bool,         // true=buy, false=sell
    pub cancelation_id: u32
}

/// Request to cancel an order
#[derive(Copy, Clone, Debug, ReadWriteRPC, ReadWriteState, CreateTypeSpec)]
pub struct CancelationRequest {
   pub owner: Address,
   pub id: u32,
}

const CURRENCY_TOKEN: DepositToken = DepositToken::TokenA{};
const ASSET_TOKEN: DepositToken = DepositToken::TokenB{};
const DUMMY_TOKEN: DepositToken = DepositToken::LiquidityToken{};

/// Priority key for order book sorting
/// Bids: Higher prices first (descending)
/// Asks: Lower prices first (ascending)
#[derive(Copy, Clone, Debug, ReadWriteRPC, ReadWriteState, CreateTypeSpec)]
pub struct Priority {
    pub key: u128  // Composite of price and order ID
}

/// Contract state managing order books and balances
#[state]
pub struct DoubleAuctionContractState {
    price_numerator: u64,
    price_denominator: u64,
    next_order_id: LimitOrderId,
    pub double_auction_address: Address,
    pub currency_token_address: Address,
    pub asset_token_address: Address,
    pub token_balances: TokenBalances,
    orders_by_cancelation_request: AvlTreeMap<CancelationRequest, LimitOrder>,
    bids: AvlTreeMap<Priority, LimitOrder>,     // Buy orders
    asks: AvlTreeMap<Priority, LimitOrder>,     // Sell orders
}

/// Initializes the double auction contract with price scaling and token addresses
#[init]
pub fn initialize(
    context: ContractContext,
    currency_token_address: Address,
    asset_token_address: Address,
    price_numerator: u64,
    price_denominator: u64,
) -> (DoubleAuctionContractState, Vec<EventGroup>) {

    let token_balances =
        TokenBalances::new(context.contract_address, currency_token_address, asset_token_address).unwrap();
    let new_state = DoubleAuctionContractState {
        next_order_id: LimitOrderId::initial_id(),
	price_numerator: price_numerator,
	price_denominator: price_denominator,
        double_auction_address: context.contract_address,
	currency_token_address: currency_token_address,
	asset_token_address: asset_token_address,
        token_balances,
	orders_by_cancelation_request: AvlTreeMap::new(),
	bids: AvlTreeMap::new(),
	asks: AvlTreeMap::new(),
    };
    (new_state, vec![])
}

/// Deposits tokens (currency or asset) into the contract
/// Panics if token address doesn't match either currency or asset token
#[action(shortname = 0x01)]
pub fn deposit(
    context: ContractContext,
    state: DoubleAuctionContractState,
    token_address: Address,
    amount: TokenAmount,
) -> (DoubleAuctionContractState, Vec<EventGroup>) {

    let mut token = DUMMY_TOKEN;
    if token_address == state.currency_token_address {
       token = CURRENCY_TOKEN;
    } else if token_address == state.asset_token_address {
       token = ASSET_TOKEN
    }
    if token == DUMMY_TOKEN {
       panic!(
            "token address provided does not match any of the two deposit token addresses.",
        );
    }
 
    let mut event_group_builder = EventGroup::builder();
    interact_mpc20::MPC20Contract::at_address(token_address).transfer_from(
        &mut event_group_builder,
        &context.sender,
        &state.double_auction_address,
        amount,
    );

    event_group_builder
        .with_callback(SHORTNAME_DEPOSIT_CALLBACK)
        .argument(token)
        .argument(amount)
        .done();

    (state, vec![event_group_builder.build()])
}

/// Callback handler for successful token deposits
#[callback(shortname = 0x10)]
pub fn deposit_callback(
    context: ContractContext,
    callback_context: CallbackContext,
    mut state: DoubleAuctionContractState,
    token: DepositToken,
    amount: TokenAmount,
) -> (DoubleAuctionContractState, Vec<EventGroup>) {
    assert!(callback_context.success, "Transfer did not succeed");

    state
        .token_balances
        .add_to_token_balance(context.sender, token, amount);
    (state, vec![])
}

/// Withdraws tokens from the contract to user's address
/// Optional callback wait for transaction confirmation
#[action(shortname = 0x02)]
pub fn withdraw(
    context: ContractContext,
    mut state: DoubleAuctionContractState,
    token_address: Address,
    amount: TokenAmount,
    wait_for_callback: bool,
) -> (DoubleAuctionContractState, Vec<EventGroup>) {

    let mut token = DUMMY_TOKEN;
    if token_address == state.currency_token_address {
       token = CURRENCY_TOKEN;
    } else if token_address == state.asset_token_address {
       token = ASSET_TOKEN
    }
    if token == DUMMY_TOKEN {
       panic!(
            "token address provided does not match any of the two deposit token addresses.",
        );
    }
    state
        .token_balances
        .deduct_from_token_balance(context.sender, token, amount);

    let mut event_group_builder = EventGroup::builder();
    interact_mpc20::MPC20Contract::at_address(token_address).transfer(
        &mut event_group_builder,
        &context.sender,
        amount,
    );
    if wait_for_callback {
        event_group_builder
            .with_callback(SHORTNAME_WAIT_WITHDRAW_CALLBACK)
            .done();
    }
    (state, vec![event_group_builder.build()])
}

/// Callback handler for withdrawal confirmation
#[callback(shortname = 0x15)]
fn wait_withdraw_callback(
    _context: ContractContext,
    _callback_context: CallbackContext,
    state: DoubleAuctionContractState,
) -> (DoubleAuctionContractState, Vec<EventGroup>) {
    (state, vec![])
}

/// Add minimum order size
const MIN_ORDER_SIZE: TokenAmount = 1000; // Adjust based on token decimals

/// Improved bid submission with validation
fn submit_bid(
    context: ContractContext,
    mut state: DoubleAuctionContractState,
    price: Price,
    amount: TokenAmount,
    cancelation_id: u32,
    ) -> (DoubleAuctionContractState, Vec<EventGroup>) {

    assert!(amount >= MIN_ORDER_SIZE, "Order too small");
    assert!(price > 0, "Invalid price");

    let mut rest_amount = amount;
    
    while (rest_amount > 0) && (state.asks.len()>0) {
      if let Some((key, mut ask_order)) = state.asks.iter().next() {
         if ask_order.price > price { break; }
	 
	 state.asks.remove(&key);

         if ask_order.amount > rest_amount {
            state.token_balances.move_tokens(
              context.sender,
              ask_order.owner,
              CURRENCY_TOKEN,
              total_price(rest_amount, ask_order.price, state.price_numerator, state.price_denominator),
	    );
	    state.token_balances.move_tokens(
              state.double_auction_address,
              context.sender,
              ASSET_TOKEN,
              rest_amount,
	    );
	    ask_order.amount -= rest_amount;
	    state.asks.insert(key, ask_order);
	    rest_amount = 0;
         } else {
	    state.token_balances.move_tokens(
              context.sender,
              ask_order.owner,
              CURRENCY_TOKEN,
              total_price(ask_order.amount, ask_order.price, state.price_numerator, state.price_denominator),
	    );
	    state.token_balances.move_tokens(
              state.double_auction_address,
              context.sender,
              ASSET_TOKEN,
              ask_order.amount,
	    );
	    rest_amount -= ask_order.amount;
	    let cancelation_request = CancelationRequest{owner: ask_order.owner, id: ask_order.cancelation_id};
	    state.orders_by_cancelation_request.remove(&cancelation_request)
	  }
       }
    }
     
    if rest_amount > 0 {	   
      let pri = Priority::high_low(price, state.next_order_id.to_raw());
      let new_bid_order = LimitOrder {price: price, amount: rest_amount, id: state.next_order_id, owner: context.sender, is_bid: true, cancelation_id: cancelation_id}; 
      state.bids.insert(pri, new_bid_order);
      let cancelation_request = CancelationRequest{owner: context.sender, id: cancelation_id};
      state.orders_by_cancelation_request.insert(cancelation_request, new_bid_order);
      state.token_balances.move_tokens(
          context.sender,
          state.double_auction_address,
          CURRENCY_TOKEN,
          total_price(rest_amount, price, state.price_numerator, state.price_denominator),
       );

      state.next_order_id = state.next_order_id.next();}
     
    (state, vec![])
}

/// Submits an ask (sell order) to the auction
/// Matches with existing bids if possible, otherwise stores in order book
/// Transfers tokens between parties for matched orders
#[action(shortname = 0x04)]
fn submit_ask(
    context: ContractContext,
    mut state: DoubleAuctionContractState,
    price: Price,
    amount: TokenAmount,
    cancelation_id: u32
    ) -> (DoubleAuctionContractState, Vec<EventGroup>) {

    let mut rest_amount = amount;
    
    while (rest_amount > 0) && (state.bids.len()>0) {
      if let Some((key, mut bid_order)) = state.bids.iter().next() {
         if bid_order.price < price { break; }
	 
	 state.bids.remove(&key);

         if bid_order.amount > rest_amount {
            state.token_balances.move_tokens(
	      state.double_auction_address,
	      context.sender,
              CURRENCY_TOKEN,
              total_price(rest_amount, bid_order.price, state.price_numerator, state.price_denominator)
	    );
	    state.token_balances.move_tokens(
              context.sender,
	      bid_order.owner,
              ASSET_TOKEN,
              rest_amount,
	    );
	    bid_order.amount -= rest_amount;
	    state.bids.insert(key, bid_order);
	    rest_amount = 0;
         } else {
	    state.token_balances.move_tokens(
	      state.double_auction_address,
	      context.sender,
              CURRENCY_TOKEN,
              total_price(bid_order.amount, bid_order.price, state.price_numerator, state.price_denominator)
	    );
	    state.token_balances.move_tokens(
	      context.sender,
	      bid_order.owner,
              ASSET_TOKEN,
              bid_order.amount,
	    );
	    rest_amount -= bid_order.amount;
	    let cancelation_request = CancelationRequest{owner: bid_order.owner, id: bid_order.cancelation_id};
	    state.orders_by_cancelation_request.remove(&cancelation_request)
	  }
       }
    }
     
    if rest_amount > 0 {	   
      let pri = Priority::low_low(price, state.next_order_id.to_raw());
      let new_ask_order = LimitOrder {price: price, amount: rest_amount, id: state.next_order_id, owner: context.sender, is_bid: false, cancelation_id: cancelation_id};
      state.asks.insert(pri, new_ask_order);
      let cancelation_request = CancelationRequest{owner: context.sender, id: cancelation_id};
      state.orders_by_cancelation_request.insert(cancelation_request, new_ask_order);
      state.token_balances.move_tokens(
          context.sender,
          state.double_auction_address,
          ASSET_TOKEN,
          rest_amount,
       );

      state.next_order_id = state.next_order_id.next();}
     
    (state, vec![])
}

/// Cancels an existing order and returns tokens to the order owner
/// Panics if cancelation request is invalid or order doesn't exist
#[action(shortname = 0x05)]
fn cancel_limit_order(
    context: ContractContext,
    mut state: DoubleAuctionContractState,
    cancelation_token: u32,
    ) -> (DoubleAuctionContractState, Vec<EventGroup>) {
    let cancelation_request = CancelationRequest{owner: context.sender, id: cancelation_token};
    let order = state.orders_by_cancelation_request.get(&cancelation_request).unwrap_or_else(|| panic!("Not a valid cancelation request"));
    if order.is_bid {
        let key = Priority::high_low(order.price, order.id.to_raw());
        let bid_order = state.bids.get(&key).unwrap_or_else(|| panic!("Hey! This should not happen!"));
	state.token_balances.move_tokens(
          state.double_auction_address,
          context.sender,
          CURRENCY_TOKEN,
          total_price(bid_order.amount, bid_order.price, state.price_numerator, state.price_denominator)
	);
        state.bids.remove(&key);
	state.orders_by_cancelation_request.remove(&cancelation_request)
    } else {
        let key = Priority::low_low(order.price, order.id.to_raw());
	let ask_order = state.asks.get(&key).unwrap_or_else(|| panic!("Hey! This should not happen!"));
	state.token_balances.move_tokens(
          state.double_auction_address,
          context.sender,
          ASSET_TOKEN,
          ask_order.amount,
	);
        state.asks.remove(&key);
	state.orders_by_cancelation_request.remove(&cancelation_request)
    }
    
    (state, vec![])
}

