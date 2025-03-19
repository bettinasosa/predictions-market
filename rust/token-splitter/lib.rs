//! Token Splitter Smart Contract for Prediction Markets
//! 
//! Manages the creation and settlement of prediction market tokens.
//! Splits original tokens into YES/NO pairs and handles redemption
//! after market settlement.

#[macro_use]
extern crate pbc_contract_codegen;

use pbc_contract_common::address::Address;
use pbc_contract_common::context::{CallbackContext, ContractContext};
use pbc_contract_common::events::EventGroup;

use defi_common::interact_mpc20;
use defi_common::token_balances::{DepositToken, TokenBalances};

/// Token amount type for all token operations
pub type TokenAmount = u128;

const YES_TOKEN: DepositToken = DepositToken::TokenA{};
const NO_TOKEN: DepositToken = DepositToken::TokenB{};
const ORIGINAL_TOKEN: DepositToken = DepositToken::LiquidityToken{};

/// Contract lifecycle stages
pub type LifeStage = u8;
const PREPARING: LifeStage = 0;  // Initial setup
const ACTIVE: LifeStage = 1;     // Trading enabled
const SETTLED: LifeStage = 2;    // Outcome determined

/// Add version for potential upgrades
const CONTRACT_VERSION: u32 = 1;

/// Add settlement delay
const SETTLEMENT_DELAY: u64 = 86400; // 24 hours in seconds

/// Main contract state tracking tokens and market status
#[state]
pub struct TokenSplitterContractState {
    pub event_description: String,
    pub event_symbol: String,
    pub original_token_address: Address,
    pub true_token_address: Address,
    pub false_token_address: Address,
    pub oracle_address: Address,      // Address authorized to settle market
    pub token_splitter_address: Address,
    pub token_supply: TokenAmount,
    pub life_stage: LifeStage,
    pub outcome: bool,
    pub token_balances: TokenBalances,
    pub version: u32,
    pub settlement_proposed_time: u64,
    pub proposed_outcome: bool,
}

/// Initializes a new prediction market with specified tokens and oracle
#[init]
pub fn initialize(
    context: ContractContext,
    event_description: String,
    event_symbol: String,
    original_token_address: Address,
    true_token_address: Address,
    false_token_address: Address,
    oracle_address: Address,
) -> (TokenSplitterContractState, Vec<EventGroup>) {

    let token_balances =
        TokenBalances::new(original_token_address, true_token_address, false_token_address).unwrap();
    let new_state = TokenSplitterContractState {
    	event_description: event_description,
	event_symbol: event_symbol,
        token_supply: 0,
        token_splitter_address: context.contract_address,
	original_token_address: original_token_address,
	true_token_address: true_token_address,
	false_token_address: false_token_address,
	oracle_address: oracle_address,
	life_stage: PREPARING,
	outcome: false,
        token_balances,
        version: CONTRACT_VERSION,
        settlement_proposed_time: 0,
        proposed_outcome: false,
    };
    (new_state, vec![])
}

#[action(shortname = 0x01)]
pub fn deposit(
    context: ContractContext,
    state: TokenSplitterContractState,
    token_address: Address,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {

    let mut token = ORIGINAL_TOKEN;
    if token_address == state.true_token_address {
       token = YES_TOKEN;
    } else if token_address == state.false_token_address {
       token = NO_TOKEN
    } else if token_address != state.original_token_address {
       panic!(
            "token address provided does not match any of the three deposit token addresses.",
        );
    }
 
    let mut event_group_builder = EventGroup::builder();
    interact_mpc20::MPC20Contract::at_address(token_address).transfer_from(
        &mut event_group_builder,
        &context.sender,
        &state.token_splitter_address,
        amount,
    );

    event_group_builder
        .with_callback(SHORTNAME_DEPOSIT_CALLBACK)
        .argument(token)
        .argument(amount)
        .done();

    (state, vec![event_group_builder.build()])
}

#[callback(shortname = 0x10)]
pub fn deposit_callback(
    context: ContractContext,
    callback_context: CallbackContext,
    mut state: TokenSplitterContractState,
    token: DepositToken,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(callback_context.success, "Transfer did not succeed");

    state
        .token_balances
        .add_to_token_balance(context.sender, token, amount);

    (state, vec![])
}

#[action(shortname = 0x02)]
pub fn withdraw(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    token_address: Address,
    amount: TokenAmount,
    wait_for_callback: bool,
) -> (TokenSplitterContractState, Vec<EventGroup>) {

    let mut token = ORIGINAL_TOKEN;
    if token_address == state.true_token_address {
       token = YES_TOKEN;
    } else if token_address == state.false_token_address {
       token = NO_TOKEN
    } else if token_address != state.original_token_address {
       panic!(
            "token address provided does not match any of the three deposit token addresses.",
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

#[callback(shortname = 0x15)]
fn wait_withdraw_callback(
    _context: ContractContext,
    _callback_context: CallbackContext,
    state: TokenSplitterContractState,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    (state, vec![])
}

#[action(shortname = 0x03)]
pub fn prepare(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(
        state.life_stage == PREPARING,
        "Can only prepare if life stage is Preparing."
    );
    state.token_balances.move_tokens(
        context.sender,
        state.token_splitter_address,
        YES_TOKEN,
        amount,
    );
    state.token_balances.move_tokens(
	context.sender,
        state.token_splitter_address,
        NO_TOKEN,
        amount,
    );
    state.token_supply = amount;
    state.life_stage = ACTIVE;
    (state, vec![])
}

#[action(shortname = 0x04)]
pub fn split(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {

    state.token_balances.move_tokens(
        context.sender,
        state.token_splitter_address,
        ORIGINAL_TOKEN,
        amount,
    );
    state.token_balances.move_tokens(
        state.token_splitter_address,
        context.sender,
        YES_TOKEN,
        amount,
    );
    state.token_balances.move_tokens(
        state.token_splitter_address,
        context.sender,
        NO_TOKEN,
        amount,
    );
    (state, vec![])
}

#[action(shortname = 0x05)]
pub fn join(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {

    state.token_balances.move_tokens(
        context.sender,
        state.token_splitter_address,
        YES_TOKEN,
        amount,
    );
    state.token_balances.move_tokens(
        context.sender,
        state.token_splitter_address,
        NO_TOKEN,
        amount,
    );
    state.token_balances.move_tokens(
        state.token_splitter_address,
        context.sender,
        ORIGINAL_TOKEN,
        amount,
    );
    (state, vec![])
}

#[action(shortname = 0x06)]
pub fn settle(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    settle_to: bool,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(
        context.sender == state.oracle_address,
        "Sender is not the Designated Divine Oracle, so cannot settle! Nah, nah."
    );
    assert!(
        state.life_stage == ACTIVE,
        "Can only settle if life stage is Active"
    );
   state.outcome = settle_to;
   state.life_stage = SETTLED;
   (state, vec![])
}


#[action(shortname = 0x07)]
pub fn redeem(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    amount: TokenAmount,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(
        state.life_stage == SETTLED,
        "Can only redeem if life stage is Settled"
    );
    let mut token = NO_TOKEN;
    if state.outcome {
       token = YES_TOKEN
       }
    state.token_balances.move_tokens(
        context.sender,
        state.token_splitter_address,
        token,
        amount,
    );
    state.token_balances.move_tokens(
        state.token_splitter_address,
        context.sender,
        ORIGINAL_TOKEN,
        amount,
    );
   (state, vec![])
}

/// Improved settlement with time delay
pub fn propose_settlement(
    context: ContractContext,
    mut state: TokenSplitterContractState,
    outcome: bool,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(context.sender == state.oracle_address, "Unauthorized");
    state.settlement_proposed_time = context.block_time;
    state.proposed_outcome = outcome;
    (state, vec![])
}

pub fn finalize_settlement(
    context: ContractContext,
    mut state: TokenSplitterContractState,
) -> (TokenSplitterContractState, Vec<EventGroup>) {
    assert!(context.block_time >= state.settlement_proposed_time + SETTLEMENT_DELAY, 
           "Settlement delay not elapsed");
    // ... implement settlement
    (state, vec![])
}
