import asyncio
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.DEBUG)

from livekit.plugins import google
from livekit.agents.voice.agent_session import AgentSession

async def run():
    model = google.realtime.RealtimeModel(model="gemini-2.5-flash-native-audio-preview-12-2025")
    # I can't start AgentSession without a Room... Let's just create it.
    session = AgentSession(llm=model)
    print("Session created:", session)

asyncio.run(run())
