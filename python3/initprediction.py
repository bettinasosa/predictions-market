from tokenv2 import TokenV2
from tokensplitter import TokenSplitter
from doubleauction import DoubleAuction
from windowsupdater import WindowsUpdater
import json

print("PREDICTION MARKET INITIALIZATION")
print("")
print("This script initializes a prediction market on publicPBC testnet")
print("for a single future binary event, including:")
print("- Two standard MPC20 token contracts for the two derived assets")
print("- A tokensplitter contract")
print("- Two double auction contracts")
print("")
print("Let's begin.")
print("")
original_address = input("What is the contract address for the original (currency) asset? ")
print("Just checking that this would make sense..")
currency = TokenV2(address = original_address)
print("This seems to be the standard MPC20 contract for", currency.name, "with symbol", currency.symbol, "and", currency.decimals, "decimals.")
event_description = input("Please give a description of the future event: ")
event_symbol = input("Please summarize the description in a single word: ")
oracle_address = input("What is the address for the oracle that will settle the event? ")

print("Setting up tokensplitter contract....")
my_splitter = TokenSplitter(event_description=event_description, event_symbol=event_symbol, original_address=original_address, oracle_address = oracle_address)
true_token_address = my_splitter.true_address
false_token_address = my_splitter.false_address

print('Setting up double auction for "true token"...')
auction_true = DoubleAuction(true_token_address=true_token_address, false_token_address=original_address, price_numerator=1, price_denominator=1000)
print('Setting up double auction for "false token"...')
auction_false = DoubleAuction(true_token_address=false_token_address, false_token_address=original_address, price_numerator=1, price_denominator=1000)
print("")
print("The prediction market is running.")
print("")
print("Address for token splitter: ", my_splitter.address)
print('Address for the double auction for the "true token":', auction_true.address)
print('Address for the double auction for the "false token":', auction_false.address)
print()

data = {
    "event": event_description,
    "oracle": oracle_address,
    "currency": original_address,
    "splitter": my_splitter.address,
    "true_token": true_token_address,
    "true_auction": auction_true.address,
    "false_token": false_token_address,
    "false_auction": auction_false.address
}

filename = "prediction-market.json"
updater = WindowsUpdater()
true_token = TokenV2(address = true_token_address)
false_token = TokenV2(address = false_token_address)

updater.add_window(true_token.symbol, "render_bids_asks", [auction_true.address])
updater.add_window(false_token.symbol, "render_bids_asks", [auction_false.address])

with open(filename, 'w') as json_file:
    json.dump(data, json_file, indent=4) 

print("Have a nice day and may the odds be ever in your favor")
