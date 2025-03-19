import json
import os

class WindowsUpdater:
    def __init__(self, data_file="windows.data"):
        self.data_file = data_file
        if not os.path.exists(self.data_file):
            with open(self.data_file, "w") as f:
                json.dump([], f)

    def _load_data(self):
        try:
            with open(self.data_file, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading {self.data_file}: {e}")
            return []

    def _save_data(self, data):
        try:
            with open(self.data_file, "w") as f:
                json.dump(data, f, indent=4)
        except IOError as e:
            print(f"Error writing {self.data_file}: {e}")

    def add_window(self, window_title, rendering_function, args_to_rendering_function):
        """
        Adds a new window entry to the windows.data file if it doesn't already exist.
        """
        data = self._load_data()
        new_entry = {
            "window_title": window_title,
            "rendering_function": rendering_function,
            "args_to_rendering_function": args_to_rendering_function,
        }
        if new_entry not in data:
            data.append(new_entry)
            self._save_data(data)
            print(f"Added window: {new_entry}")
        else:
            print(f"Window already exists: {new_entry}")

    def remove_window(self, window_title=None, rendering_function=None, args_to_rendering_function=None):
        """
        Removes windows matching the specified criteria (any combination of the arguments).
        """
        data = self._load_data()
        original_length = len(data)

        def matches(entry):
            return ((window_title is None or entry["window_title"] == window_title) and
                    (rendering_function is None or entry["rendering_function"] == rendering_function) and
                    (args_to_rendering_function is None or entry["args_to_rendering_function"] == args_to_rendering_function))

        data = [entry for entry in data if not matches(entry)]
        if len(data) < original_length:
            self._save_data(data)
            print("Removed matching windows.")
        else:
            print("No matching windows found to remove.")

# Example usage
if __name__ == "__main__":
    updater = WindowsUpdater()

    # Add windows
    updater.add_window("Example Window", "sample_render_function", ["https://example.com"])
    updater.add_window("Another Window", "sample_render_function", ["https://example2.com"])

    # Remove specific window
    updater.remove_window(window_title="Example Window", rendering_function="sample_render_function")

    # Remove all windows with a specific rendering function
    updater.remove_window(rendering_function="sample_render_function")

    # Remove all windows matching a set of arguments
    updater.remove_window(args_to_rendering_function=["https://example2.com"])
