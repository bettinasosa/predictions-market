"""
Interface for Token Splitter smart contract.
Manages creation and settlement of prediction market tokens.
"""

from pbccontract import PBCContract
from tokenv2 import TokenV2
from serializedstate import SerializedState

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
        super().__init__("../rust/target/wasm32-unknown-unknown/release/", "token_splitter")

        if address:
            self.address = address
            state = SerializedState(address = address)
            fields = state.deserialize(["String", "String","Address","Address","Address","Address"])
            self.event_description = fields[0]
            self.event_symbol = fields[1]
            self.original_address = fields[2]
            self.true_address = fields[3]
            self.false_address = fields[4]
            self.oracle_address = fields[5]
        elif event_description and event_symbol and original_address and oracle_address:
            self.event_description = event_description
            self.event_symbol = event_symbol
            self.original_address = original_address
            self.oracle_address = oracle_address
            original_token = TokenV2(address=original_address)
            print('Setting up standard MPC20 contract for "true token"...')
            true_token = TokenV2(name=original_token.name+" | "+event_description, symbol=original_token.symbol+"|"+event_symbol, decimals=original_token.decimals, supply = original_token.supply)
            self.true_address = true_token.address
            print('Setting up standard MPC20 contract for "false token"...')
            false_token = TokenV2(name=original_token.name+" | !("+event_description+")", symbol=original_token.symbol+"|!"+event_symbol, decimals=original_token.decimals, supply = original_token.supply)
            self.false_address = false_token.address
            print("Deploying token splitter...")
            self.deploy(['"'+event_description+'"', '"'+event_symbol+'"', original_address, true_token.address, false_token.address, oracle_address])
            print('Approving transfer of all "True tokens" to token splitter contract') 
            true_token.approve_relative(self.address, original_token.supply)
            print("Doing the transfer")
            self.deposit(true_token.address, original_token.supply)
            print('Approving transfer of all "False tokens" to token splitter contract') 
            false_token.approve_relative(self.address, original_token.supply)
            print("Doing the transfer")
            self.deposit(false_token.address, original_token.supply)
            print("Preparing the token spliter for business...") 
            self.prepare(original_token.supply)
        else:
            raise ValueError("Invalid arguments provided to TokenSplitter.")

    def deposit(self, token_address, amount):
        self.interact("deposit", [token_address, amount])

    def approve_and_deposit(self, token_address, amount):
        token = TokenV2(address=token_address)
        token.approve_relative(self.address, amount)
        self.deposit(token_address, amount)

    def withdraw(self, token, amount, wait=False):
        wait_string = "false"
        if wait:
            wait_string = "true"
        self.interact("withdraw", [token, amount, wait_string])

    def prepare(self, amount):
        self.interact("prepare", [amount])

    def split(self, amount):
        self.interact("split", [amount])

    def join(self, amount):
        self.interact("join", [amount])

    def settle(self, settle_to):
        settle_string = "false"
        if settle_to:
            settle_string = "true"
        self.interact("settle", [settle_string])

    def redeem(self, amount):
        self.interact("redeem", [amount])
