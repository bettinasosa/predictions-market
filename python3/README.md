# Prediction Market Python Interface

A Python interface for interacting with Partisia Blockchain prediction market smart contracts.

## Overview

This project provides tools to:

1. Initialize new prediction markets
2. Monitor market activity
3. Place and manage trades
4. Handle token operations

## Components

### Core Contract Interfaces

- **`pbccontract.py`**: Base class for interacting with Partisia smart contracts

  - Handles contract deployment and transactions
  - Manages transaction verification and retries
  - Logs operations for debugging

- **`tokenv2.py`**: Interface for MPC20 token contracts

  - Token deployment and management
  - Handles approvals and transfers
  - Tracks token metadata (name, symbol, decimals)
  - Uses the compiled `token_v2.wasm` contract

- **`tokensplitter.py`**: Interface for prediction market token splitting

  - Creates YES/NO token pairs
  - Manages token splitting and joining
  - Handles market settlement
  - Uses the compiled `token_splitter.wasm` contract

- **`doubleauction.py`**: Interface for the trading mechanism
  - Places bid and ask orders
  - Manages deposits/withdrawals
  - Handles order cancellations
  - Uses the compiled `double_auction.wasm` contract

### Utility Modules

- **`serializedstate.py`**: Handles contract state deserialization

  - Parses contract state from blockchain
  - Supports various data types
  - Provides clean interface for state reading

- **`logger.py`**: Logging functionality

  - Timestamps all operations
  - Uses Danish timezone
  - Maintains operation history

- **`config.py`**: Configuration management
  - Stores key file location
  - Sets gas limits
  - Controls careful mode for transactions

### User Interface

- **`monitor.py`**: Real-time market monitoring

  - Shows order books
  - Updates automatically
  - Supports multiple markets

- **`windowsupdater.py`**: Manages monitoring windows
  - Adds/removes market views
  - Persists window configurations
  - Handles window updates

### Market Operations

- **`initprediction.py`**: Market initialization script

  - Sets up new prediction markets
  - Deploys necessary contracts
  - Configures initial parameters

- **`gamble.py`**: Trading interface
  - Places market orders
  - Handles token conversions
  - Manages user positions

## Setup and Compilation

### Contract Compilation

Before running the Python interface, you need to compile the Rust smart contracts:

1. Navigate to the `rust` directory
2. Run the following command to compile all smart contracts:

   ```
   cargo build --target wasm32-unknown-unknown --release
   ```

3. This will compile the following contracts:
   - `token_v2.wasm`: Standard MPC20 token contract
   - `double_auction.wasm`: Trading mechanism contract
   - `token_splitter.wasm`: Token splitter contract (used by tokensplitter.py as the contract)

If compilation fails or contracts are missing, you'll receive error messages with details.

### Contract Locations

The Python scripts expect the compiled contracts to be in the following location:

```
../rust/target/wasm32-unknown-unknown/release/
```

Make sure all three contracts are compiled before running the scripts.

## Usage

### Setting Up a New Market

```python
# Initialize a new prediction market
python initprediction.py
```

### Trading

```python
# Start trading interface
python gamble.py
```

### Monitoring Markets

```python
# Launch market monitor
python monitor.py
```

## Configuration

1. Create a `config.py`:

```python
keyfile = "key.pk"  # Your private key file
gas = 3000000       # Gas limit for transactions
careful = True      # Enable transaction verification
```

2. Create necessary token contracts
3. Initialize prediction market
4. Configure monitoring windows

## Development

### Prerequisites

- Python 3.7+
- Partisia Blockchain CLI tools
- tkinter (system package, not pip installable)
- Required Python packages:
  ```
  pip install pexpect requests pytz
  ```

### Installing tkinter

tkinter is a standard library module but may need to be installed separately:

- **macOS**:

  ```
  brew install python-tk
  ```

- **Ubuntu/Debian**:

  ```
  sudo apt-get install python3-tk
  ```

- **Fedora/RHEL/CentOS**:
  ```
  sudo dnf install python3-tkinter
  ```

### Setting Up a Virtual Environment

It's recommended to use a virtual environment to avoid dependency conflicts:

```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install required dependencies (excluding tkinter, which is installed separately)
pip install pexpect requests pytz
```

When finished, you can deactivate the virtual environment with the `deactivate` command.

### Project Structure

```
python3/
├── config.py           # Configuration settings
├── doubleauction.py   # Double auction interface
├── gamble.py          # Trading interface
├── initprediction.py  # Market initialization
├── logger.py          # Logging utilities
├── monitor.py         # Market monitoring
├── pbccontract.py     # Base contract interface
├── serializedstate.py # State parsing
├── tokensplitter.py   # Token splitting interface
├── tokenv2.py        # Token contract interface
└── windowsupdater.py  # Monitor window management
```

### Security Notes

- Private keys should be stored securely
- Transaction verification is recommended
- Monitor gas usage for operations
- Validate token addresses carefully

## Integration with Rust Contracts

This Python interface works with three main Rust contracts:

1. Token V2 Contract (`token_v2.wasm`) - Standard MPC20 token implementation
2. Token Splitter Contract (`token_splitter.wasm`) - Handles token splitting and settlement
3. Double Auction Contract (`double_auction.wasm`) - Trading mechanism

The interface handles:

- Contract deployment
- State management
- Transaction submission
- Event monitoring

## Error Handling

The system includes:

- Transaction retry logic
- State validation
- Error logging
- User feedback

## Contributing

[Add contribution guidelines here]

## License

[Add license information here]

```

```
