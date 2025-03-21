# Token Splitter Contract

A Partisia blockchain smart contract that creates and manages prediction market tokens.

## Overview

The Token Splitter contract is a core component of the Predictions Market platform, responsible for creating and managing YES/NO prediction tokens. It allows users to:

1. Split original tokens into YES and NO outcome tokens
2. Join YES and NO tokens back into original tokens
3. Redeem tokens after an event outcome is settled

## Lifecycle

The contract operates in three main stages:

1. **PREPARING**: Initial setup phase
2. **ACTIVE**: Users can split/join tokens
3. **SETTLED**: Event outcome is determined, and users can redeem tokens

## Main Functions

### Token Management

- `split(amount)`: Convert original tokens into equal amounts of YES and NO tokens
- `join(amount)`: Convert equal amounts of YES and NO tokens back to original tokens
- `redeem(amount)`: Redeem winning tokens after settlement

### Event Management

- `prepare(amount)`: Prepare the market
- `settle(outcome)`: Settle the market with a TRUE or FALSE outcome

### Token Operations

- `deposit(token_address, amount)`: Deposit tokens into the contract
- `withdraw(token_address, amount, wait_for_callback)`: Withdraw tokens from the contract

## State

The contract maintains:

- Token balances for users (original, YES, and NO tokens)
- Event details (description, symbol)
- Market lifecycle state
- Token contract addresses

## Integration

This contract works in conjunction with the Double Auction contract to create a complete prediction market system on the Partisia blockchain.

## Usage

This contract is deployed and interacted with through the Partisia blockchain. See the main project documentation for detailed usage instructions.
