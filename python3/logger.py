import os
from datetime import datetime
import pytz

def get_current_datetime_in_denmark():
    denmark_timezone = pytz.timezone("Europe/Copenhagen")
    denmark_time = datetime.now(denmark_timezone)
    formatted_time = denmark_time.strftime("%d/%m/%y, %H:%M:%S")
    return formatted_time

class Logger:
    def __init__(self, log_file):
        self.log_file = log_file
        if not os.path.exists(log_file):
            with open(log_file, 'w') as file:
                pass

    def print(self, message):
        if isinstance(message, bytes):
            message = message.decode("utf-8")
        with open(self.log_file, 'a') as file:
            file.write(get_current_datetime_in_denmark()+ ": " + str(message) + '\n\n')

