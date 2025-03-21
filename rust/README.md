# Prediction Market Smart Contracts

A collection of Rust smart contracts implementing a prediction market system on the Partisia blockchain.

## Overview

This project consists of two main smart contracts that work together to create a prediction market system:

1. **Token Splitter Contract**: Creates and manages prediction market tokens
2. **Double Auction Contract**: Handles the trading of prediction market tokens

## Smart Contracts

### Token Splitter Contract

The Token Splitter contract manages the creation and redemption of prediction market tokens. For each market:

- Creates YES/NO tokens representing different outcomes
- Allows users to:
  - Split original tokens into YES/NO pairs
  - Join YES/NO pairs back into original tokens
  - Redeem winning tokens after market settlement

#### Key Features

- **Token Management**: Create and manage YES/NO token pairs
- **Life Cycle Management**: Handles market stages (Preparing → Active → Settled)
- **Oracle Integration**: Trusted oracle settles markets with final outcome
- **Token Redemption**: Winners can redeem tokens for original asset

#### Compiled Contract Name

When compiled, this contract produces:

- `token_splitter.wasm`
- `token_splitter.abi`

### Double Auction Contract

The Double Auction contract provides the trading mechanism for prediction market tokens using a limit order book system.

#### Key Features

- **Order Book Management**: Maintains separate books for buy/sell orders
- **Price-Time Priority**: Orders are matched based on price and submission time
- **Automatic Matching**: Instantly matches compatible orders
- **Token Balance Tracking**: Secure handling of user token balances
- **Order Cancellation**: Users can cancel their unmatched orders

#### Compiled Contract Name

When compiled, this contract produces:

- `double_auction.wasm`
- `double_auction.abi`

### Token V2 Contract

A standard MPC20 token implementation used for creating the tradable tokens in the prediction market.

#### Key Features

- **Standard Token Operations**: Transfer, approve, etc.
- **Metadata Management**: Name, symbol, decimals
- **Balance Tracking**: Track balances for all users

#### Compiled Contract Name

When compiled, this contract produces:

- `token_v2.wasm`
- `token_v2.abi`

## Technical Architecture

### Token Types

- **Original Token**: The base token used for creating markets
- **YES Token**: Represents belief in positive outcome
- **NO Token**: Represents belief in negative outcome

### Price Mechanism

- Prices are represented as integers with configurable decimal places
- Uses numerator/denominator for decimal price representation
- Supports efficient price-based order sorting

### Data Structures

- **AVL Trees**: Used for efficient order book management
- **Priority Queue**: Implements price-time priority for orders
- **Balance Tracking**: Secure token balance management

## Usage

### Creating a New Market

1. Deploy Token Splitter contract with:

   - Event description
   - Event symbol
   - Token addresses (original, YES, NO)
   - Oracle address

2. Prepare market:
   ```rust
   prepare(amount: TokenAmount)
   ```

### Trading

1. Submit buy order:

   ```rust
   submit_bid(
       price: Price,
       amount: TokenAmount,
       cancelation_id: u32
   )
   ```

2. Submit sell order:

   ```rust
   submit_ask(
       price: Price,
       amount: TokenAmount,
       cancelation_id: u32
   )
   ```

3. Cancel order:
   ```rust
   cancel_limit_order(cancelation_token: u32)
   ```

### Market Settlement

1. Oracle settles market:

   ```rust
   settle(settle_to: bool)
   ```

2. Winners redeem tokens:
   ```rust
   redeem(amount: TokenAmount)
   ```

## Security Considerations

- **Token Safety**: All token transfers use secure MPC20 contract interactions
- **Balance Protection**: Strict balance checking prevents overdrafts
- **Access Control**: Oracle-only settlement, owner-only cancellations
- **Integer Overflow Protection**: Safe math operations throughout

## Development

### Prerequisites

- Rust toolchain
- Partisia blockchain development environment
- MPC20 token contracts

### Building

```bash
cargo build --target wasm32-unknown-unknown --release
```

This will generate the necessary WASM and ABI files in the `target/wasm32-unknown-unknown/release/` directory, which will be used by the Python interface.

### Testing

```bash
cargo test
```

## Integration

The smart contracts integrate with:

- MPC20 token contracts
- Oracle services
- Frontend applications via contract events

## Compilation

To compile all the contracts:

```bash
cargo build --target wasm32-unknown-unknown --release
```

This will generate the necessary WASM and ABI files in the `target/wasm32-unknown-unknown/release/` directory, which will be used by the Python interface.

## Integration with Python Interface

This project is designed to work with the Python interface located in the `python3/` directory. The Python code expects the compiled contracts to be available at specific paths:

- `token_v2.wasm` - Used by `tokenv2.py`
- `token_splitter.wasm` - Used by `tokensplitter.py`
- `double_auction.wasm` - Used by `doubleauction.py`

Be sure to compile all contracts before running the Python interface.
