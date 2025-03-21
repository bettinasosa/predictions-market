use super::*;
use pbc_contract_common::address::{Address, AddressType};
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::Hash;

#[test]
fn test_init() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let token = Address { address_type: AddressType::PublicContract, identifier: [2; 20] };
    
    // Create context
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };

    // Create init data
    let init_data = DoubleAuctionInit {
        token,
    };

    // Initialize contract
    let (state, _events) = super::init(ctx, init_data);

    // Verify state
    assert_eq!(state.owner, sender);
    assert_eq!(state.token, token);
    assert!(state.orders.is_empty());
}

#[test]
fn test_submit_bid() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let token = Address { address_type: AddressType::PublicContract, identifier: [2; 20] };
    
    // Create context
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };

    // Create init data
    let init_data = DoubleAuctionInit {
        token,
    };

    // Initialize contract and submit bid
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for submit_bid
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::submit_bid(ctx, state, 100, 10);

    // Verify state
    assert!(state.orders.is_empty());
}

#[test]
fn test_submit_ask() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let token = Address { address_type: AddressType::PublicContract, identifier: [2; 20] };
    
    // Create context
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };

    // Create init data
    let init_data = DoubleAuctionInit {
        token,
    };

    // Initialize contract and submit ask
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for submit_ask
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::submit_ask(ctx, state, 100, 10);

    // Verify state
    assert!(state.orders.is_empty());
}

#[test]
fn test_cancel_order() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let token = Address { address_type: AddressType::PublicContract, identifier: [2; 20] };
    
    // Create context
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };

    // Create init data
    let init_data = DoubleAuctionInit {
        token,
    };

    // Initialize contract and cancel order
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for cancel_order
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::cancel_order(ctx, state, 0);

    // Verify state
    assert!(state.orders.is_empty());
} 