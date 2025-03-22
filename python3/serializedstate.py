"""
Handles deserialization of contract state from Partisia blockchain.
Supports various data types and provides clean interface for state reading.
"""

import requests
import json
import base64
import struct
import time

class SerializedState:
    """
    Deserializes contract state from blockchain.
    
    Methods support parsing of:
    - Numbers (u8, u32, u64, u128)
    - Strings
    - Addresses
    - Booleans
    """

    def __init__(self, address=None, base64content=None):
        """
        Initialize with either contract address or base64 encoded state.
        
        Args:
            address: Optional - Contract address to fetch state
            base64content: Optional - Base64 encoded state data
        """
        if address:
            print(f"Fetching state for contract: {address}")
            try:
                # Add retry mechanism for contract state fetch
                max_retries = 3
                delay_seconds = 2
                
                for attempt in range(max_retries):
                    try:
                        response = requests.get(f"https://node1.testnet.partisiablockchain.com/chain/contracts/{address}", timeout=10)
                        response.raise_for_status()
                        content = response.text
                        json_data = json.loads(content)
                        
                        if "serializedContract" in json_data:
                            base64content = json_data["serializedContract"]
                            print(f"Successfully fetched contract state on attempt {attempt+1}")
                            break
                        else:
                            print(f"Warning: serializedContract not found in response on attempt {attempt+1}")
                            print(f"Response keys: {json_data.keys()}")
                            
                            if attempt < max_retries - 1:
                                print(f"Waiting {delay_seconds} seconds before retry...")
                                time.sleep(delay_seconds)
                                delay_seconds *= 2  # Exponential backoff
                    except requests.RequestException as e:
                        print(f"Request error on attempt {attempt+1}: {e}")
                        if attempt < max_retries - 1:
                            print(f"Waiting {delay_seconds} seconds before retry...")
                            time.sleep(delay_seconds)
                            delay_seconds *= 2
                
                if base64content is None:
                    raise Exception(f"Failed to fetch serializedContract for address {address} after {max_retries} attempts")
            except Exception as e:
                print(f"Error fetching contract state: {e}")
                raise
                
        try:
            self.content = base64.b64decode(base64content)
            print(f"Decoded base64 content, length: {len(self.content)} bytes")
            # Print first few bytes for debugging
            if len(self.content) > 0:
                print(f"First 10 bytes (hex): {self.content[:min(10, len(self.content))].hex()}")
        except Exception as e:
            print(f"Error decoding base64 content: {e}")
            raise

    def chopLeNumber(self, nobytes):
        if len(self.content) < nobytes:
            raise ValueError(f"Not enough bytes left to chop {nobytes} bytes. Only {len(self.content)} bytes remaining.")
            
        result = 0
        factor = 1
        for i in range(nobytes):
            result = result + (int(self.content[i]))*factor
            factor = factor*256
        self.content = self.content[nobytes:]
        return result

    def chopHex(self, nobytes):
        if len(self.content) < nobytes:
            raise ValueError(f"Not enough bytes left to chop {nobytes} bytes. Only {len(self.content)} bytes remaining.")
            
        result = self.content[0:nobytes].hex()
        self.content = self.content[nobytes:]
        return result

    def chopAddress(self):
        try:
            return(self.chopHex(21))
        except Exception as e:
            print(f"Error chopping address: {e}")
            raise
        
    def chopString(self):
        try:
            length = self.chopLeNumber(4)
            print(f"Chopping string with length: {length}")
            
            if length > len(self.content):
                raise ValueError(f"String length ({length}) exceeds remaining content length ({len(self.content)})")
                
            result = self.content[:length].decode("utf-8")
            self.content = self.content[length:]
            return result
        except Exception as e:
            print(f"Error chopping string: {e}")
            print(f"Remaining content (hex): {self.content[:min(20, len(self.content))].hex()}")
            raise

    def chop(self, choptype):
        try:
            print(f"Chopping type: {choptype}")
            if choptype == "String":
                return self.chopString()
            elif choptype == "Address":
                return self.chopAddress()
            elif choptype == "bool":
                return (self.chopLeNumber(1)!=0)
            elif choptype == "u8":
                return self.chopLeNumber(1)
            elif choptype == "u32":
                return self.chopLeNumber(4)
            elif choptype == "u64":
                return self.chopLeNumber(8)
            elif choptype == "u128":
                return self.chopLeNumber(16)
            else:
                raise ValueError(f"Unknown chop type: {choptype}")
        except Exception as e:
            print(f"Error chopping type '{choptype}': {e}")
            raise

    def deserialize(self, fieldlist):
        result = []
        print(f"Deserializing fields: {fieldlist}")
        try:
            for s in fieldlist:
                value = self.chop(s)
                print(f"  Field type '{s}' = {value}")
                result.append(value)
            return result
        except Exception as e:
            print(f"Error during deserialization: {e}")
            print(f"Processed {len(result)} fields out of {len(fieldlist)} before error")
            # Continue with partial result if we have some data
            if len(result) > 0:
                print("Returning partial result")
                return result
            raise
    
#s = SerializedState(address = "024056f1a19745f2b8e86e10aa5a144d6b09b641d8")
#print(s.deserialize(["String","u8","String","Address","u128"]))
