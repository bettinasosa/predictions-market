from tokenv2 import TokenV2
from tokensplitter import TokenSplitter
from doubleauction import DoubleAuction
import json
import math

with open("prediction-market.json", 'r') as json_file:
    data = json.load(json_file)

currency = TokenV2(address=data["currency"])
true_auction = DoubleAuction(address=data["true_auction"])
false_auction = DoubleAuction(address=data["false_auction"])
splitter = TokenSplitter(address=data["splitter"])
true_address = true_auction.asset_address
false_address = false_auction.asset_address
true_token = TokenV2(address = true_address)
false_token = TokenV2(address = false_address)
true_symbol = true_token.symbol
false_symbol = false_token.symbol

print(" PBC PREDICTION MARKET PARTICIPATION")
print("")
print(" Every gambler knows")
print(" That the secret to survivin'")
print(" Is knowin' what to throw away")
print(" And knowin' what to keep")
print("    --- Kenny Rogers")
print("")
print(" Welcome to the PBC Prediction Market!")
print("")
print(" Here you can bet on exactly one event:")
print("  "+data["event"])
print("")
opposite = "negative"
token_I_like = true_token
token_I_hate = false_token
answer1 = input(" Do you want to bet on a positive outcome? (Y/N) ")
if answer1!="Y":
    print(" I'll assume you want to bet on a negative outcome then.")
    opposite = "positive"
    token_I_like = false_token
    token_I_hate = true_token

print(" Please choose a cancelation id to be able to cancel")
c = input(" your order later (positive integer): ")
c = int(c)

amount_in = input(" How many "+currency.name+" do you want to bet? ")
amount_in = float(amount_in)
actual_in = int(amount_in*(10**currency.decimals))
amount_out = input(" What is your minimum acceptable winning amount, INCLUDING the bet? ")
amount_out = float(amount_out)
actual_out = int(amount_out*(10**currency.decimals))
answer2 = input(" Do you want to bet as a buyer or an seller? (B/S) ")
if answer2=="B":
    my_auction = true_auction
    if answer1!="Y":
        my_auction = false_auction
    print(" To bet as a buyer, you first deposit", amount_in, currency.symbol, "to the auction contract for", token_I_like.symbol)
    print(" Let me do that for you (hey, I know your secret key!)")
    
    currency.approve_relative(my_auction.address, actual_in)
    my_auction.deposit(currency.address, actual_in)

    print(" You then simply place a bid for", amount_out, token_I_like.symbol)
    print(" at price", amount_in, "divided by", amount_out, "that is, price", amount_in/amount_out)
    auction_price = int((amount_in/amount_out)*my_auction.denominator/my_auction.numerator)
    order_amount = actual_out
if answer2=="S":
    my_auction = false_auction
    if answer1!="Y":
        my_auction = true_auction
    print("")
    print(" To bet as an seller, you first split", amount_out, currency.symbol, "in the token splitter.")
    print(" Let me do that for you (hey, I know your secret key!)")

    print(" Approving transfer of currency to splitter...")
    currency.approve_relative(splitter.address, actual_out)
    print(" Actually doing the transfer of currency to splitter...") 
    splitter.deposit(currency.address, actual_out)
    print(" Splitting the deposited currency in two...")
    splitter.split(actual_out)
    print(" Withdrawing", true_token.symbol, "...")
    splitter.withdraw(true_token.address, actual_out)
    print(" Withdrawing", false_token.symbol, "...")
    splitter.withdraw(false_token.address, actual_out)
    
    print(" You now have", amount_out, true_symbol, "and", amount_out, false_symbol)
    print(" We now transfer the token you don't like - in your case", token_I_hate.symbol)
    print(" - to the auction contract...")
        
    token_I_hate.approve_relative(my_auction.address, actual_out)
    my_auction.deposit(token_I_hate.address, actual_out)
    
    print(" and attempt to sell them for a total price of:")
    print(amount_out, "minus", amount_in, currency.symbol, "=", amount_out-amount_in, currency.symbol)
    print("which, divided by", amount_out, "is a price per token of",(amount_out - amount_in)/amount_out)
    auction_price = math.ceil( ((amount_out - amount_in)/amount_out)*my_auction.denominator/my_auction.numerator)
ok = input(" Keep an eye on the ask/bids lists and press ENTER...")    
if answer2=="B":
    my_auction.submit_bid(price=auction_price, amount=actual_out, cancel_id=c)
if answer2=="S":
    my_auction.submit_ask(price=auction_price, amount=actual_out, cancel_id=c)
