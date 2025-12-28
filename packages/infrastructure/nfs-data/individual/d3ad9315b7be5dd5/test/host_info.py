import socket

hostname = socket.gethostname()
try:
    ip_address = socket.gethostbyname(hostname)
except socket.gaierror:
    ip_address = "127.0.0.1"
print(f"Hostname: {hostname}")
print(f"IP Address: {ip_address}")
