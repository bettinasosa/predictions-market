"""
Interface for V2 MPC20 Token smart contract.
Handles token creation, approval and transfer.
"""

from pbccontract import PBCContract
from serializedstate import SerializedState
import time

class TokenV2(PBCContract):
    
    def __init__(self, address=None, name=None, symbol=None, decimals=None, supply=None):
        super().__init__("rust/target/wasm32-unknown-unknown/release/", "token_v2")

        if address:
            self.address = address
            try:
                print(f"Initializing TokenV2 from existing contract: {address}")
                state = SerializedState(address = address)
                # Attempt to deserialize with the correct field order
                # Different token versions may have different state layouts
                # Try the most common layouts
                try:
                    print("Trying first field pattern: [String, String, u8, u128, Address]")
                    fields = state.deserialize(["String", "String", "u8", "u128", "Address"])
                    self.name = fields[0]
                    self.symbol = fields[1]
                    self.decimals = fields[2]
                    self.supply = fields[3]
                    self.admin = fields[4]
                except Exception as e1:
                    print(f"First pattern failed: {e1}")
                    # Try alternative pattern
                    try:
                        print("Trying second field pattern: [String, u8, String, Address, u128]")
                        state = SerializedState(address = address)  # Reset state
                        fields = state.deserialize(["String", "u8", "String", "Address", "u128"])
                        self.name = fields[0]
                        self.decimals = fields[1]
                        self.symbol = fields[2]
                        self.admin = fields[3]
                        self.supply = fields[4]
                    except Exception as e2:
                        print(f"Second pattern failed: {e2}")
                        # Try another alternative pattern for v2 tokens
                        try:
                            print("Trying third field pattern: [String, String, u8, u256, Address]")
                            state = SerializedState(address = address)  # Reset state
                            fields = state.deserialize(["String", "String", "u8", "u256", "Address"])
                            self.name = fields[0]
                            self.symbol = fields[1]
                            self.decimals = fields[2]
                            self.supply = fields[3]
                            self.admin = fields[4]
                        except Exception as e3:
                            print(f"All deserialization patterns failed")
                            raise Exception(f"Unable to deserialize token state: {e1}, {e2}, {e3}")
                
                print(f"Successfully loaded TokenV2: name='{self.name}', symbol='{self.symbol}', decimals={self.decimals}, supply={self.supply}")
            except Exception as e:
                print(f"Error initializing TokenV2 from address: {e}")
                # Set default values
                self.name = "Unknown Token"
                self.symbol = "UNKNOWN"
                self.decimals = 18
                self.supply = 0
                print("Using default token values")
        elif name and symbol and supply:
            try:
                print(f"Deploying new TokenV2: name='{name}', symbol='{symbol}', decimals={decimals}, supply={supply}")
                self.name = name
                self.symbol = symbol
                self.decimals = decimals
                self.supply = supply
                self.deploy([name, symbol, decimals, supply])
                print(f"TokenV2 successfully deployed at: {self.address}")
                # Small delay to ensure token is registered on blockchain
                time.sleep(2)
            except Exception as e:
                print(f"Error deploying new TokenV2: {e}")
                raise
        else:
            raise ValueError("Invalid arguments provided to TokenV2. Provide either an address or a name, symbol, and supply.")

    def approve(self, spender, amount):
        """
        Approve spender to spend exact amount of tokens.
        
        Args:
            spender: Address to approve for spending
            amount: Amount of tokens to allow spending
            
        Returns:
            Transaction hash
        """
        print(f"Approving {amount} tokens for spender {spender}")
        try:
            result = self.interact("approve", [spender, amount])
            print(f"Approval transaction: {result}")
            return result
        except Exception as e:
            print(f"Error in approve: {e}")
            raise

    def approve_relative(self, spender, amount):
        """
        Approve spender to spend additional amount of tokens.
        
        Args:
            spender: Address to approve for spending
            amount: Additional amount of tokens to allow spending
            
        Returns:
            Transaction hash
        """
        print(f"Approving additional {amount} tokens for spender {spender}")
        try:
            result = self.interact("approve_relative", [spender, amount])
            print(f"Relative approval transaction: {result}")
            return result
        except Exception as e:
            print(f"Error in approve_relative: {e}")
            raise

    def transfer(self, to, amount):
        """
        Transfer tokens to another address.
        
        Args:
            to: Recipient address
            amount: Amount of tokens to transfer
            
        Returns:
            Transaction hash
        """
        print(f"Transferring {amount} tokens to {to}")
        try:
            result = self.interact("transfer", [to, amount])
            print(f"Transfer transaction: {result}")
            return result
        except Exception as e:
            print(f"Error in transfer: {e}")
            raise

    def transfer_from(self, from_addr, to, amount):
        """
        Transfer tokens from one address to another, using allowance.
        
        Args:
            from_addr: Source address
            to: Recipient address
            amount: Amount of tokens to transfer
            
        Returns:
            Transaction hash
        """
        print(f"Transferring {amount} tokens from {from_addr} to {to}")
        try:
            result = self.interact("transfer_from", [from_addr, to, amount])
            print(f"TransferFrom transaction: {result}")
            return result
        except Exception as e:
            print(f"Error in transfer_from: {e}")
            raise

    def get_balance(self, address):
        """
        Get token balance of an address.
        
        Args:
            address: Address to check balance for
            
        Returns:
            Balance amount
        """
        print(f"Getting balance for address: {address}")
        try:
            state = SerializedState(address=self.address)
            balance = state.deserialize_balance(address)
            print(f"Balance: {balance}")
            return balance
        except Exception as e:
            print(f"Error in get_balance: {e}")
            raise

    def get_allowance(self, owner, spender):
        """
        Get amount of tokens spender is allowed to spend on behalf of owner.
        
        Args:
            owner: Owner address
            spender: Spender address
            
        Returns:
            Allowance amount
        """
        print(f"Getting allowance for owner: {owner}, spender: {spender}")
        try:
            state = SerializedState(address=self.address)
            allowance = state.deserialize_allowance(owner, spender)
            print(f"Allowance: {allowance}")
            return allowance
        except Exception as e:
            print(f"Error in get_allowance: {e}")
            raise

