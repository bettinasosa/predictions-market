use super::*;
use pbc_contract_common::address::{Address, AddressType};
use pbc_contract_common::context::ContractContext;
use pbc_contract_common::events::EventGroup;
use pbc_contract_common::Hash;

#[test]
fn test_init() {
    // Create test address
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let oracle = Address { address_type: AddressType::Account, identifier: [2; 20] };
    let yes_token = Address { address_type: AddressType::PublicContract, identifier: [3; 20] };
    let no_token = Address { address_type: AddressType::PublicContract, identifier: [4; 20] };
    
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
    let init_data = TokenSplitterInit {
        oracle,
        event_description: "Test Event".to_string(),
        event_symbol: "TEST".to_string(),
        yes_token,
        no_token,
    };

    // Initialize contract
    let (state, _events) = super::init(ctx, init_data);

    // Verify state
    assert_eq!(state.owner, sender);
    assert_eq!(state.oracle, oracle);
    assert_eq!(state.event_description, "Test Event");
    assert_eq!(state.event_symbol, "TEST");
    assert_eq!(state.yes_token, yes_token);
    assert_eq!(state.no_token, no_token);
    assert_eq!(state.market_status, MarketStatus::Preparing);
}

#[test]
fn test_prepare() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let oracle = Address { address_type: AddressType::Account, identifier: [2; 20] };
    let yes_token = Address { address_type: AddressType::PublicContract, identifier: [3; 20] };
    let no_token = Address { address_type: AddressType::PublicContract, identifier: [4; 20] };
    
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
    let init_data = TokenSplitterInit {
        oracle,
        event_description: "Test Event".to_string(),
        event_symbol: "TEST".to_string(),
        yes_token,
        no_token,
    };

    // Initialize contract and prepare
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for prepare
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::prepare(ctx, state);

    // Verify state
    assert_eq!(state.market_status, MarketStatus::Preparing);
}

#[test]
fn test_settle() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let oracle = Address { address_type: AddressType::Account, identifier: [2; 20] };
    let yes_token = Address { address_type: AddressType::PublicContract, identifier: [3; 20] };
    let no_token = Address { address_type: AddressType::PublicContract, identifier: [4; 20] };
    
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
    let init_data = TokenSplitterInit {
        oracle,
        event_description: "Test Event".to_string(),
        event_symbol: "TEST".to_string(),
        yes_token,
        no_token,
    };

    // Initialize contract and settle
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for the settle function
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::settle(ctx, state, true);

    // Verify state
    assert_eq!(state.market_status, MarketStatus::Preparing);
}

#[test]
fn test_redeem() {
    // Create test addresses
    let sender = Address { address_type: AddressType::Account, identifier: [1; 20] };
    let oracle = Address { address_type: AddressType::Account, identifier: [2; 20] };
    let yes_token = Address { address_type: AddressType::PublicContract, identifier: [3; 20] };
    let no_token = Address { address_type: AddressType::PublicContract, identifier: [4; 20] };
    
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
    let init_data = TokenSplitterInit {
        oracle,
        event_description: "Test Event".to_string(),
        event_symbol: "TEST".to_string(),
        yes_token,
        no_token,
    };

    // Initialize contract and redeem
    let (state, _) = super::init(ctx, init_data);
    
    // Create a new context for the redeem function
    let ctx = ContractContext {
        contract_address: Address { address_type: AddressType::PublicContract, identifier: [0; 20] },
        sender: sender.clone(),
        block_time: 0,
        block_production_time: 0,
        current_transaction: Hash { bytes: [0; 32] },
        original_transaction: Hash { bytes: [0; 32] }
    };
    
    let (state, _) = super::redeem(ctx, state);

    // Verify state
    assert_eq!(state.market_status, MarketStatus::Preparing);
} 