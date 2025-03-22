"""
Interface for Token Splitter smart contract.
Manages creation and settlement of prediction market tokens.
"""

from pbccontract import PBCContract
from tokenv2 import TokenV2
from serializedstate import SerializedState
import time

class TokenSplitter(PBCContract):
    """
    Manages splitting of original tokens into YES/NO prediction market pairs.
    
    Attributes:
        address: Contract address
        event_description: Description of the predicted event
        event_symbol: Symbol for the event tokens
        original_address: Address of original token contract
        true_address: Address of YES token contract
        false_address: Address of NO token contract
        oracle_address: Address authorized to settle market
    """
    def __init__(self, address = None, event_description = None, event_symbol=None, original_address = None, oracle_address = None):
        super().__init__("rust/target/wasm32-unknown-unknown/release/", "token_splitter")

        if address:
            self.address = address
            try:
                print(f"Initializing TokenSplitter from existing contract: {address}")
                state = SerializedState(address = address)
                fields = state.deserialize(["String", "String","Address","Address","Address","Address"])
                self.event_description = fields[0]
                self.event_symbol = fields[1]
                self.original_address = fields[2]
                self.true_address = fields[3]
                self.false_address = fields[4]
                self.oracle_address = fields[5]
                print(f"Successfully loaded TokenSplitter state: event='{self.event_description}', symbol='{self.event_symbol}'")
            except Exception as e:
                print(f"Error deserializing TokenSplitter state: {e}")
                raise
        elif event_description and event_symbol and original_address and oracle_address:
            print(f"Creating new TokenSplitter for event: '{event_description}', symbol: '{event_symbol}'")
            print(f"Original token address: {original_address}")
            print(f"Oracle address: {oracle_address}")
            
            try:
                self.event_description = event_description
                self.event_symbol = event_symbol
                self.original_address = original_address
                self.oracle_address = oracle_address
                
                print("Loading original token details...")
                try:
                    original_token = TokenV2(address=original_address)
                    print(f"Original token loaded: name='{original_token.name}', symbol='{original_token.symbol}', decimals={original_token.decimals}")
                except Exception as e:
                    print(f"Error loading original token: {e}")
                    raise
                
                print('Setting up standard MPC20 contract for "true token"...')
                try:
                    true_token_name = original_token.name + " | " + event_description
                    true_token_symbol = original_token.symbol + "|" + event_symbol
                    print(f"Creating TRUE token with name='{true_token_name}', symbol='{true_token_symbol}'")
                    
                    true_token = TokenV2(
                        name=true_token_name, 
                        symbol=true_token_symbol, 
                        decimals=original_token.decimals, 
                        supply=original_token.supply
                    )
                    self.true_address = true_token.address
                    print(f"TRUE token deployed at: {self.true_address}")
                    # Small delay to ensure token is registered on blockchain
                    time.sleep(2)
                except Exception as e:
                    print(f"Error creating TRUE token: {e}")
                    raise
                
                print('Setting up standard MPC20 contract for "false token"...')
                try:
                    false_token_name = original_token.name + " | !(" + event_description + ")"
                    false_token_symbol = original_token.symbol + "|!" + event_symbol
                    print(f"Creating FALSE token with name='{false_token_name}', symbol='{false_token_symbol}'")
                    
                    false_token = TokenV2(
                        name=false_token_name, 
                        symbol=false_token_symbol, 
                        decimals=original_token.decimals, 
                        supply=original_token.supply
                    )
                    self.false_address = false_token.address
                    print(f"FALSE token deployed at: {self.false_address}")
                    # Small delay to ensure token is registered on blockchain
                    time.sleep(2)
                except Exception as e:
                    print(f"Error creating FALSE token: {e}")
                    raise
                
                print("Deploying token splitter...")
                try:
                    self.deploy([
                        event_description, 
                        event_symbol, 
                        original_address, 
                        self.true_address, 
                        self.false_address, 
                        oracle_address
                    ])
                    print(f"Token splitter deployed at: {self.address}")
                    # Small delay to ensure contract is registered on blockchain
                    time.sleep(2)
                except Exception as e:
                    print(f"Error deploying token splitter: {e}")
                    raise
                
                print('Approving transfer of all "True tokens" to token splitter contract')
                try:
                    approval_tx = true_token.approve_relative(self.address, original_token.supply)
                    print(f"TRUE token approval transaction: {approval_tx}")
                    time.sleep(2)
                except Exception as e:
                    print(f"Error approving TRUE tokens: {e}")
                    raise
                
                print("Depositing TRUE tokens to splitter contract")
                try:
                    deposit_tx = self.deposit(self.true_address, original_token.supply)
                    print(f"TRUE token deposit transaction: {deposit_tx}")
                    time.sleep(2)
                except Exception as e:
                    print(f"Error depositing TRUE tokens: {e}")
                    raise
                
                print('Approving transfer of all "False tokens" to token splitter contract')
                try:
                    approval_tx = false_token.approve_relative(self.address, original_token.supply)
                    print(f"FALSE token approval transaction: {approval_tx}")
                    time.sleep(2)
                except Exception as e:
                    print(f"Error approving FALSE tokens: {e}")
                    raise
                
                print("Depositing FALSE tokens to splitter contract")
                try:
                    deposit_tx = self.deposit(self.false_address, original_token.supply)
                    print(f"FALSE token deposit transaction: {deposit_tx}")
                    time.sleep(2)
                except Exception as e:
                    print(f"Error depositing FALSE tokens: {e}")
                    raise
                
                print("Preparing the token splitter for business...")
                try:
                    prepare_tx = self.prepare(original_token.supply)
                    print(f"Token splitter preparation transaction: {prepare_tx}")
                except Exception as e:
                    print(f"Error preparing token splitter: {e}")
                    raise
                
                print("Token splitter setup completed successfully!")
            except Exception as e:
                print(f"Failed to initialize TokenSplitter: {e}")
                raise
        else:
            raise ValueError("Invalid arguments provided to TokenSplitter.")

    def deposit(self, token_address, amount):
        print(f"Depositing {amount} tokens from {token_address} to splitter {self.address}")
        try:
            return self.interact("deposit", [token_address, amount])
        except Exception as e:
            print(f"Error in deposit: {e}")
            raise

    def approve_and_deposit(self, token_address, amount):
        print(f"Approving and depositing {amount} tokens from {token_address}")
        try:
            token = TokenV2(address=token_address)
            approval_tx = token.approve_relative(self.address, amount)
            print(f"Approval transaction: {approval_tx}")
            time.sleep(2)  # Wait for approval to be confirmed
            return self.deposit(token_address, amount)
        except Exception as e:
            print(f"Error in approve_and_deposit: {e}")
            raise

    def withdraw(self, token, amount, wait=False):
        print(f"Withdrawing {amount} tokens of {token} (wait={wait})")
        wait_string = "false"
        if wait:
            wait_string = "true"
        try:
            return self.interact("withdraw", [token, amount, wait_string])
        except Exception as e:
            print(f"Error in withdraw: {e}")
            raise

    def prepare(self, amount):
        print(f"Preparing token splitter with amount: {amount}")
        try:
            return self.interact("prepare", [amount])
        except Exception as e:
            print(f"Error in prepare: {e}")
            raise

    def split(self, amount):
        print(f"Splitting {amount} tokens")
        try:
            return self.interact("split", [amount])
        except Exception as e:
            print(f"Error in split: {e}")
            raise

    def join(self, amount):
        print(f"Joining {amount} token pairs")
        try:
            return self.interact("join", [amount])
        except Exception as e:
            print(f"Error in join: {e}")
            raise

    def settle(self, settle_to):
        print(f"Settling market to: {settle_to}")
        settle_string = "false"
        if settle_to:
            settle_string = "true"
        try:
            return self.interact("settle", [settle_string])
        except Exception as e:
            print(f"Error in settle: {e}")
            raise

    def redeem(self, amount):
        print(f"Redeeming {amount} tokens")
        try:
            return self.interact("redeem", [amount])
        except Exception as e:
            print(f"Error in redeem: {e}")
            raise
