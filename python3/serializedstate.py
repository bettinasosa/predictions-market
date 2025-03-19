"""
Handles deserialization of contract state from Partisia blockchain.
Supports various data types and provides clean interface for state reading.
"""

import requests
import json
import base64
import struct

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
            response = requests.get("https://node1.testnet.partisiablockchain.com/chain/contracts/" + address)
            response.raise_for_status()
            content = response.text
            json_data = json.loads(content)
            base64content =json_data["serializedContract"]
        self.content = base64.b64decode(base64content)

    def chopLeNumber(self, nobytes):
        result = 0
        factor = 1
        for i in range(nobytes):
            result = result + (int(self.content[i]))*factor
            factor = factor*256
        self.content = self.content[nobytes:]
        return result

    def chopHex(self, nobytes):
        result = self.content[0:nobytes].hex()
        self.content = self.content[nobytes:]
        return result

    def chopAddress(self):
        return(self.chopHex(21))
        
    def chopString(self):
        length = self.chopLeNumber(4)
        result = self.content[:length].decode("utf-8")
        self.content = self.content[length:]
        return result

    def chop(self, choptype):
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

    def deserialize(self, fieldlist):
        result = []
        for s in fieldlist:
            result = result + [self.chop(s)]
        return result
    
#s = SerializedState(address = "024056f1a19745f2b8e86e10aa5a144d6b09b641d8")
#print(s.deserialize(["String","u8","String","Address","u128"]))
