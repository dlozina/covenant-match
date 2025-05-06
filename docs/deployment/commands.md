# Commands

## Kill a process
Vscode debug process is running on port 8080, we have an issue with it and need to kill it.
# Find the process ID
sudo lsof -i :8080

# Kill the process using the PID
sudo kill <PID>

# Or more forcefully if needed
sudo kill -9 <PID>