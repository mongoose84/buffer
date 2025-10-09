from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

# Enable CORS (same as app.use(cors()))
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Internal JSON endpoint
@app.post("/internal")
async def internal_api(request: Request):
    data = await request.json()
    # Example logic for your internal API
    return {"received": data, "message": "Internal API OK"}

# Proxy endpoint
@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy(request: Request, path: str):
    # Preserve query parameters
    query_string = request.url.query
    target_url = f"http://10.42.0.1/{path}"
    if query_string:
        target_url += f"?{query_string}"

    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        resp = await client.request(
            method=request.method,
            url=target_url,
            headers=headers,
            content=body
        )

    # Copy headers but remove problematic ones
    response_headers = dict(resp.headers)
    response_headers.pop("content-encoding", None)
    response_headers.pop("transfer-encoding", None)
    response_headers.pop("content-length", None)

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=response_headers
    )


# Run with: uvicorn main:app --host 0.0.0.0 --port 4000
