from pbccontract import PBCContract
from serializedstate import SerializedState

class TokenV2(PBCContract):
    
    def __init__(self, address=None, name=None, symbol=None, decimals=None, supply=None):
        super().__init__("rust/target/wasm32-unknown-unknown/release/", "token_v2")

        if address:
            self.address = address
            try:
                state = SerializedState(address = address)
                fields = state.deserialize(["String","u8","String","Address","u128"])
                self.name = fields[0]
                self.symbol = fields[2]
                self.decimals = fields[1]
                self.supply = fields[4]
                print(f"Successfully connected to token: {self.name} ({self.symbol})")
            except Exception as e:
                print(f"Error parsing token state: {e}")
                # Set default values
                self.name = "Unknown Token"
                self.symbol = "UNKNOWN"
                self.decimals = 18
                self.supply = 0
                print("Using default token values")
        else:
            self.name = name
            self.symbol = symbol
            self.decimals = decimals
            self.supply = supply
            print(f"Deploying token with name: {name}, symbol: {symbol}, decimals: {decimals}, supply: {supply}")
            # Pass parameters directly - pbccontract.py will handle the quoting
            self.deploy([name, symbol, decimals, supply])

    def approve(self, address, amount):
        return self.interact("approve", [address, amount])

    def approve_relative(self, address, amount):
        return self.interact("approve_relative", [address, amount])

    def transfer(self, address, amount):
        return self.interact("transfer", [address, amount])

