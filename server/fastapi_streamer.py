# --------------------------------------------------------------
# fastapi_streamer.py   (sine‑wave version)
# --------------------------------------------------------------

import asyncio
import json
import math
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()


# ------------------------------------------------------------------
# Shared mutable state – guarded by an async lock
# ------------------------------------------------------------------
class StreamState:
    """Container for the streaming flag and the most‑recent array."""
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
# Sine‑wave generator
# ------------------------------------------------------------------
def sine_wave_generator(
    freq_hz: float = 1.0,          # cycles per second
    sample_rate: int = 50,        # how many samples per second we emit
    chunk_size: int = 10          # number of samples per WebSocket message
):
    """
    Yields successive chunks of a sine wave.

    Parameters
    ----------
    freq_hz : float
        Desired frequency of the sine wave.
    sample_rate : int
        Number of samples produced per second.
    chunk_size : int
        How many samples are bundled into each WebSocket payload.

    Yields
    ------
    List[float]
        A list of `chunk_size` consecutive sine values.
    """
    # Increment per sample (radians)
    delta = 2 * math.pi * freq_hz / sample_rate
    phase = 0.0

    while True:
        chunk = []
        for _ in range(chunk_size):
            # sin(phase) gives a value in [-1, 1]
            chunk.append(math.sin(phase))
            phase += delta
            # Keep phase bounded to avoid floating‑point overflow
            if phase > 2 * math.pi:
                phase -= 2 * math.pi
        yield chunk


# ------------------------------------------------------------------
# WebSocket endpoint – streams the sine wave
# ------------------------------------------------------------------
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    await state.set_streaming(True)

    SAMPLE_RATE = 200
    CHUNK_SIZE = 400
    incrementing = True
    freq_hz = 1.0  # Start at 1 Hz

    try:
        while True:
            # Create a new generator for the current frequency
            generator = sine_wave_generator(
                freq_hz=freq_hz,
                sample_rate=SAMPLE_RATE,
                chunk_size=CHUNK_SIZE,
            )
            float_array = next(generator)
            await state.update_array(float_array)
            payload = json.dumps({"data": float_array})
            await ws.send_text(payload)
            print(f"Sent {len(float_array)} samples at {freq_hz:.2f} Hz")

            # Increment frequency
            if incrementing:
                freq_hz += 0.1
                if freq_hz >= 10.0:
                    incrementing = False
            else:
                freq_hz -= 0.1
                if freq_hz <= 1.0:
                    incrementing = True

            await asyncio.sleep(0.1)  # Control the overall send rate

    except WebSocketDisconnect:
        await state.set_streaming(False)
        # Optionally clear the last array if you don't want stale size info:
        # await state.update_array([])


