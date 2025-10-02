# buffer
Circular buffer demo
#### Client

npm install

Chart.js + React wrapper
npm install chart.js@^4 react-chartjs-2@^5

WebSocket client for Node (only needed if you ever run the same code in a Node env)
In the browser the native WebSocket is used automatically.
npm install ws   # optional, harmless in a CRA project

#### Server

cd server

python3 -m venv venv      # creates a folder named “venv”
source venv/bin/activate  # macOS / Linux / zsh
# Windows PowerShell:
# .\venv\Scripts\Activate.ps1

pip install fastapi uvicorn websockets
