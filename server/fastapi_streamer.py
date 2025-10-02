# --------------------------------------------------------------
# fastapi_streamer.py
# --------------------------------------------------------------

import asyncio
import json
import random
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

# ------------------------------------------------------------------
# Shared mutable state – guarded by an async lock
# ------------------------------------------------------------------
class StreamState:
    """Container for the streaming flag and the most recent array."""
    def __init__(self):
        self.streaming: bool = False
        self.last_array: List[float] = []
        self._lock = asyncio.Lock()

    async def set_streaming(self, value: bool):
        async with self._lock:
            self.streaming = value

    async def update_array(self, arr: List[float]):
        async with self._lock:
            self.last_array = arr

    async def snapshot(self):
        """Return a copy of the current state."""
        async with self._lock:
            return {"streaming": self.streaming,
                    "array_size": len(self.last_array)}

state = StreamState()

# ------------------------------------------------------------------
# Pydantic model for the /status response (optional but nice)
# ------------------------------------------------------------------
class StatusResponse(BaseModel):
    streaming: bool
    array_size: int

# ------------------------------------------------------------------
# HTTP API – simple GET endpoint
# ------------------------------------------------------------------
@app.get("/status", response_model=StatusResponse)
async def get_status():
    """
    Return whether a stream is active and the size of the last array sent.
    """
    snap = await state.snapshot()
    return StatusResponse(**snap)

# ------------------------------------------------------------------
# WebSocket endpoint
# ------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    Open a WebSocket connection and start sending arrays of floats.
    While the connection lives we mark `streaming=True`.
    """
    await ws.accept()
    await state.set_streaming(True)

    try:
        while True:
            # ---- Generate or fetch the next float array ----
            # Here we just produce a random-length list of random floats.
            # Replace this block with your real data source if desired.
            array_len = random.randint(5, 15)          # any size you like
            float_array = [random.random() for _ in range(array_len)]

            # Store the latest array so /status can report its size
            await state.update_array(float_array)

            # Send the array as JSON over the socket
            payload = json.dumps({"data": float_array})
            await ws.send_text(payload)

            # Adjust the sleep interval to control the streaming rate
            await asyncio.sleep(0.5)   # 2 messages per second (example)

    except WebSocketDisconnect:
        # Client closed the socket – clean up
        await state.set_streaming(False)
        # Optionally clear the last array if you don't want stale size info:
        # await state.update_array([])

# ------------------------------------------------------------------
# Optional: a tiny HTML page for quick manual testing
# ------------------------------------------------------------------
@app.get("/", response_class=JSONResponse)
async def root():
    """
    Returns a short instruction snippet. You can point a browser to /ws
    with a WebSocket client extension, or use the /status endpoint.
    """
    return {
        "message": "FastAPI streamer running.",
        "endpoints": {
            "GET /status": "Current streaming flag + last array size",
            "WS  /ws": "WebSocket that streams arrays of floats"
        }
    }

# --------------------------------------------------------------
# To run:
#   uvicorn fastapi_streamer:app --reload
# --------------------------------------------------------------