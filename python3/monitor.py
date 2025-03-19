import tkinter as tk
import json
import os
import time
import threading
import base64
import struct
import requests

def extract_rust_struct(value_bytes):
    if len(value_bytes) < 24:
        raise ValueError("Value bytes are too short to contain a u128 and u64.")
    low, high = struct.unpack('<QQ', value_bytes[:16])  # u128 split into two u6
    u64 = struct.unpack('<Q', value_bytes[16:24])[0]   # u64
    u128 = (high << 64) | low
    return u128, u64

def fetch_and_parse_webpage(url):
    try:
        # Fetch the webpage content
        response = requests.get(url)
        response.raise_for_status()
        content = response.text
        
        # Parse the content as JSON
        json_data = json.loads(content)
        
        # Convert keys and values to byte arrays
        value_list = [
            base64.b64decode(item['value']) for item in json_data
        ]
        
        return value_list
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        return None
    except (ValueError, KeyError) as e:
        print(f"Data processing error: {e}")
        return None

def render_bids_asks(address):
        bids_url = "https://node1.testnet.partisiablockchain.com/chain/contracts/"+address+"/avl/2/next?n=10"
        result = fetch_and_parse_webpage(bids_url)
        bids_list = [extract_rust_struct(value) for value in result]
        asks_url = "https://node1.testnet.partisiablockchain.com/chain/contracts/"+address+"/avl/3/next?n=10"
        result = fetch_and_parse_webpage(asks_url)
        asks_list = [extract_rust_struct(value) for value in result]
        new_ask_list = [(f"{float(amount)/100:.2f}", f"{float(price)/1000:.3f}") for (amount,price) in asks_list]
        new_bid_list = [(f"{float(amount)/100:.2f}", f"{float(price)/1000:.3f}") for (amount,price) in bids_list]
        new_ask_list.reverse()
        ask_string = "¤n  ASKS:"
        for (a,b) in new_ask_list:
            ask_string = ask_string + "¤n " + a + " @ " + b
        bid_string = "  BIDS:"
        for (a,b) in new_bid_list:
            bid_string = bid_string + "¤n " + a + " @ " + b
        return "¤r"+ask_string+"¤n¤n¤g"+bid_string
    
# Define color codes for ctext
COLOR_MAP = {
    '¤b': 'black',
    '¤r': 'red',
    '¤u': 'blue',
    '¤y': 'yellow',
    '¤g': 'green',
    '¤c': 'cyan',
}
DEFAULT_COLOR = 'black'

data_file = "windows.data"
windows = {}

def generate_composite_key(item):
    return f"{item['window_title']}::{item['rendering_function']}::{item['args_to_rendering_function']}"

class MonitorWindow:
    def __init__(self, root, title, render_function, args):
        self.root = root
        self.title = title
        self.render_function = render_function
        self.args = args
        self.last_content = None

        self.window = tk.Toplevel(root)
        self.window.title(title)
        self.text_widget = tk.Text(self.window, bg="white", wrap=tk.WORD, font=("Helvetica", 16))
        self.text_widget.pack(expand=True, fill=tk.BOTH)
        self.window.protocol("WM_DELETE_WINDOW", self.on_close)

    def update_content(self, content):
        if content != self.last_content:
            self.last_content = content
            self.render_ctext(content)

    def render_ctext(self, ctext):
        self.text_widget.delete("1.0", tk.END)

        color = DEFAULT_COLOR
        for part in ctext.split("¤n"):
            while len(part) > 0:
                if part[:2] in COLOR_MAP:
                    color = COLOR_MAP[part[:2]]
                    part = part[2:]
                else:
                    self.text_widget.insert(tk.END, part[0], (color,))
                    part = part[1:]
            self.text_widget.insert(tk.END, "\n")

        for c in COLOR_MAP.values():
            self.text_widget.tag_configure(c, foreground=c)

    def on_close(self):
        global windows
        key = generate_composite_key({"window_title": self.title, "rendering_function": self.render_function, "args_to_rendering_function": self.args})
        if key in windows:
            del windows[key]
            update_windows_data_file()
        self.window.destroy()

    def destroy(self):
        self.window.destroy()

def load_windows_data():
    if not os.path.exists(data_file):
        return []
    try:
        with open(data_file, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {data_file}: {e}")
        return []

def update_windows_data_file():
    global windows
    data = [
        {"window_title": w.title, "rendering_function": w.render_function, "args_to_rendering_function": w.args}
        for w in windows.values()
    ]
    try:
        with open(data_file, "w") as f:
            json.dump(data, f, indent=4)
    except IOError as e:
        print(f"Error writing {data_file}: {e}")

def monitor_webpages():
    global windows

    while True:
        data = load_windows_data()
        active_keys = set(windows.keys())
        desired_keys = {generate_composite_key(item) for item in data}

        # Close windows no longer in data
        for key in active_keys - desired_keys:
            if key in windows:
                windows[key].destroy()
                del windows[key]

        # Open new windows and update existing ones
        for item in data:
            key = generate_composite_key(item)
            title = item["window_title"]
            render_function = item["rendering_function"]
            args = item["args_to_rendering_function"]

            if key not in windows:
                windows[key] = MonitorWindow(root, title, render_function, args)

            # Invoke the render function dynamically
            rendered_ctext = eval(render_function)(*args)
            windows[key].update_content(rendered_ctext)

        time.sleep(2)

def sample_render_function(url):
    # Example rendering function that fetches a webpage and processes it
    import requests
    try:
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        content = response.text
        return f"¤bFetched content:¤n¤r{content[:50]}"
    except requests.RequestException as e:
        return f"¤rError fetching URL: {e}"

if __name__ == "__main__":
    root = tk.Tk()
    root.withdraw()  # Hide the root window

    # Start monitoring in a separate thread
    monitor_thread = threading.Thread(target=monitor_webpages, daemon=True)
    monitor_thread.start()

    # Main event loop
    try:
        root.mainloop()
    except KeyboardInterrupt:
        print("Exiting...")
