import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

from livekit.agents.voice import Agent
from livekit.plugins import google

async def main():
    try:
        model = google.realtime.RealtimeModel(
            model="models/gemini-2.0-flash-exp"
        )
        agent = Agent(
            llm=model,
            instructions="Hello World"
        )
        print("Initialization successful")
    except Exception as e:
        print(f"FAILED: {e}")

asyncio.run(main())
