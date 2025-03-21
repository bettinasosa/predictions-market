"""
Interface for the Double Auction smart contract.
Handles order placement, token deposits/withdrawals, and order cancellations.
"""

from pbccontract import PBCContract
from serializedstate import SerializedState
from tokenv2 import TokenV2

class DoubleAuction(PBCContract):
    """
    Manages interaction with the Double Auction smart contract.
    
    Attributes:
        address: Contract address on blockchain
        numerator: Price scaling numerator
        denominator: Price scaling denominator
        currency_address: Address of currency token contract
        asset_address: Address of asset token contract
    """

    def __init__(self, currency=None, asset=None, numerator=None, denominator=None, address=None):
        """
        Initialize double auction interface either with new deployment or existing contract.
        
        Args:
            currency: Optional - Address of currency token
            asset: Optional - Address of asset token
            numerator: Optional - Price scaling numerator
            denominator: Optional - Price scaling denominator
            address: Optional - Existing contract address
        """
        super().__init__("rust/target/wasm32-unknown-unknown/release/", "double_auction")

        if address:
            self.address = address
            state = SerializedState(address = address)
            fields = state.deserialize(["u64", "u64", "u64", "Address","Address","Address"])
            self.numerator = fields[0]
            self.denominator = fields[1]
            self.currency_address = fields[4]
            self.asset_address = fields[5]
        elif currency and asset and numerator and denominator:
            self.asset_address = asset
            self.numerator = numerator
            self.denominator = denominator
            self.currency_address = currency
            self.deploy([currency, asset, numerator, denominator])
        else:
            raise ValueError("Invalid arguments provided to DoubleAuction.")

    def deposit(self, token_address, amount):
        self.interact("deposit", [token_address, amount])

    def approve_and_deposit(self, token_address, amount):
        token = TokenV2(address=token_address)
        token.approve_relative(self.address, amount)
        self.deposit(token_address, amount)

    def withdraw(self, token_address, amount, wait=False):
        wait_string = "false"
        if wait:
            wait_string = "true"
        self.interact("withdraw", [token_address, amount, wait_string])

    def submit_bid(self, price, amount, cancel_id=0):
        self.interact("submit_bid", [price, amount, cancel_id])

    def submit_ask(self, price, amount, cancel_id=0):
        self.interact("submit_ask", [price, amount, cancel_id])

    def cancel_limit_order(self, cancel_id):
        self.interact("cancel_limit_order", [cancel_id])
