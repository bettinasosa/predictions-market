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
import tempfile
from pathlib import Path

def verify_transaction(trans_id, retries):
    """
    Verifies a transaction has been successfully processed on the blockchain.
    
    Args:
        trans_id: Transaction hash to verify
        retries: Number of retry attempts
         
    Returns:
        bool: True if transaction successful, False otherwise
    """
    # Ensure we're using just the transaction hash, not the full URL
    if "transactions/" in trans_id:
        trans_id = trans_id.split("transactions/")[1]
        
    url0 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard0/transactions/{trans_id}"
    url1 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard1/transactions/{trans_id}"
    url2 = f"https://node1.testnet.partisiablockchain.com/chain/shards/Shard2/transactions/{trans_id}"
    delays = [2, 4, 8]  # Exponential backoff delays
    urls = [url0, url1, url2]
    print(f"Verifying transaction {trans_id} on shards")
    
    for attempt in range(len(delays) + 1):
        for url in urls:
            try:
                print(f"Checking shard URL: {url}")
                response = requests.get(url, timeout=5)
                response.raise_for_status()  # Raise an error for HTTP issues
                data = response.json()  # Attempt to parse JSON
                
                # Debug print transaction details
                if "executionStatus" in data:
                    status = data["executionStatus"]
                    print(f"Transaction status: {status}")
                    
                if data.get("executionStatus", {}).get("success") is True:
                    print(f"Transaction {trans_id} verified successfully")
                    return True
            except requests.RequestException as e:
                print(f"Request exception checking {url}: {e}")
                # Handle non-existing pages, non-JSON responses, or HTTP errors
                pass
            except json.JSONDecodeError as e:
                print(f"JSON decode error for {url}: {e}")
                pass
                
        if attempt < len(delays):
            wait_time = delays[attempt]
            print(f"Transaction not verified yet, waiting {wait_time} seconds before retry...")
            time.sleep(wait_time)
        else:
            print(f"Failed to verify transaction {trans_id} after {len(delays) + 1} attempts")
    
    return False

class PBCContract:
    """
    Base class for Partisia Blockchain smart contracts.
    
    Attributes:
        path: Path to contract binaries
        contract_name: Name of the contract
        address: Contract address once deployed
        shard: Shard ID where contract is deployed
    """
    
    log_file = Logger("pbc_cli.log")

    @staticmethod
    def execute(command):
        """Execute a shell command and extract transaction ID"""
        try:
            print(f"Executing: {command}")
            PBCContract.log_file.print(command)
            result = subprocess.check_output(command, shell=True, text=True)
            PBCContract.log_file.print(result)
            
            for line in result.splitlines():
                if "Transaction sent: " in line:
                    full_url = line.split("Transaction sent: ")[1].strip()
                    # Extract just the transaction hash from the URL
                    if "transactions/" in full_url:
                        trans_id = full_url.split("transactions/")[1][:64]
                    else:
                        trans_id = full_url[:64]  # Fallback to old behavior
                    print(f"Transaction sent: {trans_id}")
                    return trans_id
        except subprocess.CalledProcessError as e:
            error_msg = f"Command execution failed: {e}"
            print(error_msg)
            PBCContract.log_file.print(error_msg)
            if hasattr(e, 'output') and e.output:
                print(f"Command output: {e.output}")
                PBCContract.log_file.print(f"Command output: {e.output}")
            raise Exception(error_msg) from e
            
        error_msg = "Transaction ID not found in command output"
        print(error_msg)
        PBCContract.log_file.print(error_msg)
        raise Exception(error_msg)

    @staticmethod
    def carefully_execute(command):
        """Execute a command with retries and transaction verification"""
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                print(f"Attempt {attempt}/{max_attempts} to execute command")
                trans_id = PBCContract.execute(command)
                print(f"Verifying transaction {trans_id}")
                response = verify_transaction(trans_id, retries=4)  
                if response:
                    success_msg = f"Transaction {trans_id} verified as successful"
                    print(success_msg)
                    PBCContract.log_file.print(success_msg)
                    return trans_id
                else:
                    error_msg = f"Transaction {trans_id} verification failed"
                    print(error_msg)
                    PBCContract.log_file.print(error_msg)
            except Exception as e:
                error_msg = f"Error in attempt {attempt}: {e}"
                print(error_msg)
                PBCContract.log_file.print(error_msg)
                
            if attempt < max_attempts:
                retry_msg = f"Retrying command (attempt {attempt+1}/{max_attempts})..."
                print(retry_msg)
                PBCContract.log_file.print(retry_msg)
                time.sleep(2 ** attempt)  # Exponential backoff
                
        error_msg = f"Maximum attempts reached ({max_attempts}), all attempted transactions failed"
        print(error_msg)
        PBCContract.log_file.print(error_msg)
        raise Exception(error_msg)
    
    def __init__(self, path, name):
        """
        Initialize a contract instance.
        
        Args:
            path: Path to the folder containing the contract files
            name: Name of the contract
        """
        self.path = path
        self.contract_name = name
        self.shard = None
        self.address = None
        
        # Verify contract files exist
        self._check_files_exist()
        
    def _check_files_exist(self):
        """Check if contract WASM and ABI files exist"""
        wasm_path = os.path.join(self.path, self.contract_name + ".wasm")
        abi_path = os.path.join(self.path, self.contract_name + ".abi")
        
        missing_files = []
        if not os.path.exists(wasm_path):
            missing_files.append(wasm_path)
        if not os.path.exists(abi_path):
            missing_files.append(abi_path)
            
        if missing_files:
            error_msg = f"Missing contract files: {', '.join(missing_files)}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
        
        print(f"Found contract files: {wasm_path} and {abi_path}")

    def get_shard(self):
        """Fetch the shard ID for the deployed contract"""
        if not self.address:
            raise ValueError("Contract not deployed. Call deploy() first")
            
        if not self.shard:
            print(f"Fetching shard ID for contract: {self.address}")
            try:
                url = f"https://node1.testnet.partisiablockchain.com/chain/contracts/{self.address}"
                print(f"Requesting contract data from: {url}")
                
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                content = response.text
                
                try:
                    json_data = json.loads(content)
                    if "shardId" in json_data:
                        self.shard = json_data["shardId"]
                        print(f"Contract is on shard: {self.shard}")
                    else:
                        print(f"Warning: 'shardId' not found in response. Keys: {list(json_data.keys())}")
                except json.JSONDecodeError as e:
                    print(f"Error parsing contract data: {e}")
                    print(f"Raw response: {content[:200]}...")  # Print first 200 chars
            except requests.RequestException as e:
                print(f"Error fetching contract data: {e}")
                
        return self.shard

    def deploy(self, params):
        """
        Deploy the contract to the blockchain.
        
        Args:
            params: List of parameters to pass to the contract constructor
            
        Returns:
            address: Deployed contract address
        """
        wasm_path = os.path.join(self.path, self.contract_name + ".wasm")
        abi_path = os.path.join(self.path, self.contract_name + ".abi")
        
        if not os.path.exists(wasm_path):
            raise FileNotFoundError(f"Contract WASM file not found at: {wasm_path}\nPlease compile the contract first.")
        
        if not os.path.exists(abi_path):
            raise FileNotFoundError(f"Contract ABI file not found at: {abi_path}\nPlease compile the contract first.")
        
        print(f"Deploying contract: {self.contract_name}")
        print(f"WASM path: {wasm_path}")
        print(f"ABI path: {abi_path}")
        print(f"Parameters: {params}")
        
        s1 = f"cargo pbc transaction deploy --privatekey {config.keyfile} --gas {str(config.gas)} {wasm_path} --abi {abi_path}"
        for s in params:
            if isinstance(s, str) and ' ' in s:
                s1 = s1 + " " + shlex.quote(s)
            else:
                s1 = s1 + " " + str(s)
                
        print(f"Executing deploy command: {s1}")
        PBCContract.log_file.print(s1)
        
        try:
            child = pexpect.spawn(s1)
            child.expect("deployed at: .*\n")
            self.address = child.after[13:55].decode('utf-8')
            
            success_msg = f"Contract deployed at address: {self.address}"
            print(success_msg)
            PBCContract.log_file.print(child.before.decode('utf-8') + child.after.decode('utf-8'))
            
            # Short delay to allow contract registration
            time.sleep(2)
            
            return self.address
        except pexpect.ExceptionPexpect as e:
            error_msg = f"Error deploying contract: {e}"
            print(error_msg)
            PBCContract.log_file.print(error_msg)
            if hasattr(child, 'before') and child.before:
                print(f"Command output before error: {child.before.decode('utf-8')}")
            raise

    def interact(self, action_name, params):
        """
        Interact with a deployed contract.
        
        Args:
            action_name: Function name to call
            params: List of parameters to pass to the function
            
        Returns:
            Transaction hash
        """
        if not self.address:
            raise ValueError("Contract not deployed yet. Call deploy() first.")
        
        abi_path = os.path.join(self.path, self.contract_name + ".abi")
        if not os.path.exists(abi_path):
            raise FileNotFoundError(f"Contract ABI file not found at: {abi_path}")
            
        print(f"Interacting with contract: {self.contract_name}")
        print(f"Contract address: {self.address}")
        print(f"Action: {action_name}")
        print(f"Parameters: {params}")
        
        s1 = f"cargo pbc transaction action --show tx --privatekey {config.keyfile} --gas {str(config.gas)} --abi {abi_path} {self.address} {action_name}"
        for s in params:
            if isinstance(s, str) and ' ' in s:
                s1 = s1 + " " + shlex.quote(s)
            else:
                s1 = s1 + " " + str(s)
                
        print(f"Executing interact command: {s1}")
        
        if config.careful:
            print("Using careful execution mode with transaction verification")
            return PBCContract.carefully_execute(s1)
        else:
            print("Using standard execution mode without transaction verification")
            return PBCContract.execute(s1)
