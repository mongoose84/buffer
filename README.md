# buffer
Circular buffer demo
#### Client

npm install



WebSocket client for Node (only needed if you ever run the same code in a Node env)
In the browser the native WebSocket is used automatically.

Run client
npm start

#### Server

Windows
install python from https://www.python.org/downloads/

cd server

python3 -m venv venv      # creates a folder named “venv”
source venv/bin/activate  # macOS / Linux / zsh
# Windows PowerShell:
# .\venv\Scripts\Activate.ps1

pip install fastapi uvicorn websockets


Run server

uvicorn fastapi_streamer:app --reload