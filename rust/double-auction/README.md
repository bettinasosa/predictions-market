# Double Auction Contract

A Partisia blockchain smart contract that implements a limit order-based trading mechanism for prediction market tokens.

## Overview

The Double Auction contract handles the trading of prediction market tokens using a limit order book system. It enables users to:

1. Place bid and ask orders at specific prices
2. Match compatible orders automatically
3. Cancel open orders
4. Deposit and withdraw tokens

## Key Components

### Limit Orders

Each limit order contains:

- Token amount
- Price per token
- Order ID
- Owner address
- Order type (bid or ask)
- Cancellation ID

### Order Books

The contract maintains two priority-based order books:

- **Bids**: Orders to buy tokens, ordered from highest to lowest price
- **Asks**: Orders to sell tokens, ordered from lowest to highest price

## Main Functions

### Order Management

- `submit_bid(price_per_token, token_amount, cancelation_id)`: Place a bid order
- `submit_ask(price_per_token, token_amount, cancelation_id)`: Place an ask order
- `cancel_limit_order(cancelation_id)`: Cancel an open order

### Token Operations

- `deposit(token_address, amount)`: Deposit tokens into the contract
- `withdraw(token_address, amount, wait_for_callback)`: Withdraw tokens from the contract

## Matching Algorithm

When a new order is placed:

1. The contract checks for matching orders in the opposite book
2. If a match is found, the order is executed at the existing order's price
3. Partial fills are supported, with the remainder creating a new limit order
4. Orders are matched based on price priority (best price first) and time priority (first come, first served)

## State

The contract maintains:

- User token balances
- Bid and ask order books
- Order references by cancellation request
- Price configuration (numerator/denominator)

## Integration

This contract works in conjunction with the Token Splitter contract to create a complete prediction market system on the Partisia blockchain.

## Usage

This contract is deployed and interacted with through the Partisia blockchain. See the main project documentation for detailed usage instructions.
