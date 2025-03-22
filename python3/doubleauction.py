"""
Interface for DoubleAuction smart contract.
Handles creation and management of prediction market auctions.
"""

from pbccontract import PBCContract
from tokenv2 import TokenV2
from serializedstate import SerializedState
import time

class DoubleAuction(PBCContract):
    """
    Interface for the double auction prediction market contract.
    
    Attributes:
        address: Contract address
        true_token_address: YES token contract address
        false_token_address: NO token contract address
        price_numerator: Numerator of the price fraction
        price_denominator: Denominator of the price fraction
    """
    def __init__(self, address=None, true_token_address=None, false_token_address=None, 
                 price_numerator=None, price_denominator=None, token_amount=None):
        super().__init__("rust/target/wasm32-unknown-unknown/release/", "double_auction")
        
        if address:
            try:
                print(f"Initializing DoubleAuction from existing contract: {address}")
                self.address = address
                state = SerializedState(address=address)
                fields = state.deserialize(["Address", "Address", "u64", "u64"])
                self.true_token_address = fields[0]
                self.false_token_address = fields[1]
                self.price_numerator = fields[2]
                self.price_denominator = fields[3]
                print(f"Successfully loaded DoubleAuction: true_token={self.true_token_address}, false_token={self.false_token_address}, price={self.price_numerator}/{self.price_denominator}")
            except Exception as e:
                print(f"Error initializing DoubleAuction from address: {e}")
                raise
        # Handle backward compatibility: if token_amount is provided, use it to set price_denominator
        elif token_amount is not None and price_denominator is None:
            price_denominator = token_amount
            price_numerator = price_numerator or 1
            print(f"Converting token_amount to price_denominator={price_denominator}")
        
        if true_token_address and false_token_address and price_numerator is not None and price_denominator is not None:
            try:
                print(f"Creating new DoubleAuction for tokens:")
                print(f"  TRUE token: {true_token_address}")
                print(f"  FALSE token: {false_token_address}")
                print(f"  Price ratio: {price_numerator}/{price_denominator}")
                
                self.true_token_address = true_token_address
                self.false_token_address = false_token_address
                self.price_numerator = price_numerator
                self.price_denominator = price_denominator
                
                # Load token details for verification
                try:
                    true_token = TokenV2(address=true_token_address)
                    false_token = TokenV2(address=false_token_address)
                    print(f"TRUE token details: {true_token.name} ({true_token.symbol})")
                    print(f"FALSE token details: {false_token.name} ({false_token.symbol})")
                except Exception as e:
                    print(f"Error loading token details: {e}")
                    print("Continuing with deployment anyway...")
                
                print("Deploying auction contract...")
                self.deploy([true_token_address, false_token_address, price_numerator, price_denominator])
                print(f"DoubleAuction deployed at: {self.address}")
                
                # Small delay after deployment
                time.sleep(2)
                
                print("Approving tokens for auction contract...")
                try:
                    true_token = TokenV2(address=true_token_address)
                    # Use price_denominator as the token approval amount
                    approve_tx = true_token.approve_relative(self.address, price_denominator)
                    print(f"TRUE token approval transaction: {approve_tx}")
                    time.sleep(1)
                    
                    false_token = TokenV2(address=false_token_address)
                    approve_tx = false_token.approve_relative(self.address, price_denominator)
                    print(f"FALSE token approval transaction: {approve_tx}")
                    time.sleep(1)
                except Exception as e:
                    print(f"Error approving tokens: {e}")
                    print("WARNING: You'll need to manually approve tokens for the auction contract.")
                
                print("DoubleAuction setup completed successfully!")
            except Exception as e:
                print(f"Error creating new DoubleAuction: {e}")
                raise
        else:
            raise ValueError("Invalid arguments provided to DoubleAuction. Provide either an address or true_token_address, false_token_address, price_numerator, and price_denominator.")

    def deposit(self, true_amount, false_amount):
        """
        Deposit TRUE and FALSE tokens into the auction.
        
        Args:
            true_amount: Amount of TRUE tokens to deposit
            false_amount: Amount of FALSE tokens to deposit
            
        Returns:
            Transaction hash
        """
        print(f"Depositing {true_amount} TRUE tokens and {false_amount} FALSE tokens")
        try:
            return self.interact("deposit", [true_amount, false_amount])
        except Exception as e:
            print(f"Error in deposit: {e}")
            raise

    def bid_true(self, amount, price):
        """
        Place a bid for TRUE tokens.
        
        Args:
            amount: Amount of tokens to bid
            price: Price offered (in FALSE tokens per TRUE token)
            
        Returns:
            Transaction hash
        """
        print(f"Bidding for {amount} TRUE tokens at price {price}")
        try:
            return self.interact("bid_true", [amount, price])
        except Exception as e:
            print(f"Error in bid_true: {e}")
            raise

    def bid_false(self, amount, price):
        """
        Place a bid for FALSE tokens.
        
        Args:
            amount: Amount of tokens to bid
            price: Price offered (in TRUE tokens per FALSE token)
            
        Returns:
            Transaction hash
        """
        print(f"Bidding for {amount} FALSE tokens at price {price}")
        try:
            return self.interact("bid_false", [amount, price])
        except Exception as e:
            print(f"Error in bid_false: {e}")
            raise

    def withdraw_true(self, amount):
        """
        Withdraw TRUE tokens from auction.
        
        Args:
            amount: Amount of tokens to withdraw
            
        Returns:
            Transaction hash
        """
        print(f"Withdrawing {amount} TRUE tokens")
        try:
            return self.interact("withdraw_true", [amount])
        except Exception as e:
            print(f"Error in withdraw_true: {e}")
            raise

    def withdraw_false(self, amount):
        """
        Withdraw FALSE tokens from auction.
        
        Args:
            amount: Amount of tokens to withdraw
            
        Returns:
            Transaction hash
        """
        print(f"Withdrawing {amount} FALSE tokens")
        try:
            return self.interact("withdraw_false", [amount])
        except Exception as e:
            print(f"Error in withdraw_false: {e}")
            raise

    def clear(self):
        """
        Clear matched bids in auction.
        
        Returns:
            Transaction hash
        """
        print("Clearing matched bids")
        try:
            return self.interact("clear", [])
        except Exception as e:
            print(f"Error in clear: {e}")
            raise

    def get_state(self):
        """
        Get current auction state (true and false token balances).
        
        Returns:
            Dictionary with true_balance and false_balance
        """
        print("Getting auction state")
        try:
            state = SerializedState(address=self.address)
            # First deserialize the token addresses and amount
            fields = state.deserialize(["Address", "Address", "u256"])
            
            # Then get the balances
            print("Getting TRUE token balance...")
            try:
                true_token = TokenV2(address=fields[0])
                true_balance = true_token.get_balance(self.address)
            except Exception as e:
                print(f"Error getting TRUE token balance: {e}")
                true_balance = "ERROR"
                
            print("Getting FALSE token balance...")
            try:
                false_token = TokenV2(address=fields[1])
                false_balance = false_token.get_balance(self.address)
            except Exception as e:
                print(f"Error getting FALSE token balance: {e}")
                false_balance = "ERROR"
                
            return {
                "true_balance": true_balance,
                "false_balance": false_balance
            }
        except Exception as e:
            print(f"Error getting auction state: {e}")
            raise
