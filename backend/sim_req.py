import asyncio
from livekit import api
import sys

async def main():
    livekit_api = api.LiveKitAPI(
        "http://localhost:7880", # usually not needed if connecting locally, but wait we hit the deployed backend for token!
        "devkey",
        "secret"
    )
    # wait no, let me just fetch token from my cloud run backend and then use it.
