# Predictions Market Platform

A comprehensive prediction market system built on the Partisia Blockchain, featuring Rust smart contracts and Python interfaces for creating, trading, and managing prediction markets.

## Attribution

This project is based on original work by Peter Bro Miltersen, Mathematician and Professor of Computer Science at Aarhus University.

## Overview

This prediction market platform allows users to:

- Create markets for predicting outcomes of events
- Buy and sell YES/NO outcome tokens
- Monitor market activity in real-time
- Redeem winning tokens after market settlement

The platform uses a dual-token system where each market has YES and NO tokens representing different outcomes. Tokens are traded using a double auction mechanism with a limit order book.

## Project Structure

The project consists of two main components:

### Rust Smart Contracts

Located in `/rust` directory:

- **Token Splitter Contract** (`/token-splitter`): Creates and manages prediction market tokens
- **Double Auction Contract** (`/double-auction`): Handles trading of prediction market tokens

### Python Interface

Located in `/python3` directory:

- Contract interfaces for interacting with the blockchain
- Market monitoring tools
- Trading interfaces
- Utility modules for state management and logging

## Smart Contract Features

### Token Splitter Contract

- Creates YES/NO token pairs representing different outcomes
- Manages market lifecycle (Preparing → Active → Settled)
- Handles oracle-based settlement
- Enables token redemption for winners

### Double Auction Contract

- Maintains order books for buying and selling tokens
- Implements price-time priority for order matching
- Provides automatic order matching
- Tracks user token balances
- Enables order cancellation

## Python Interface Features

- Market initialization and configuration
- Real-time market monitoring
- Trading interface
- Token management operations
- Contract state parsing and visualization

## Getting Started

### Prerequisites

- Rust toolchain (for contract development)
- Python 3.7+ (for interface)
- Partisia Blockchain development environment
- Python packages: `pexpect`, `requests`, `pytz`, `tkinter`

### Smart Contract Setup

1. Navigate to the Rust contract directory:

   ```bash
   cd rust
   ```

2. Build the contracts:

   ```bash
   cargo build
   ```

3. Run tests:
   ```bash
   cargo test
   ```

### Python Interface Setup

1. Navigate to the Python interface directory:

   ```bash
   cd python3
   ```

2. Create a `config.py` file:

   ```python
   keyfile = "key.pk"  # Your private key file
   gas = 3000000       # Gas limit for transactions
   careful = True      # Enable transaction verification
   ```

3. Initialize a new prediction market:

   ```bash
   python initprediction.py
   ```

4. Start the market monitor:

   ```bash
   python monitor.py
   ```

5. Begin trading:
   ```bash
   python gamble.py
   ```

## Usage Guide

### Creating a New Market

1. Deploy the Token Splitter contract with:

   - Event description
   - Event symbol
   - Token addresses (original, YES, NO)
   - Oracle address

2. Prepare the market by depositing tokens

### Trading

1. Submit buy orders with specified price and quantity
2. Submit sell orders with specified price and quantity
3. Cancel unmatched orders as needed

### Market Settlement

1. Oracle settles the market by determining the outcome
2. Winners redeem their tokens for the original asset

## Technical Architecture

### Token Types

- **Original Token**: Base token used for creating markets
- **YES Token**: Represents belief in positive outcome
- **NO Token**: Represents belief in negative outcome

### Price Mechanism

- Prices represented as integers with configurable decimal places
- Numerator/denominator for decimal price representation
- Efficient price-based order sorting

### Security Features

- Secure MPC20 token transfers
- Strict balance checking
- Oracle-only settlement
- Owner-only cancellations
- Integer overflow protection

## Development

### Contract Customization

Smart contracts can be customized for different market types by modifying:

- Settlement conditions
- Fee structures
- Trading rules
- Token properties

### Interface Extensions

The Python interface can be extended with:

- Additional market views
- Automated trading strategies
- Historical data analysis
- External data feeds

## Integration

The prediction market platform integrates with:

- MPC20 token contracts
- Oracle services
- Frontend applications via contract events

## License

MIT License - See [LICENSE](LICENSE) for details.

## Contributing

We welcome contributions to improve the prediction market platform. Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
