"""
Base class for interacting with Partisia Blockchain smart contracts.
Handles contract deployment, transaction management, and logging.
"""

import config
import pexpect
import sys
from logger import Logger
import subprocess
import requests
import time
import json
import shlex
import os.path

def verify_transaction(trans_id, retries):
    """
    Verifies a transaction has been successfully processed on the blockchain.
    
    Args:
        trans_id: Transaction hash to verify
        retries: Number of retry attempts
         
    Returns:
        bool: True if transaction successful, False otherwise
    """
    url0 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard0/transactions/{trans_id}"
    url1 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard1/transactions/{trans_id}"
    url2 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard2/transactions/{trans_id}"
    delays = [2, 4, 8]  # Exponential backoff delays
    urls = [url0, url1, url2]
    for attempt in range(len(delays) + 1):
        for url in urls:
            try:
                response = requests.get(url, timeout=5)
                response.raise_for_status()  # Raise an error for HTTP issues
                data = response.json()  # Attempt to parse JSON
                if data.get("executionStatus", {}).get("success") is True:
                    return True
            except (requests.RequestException, json.JSONDecodeError):
                # Handle non-existing pages, non-JSON responses, or HTTP errors
                pass
            if attempt < len(delays):
                time.sleep(delays[attempt])
        return False

class PBCContract:

    log_file = Logger("pbc_cli.log")

    def execute(command):
        try:
            PBCContract.log_file.print(command)
            result = subprocess.check_output(command, shell=True, text=True)
            PBCContract.log_file.print(result)
            for line in result.splitlines():
                if "Transaction sent: " in line:
                    trans_id = line.split("Transaction sent: ")[1][:64] 
                    return trans_id
        except subprocess.CalledProcessError as e:
            raise Exception("Command execution failed") from e
        raise Exception("Transaction ID not found in command output")

    def carefully_execute(command):
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                trans_id = PBCContract.execute(command)
                response = verify_transaction(trans_id, retries=4)  
                if response:
                    PBCContract.log_file.print("Transaction " + trans_id + " verified as successful.")
                    return trans_id
            except Exception as e:
                PBCContract.log_file.print(f"Error: {e}")
            PBCContract.log_file.print("Retrying...")
        raise Exception("Maximum attempts reached, all attempted transactions failed.")
                            
    def __init__(self, path, name):
        self.path = path
        self.contract_name = name
        self.shard = None

    def get_shard(self):
        if not(self.shard):
            response = requests.get("https://node1.testnet.partisiablockchain.com/chain/contracts/" + self.address)
            response.raise_for_status()
            content = response.text
            json_data = json.loads(content)
            self.shard =json_data["shardId"]
        return self.shard

    def deploy(self, params):
        wasm_path = os.path.join(self.path, self.contract_name + ".wasm")
        abi_path = os.path.join(self.path, self.contract_name + ".abi")
        
        if not os.path.exists(wasm_path):
            raise FileNotFoundError(f"Contract WASM file not found at: {wasm_path}\nPlease compile the contract first.")
        
        if not os.path.exists(abi_path):
            raise FileNotFoundError(f"Contract ABI file not found at: {abi_path}\nPlease compile the contract first.")
        
        s1 = "cargo pbc transaction deploy --privatekey " + config.keyfile + " --gas " + str(config.gas) + " " + wasm_path + " --abi " + abi_path
        for s in params:
            if isinstance(s, str) and ' ' in s:
                s1 = s1 + " " + shlex.quote(s)
            else:
                s1 = s1 + " " + str(s)
        PBCContract.log_file.print(s1)
        child = pexpect.spawn(s1)
        child.expect("deployed at: .*\n")
        self.address = child.after[13:55].decode('utf-8')
        PBCContract.log_file.print(child.before+child.after)
        return self.address

    def interact(self, action_name, params):
        abi_path = os.path.join(self.path, self.contract_name + ".abi")
        s1 = "cargo pbc transaction action --show tx --privatekey " + config.keyfile + " --gas " + str(config.gas) + " --abi " + abi_path + " " + self.address + " " + action_name
        for s in params:
            if isinstance(s, str) and ' ' in s:
                s1 = s1 + " " + shlex.quote(s)
            else:
                s1 = s1 + " " + str(s)
        if config.careful:
            return(PBCContract.carefully_execute(s1))
        else:
            return(PBCContract.execute(s1))
