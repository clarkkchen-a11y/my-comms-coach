import asyncio
from dotenv import load_dotenv
load_dotenv()
from livekit.plugins import google
import logging
logging.basicConfig(level=logging.DEBUG)

async def check():
    try:
        model = google.realtime.RealtimeModel(model="gemini-2.5-flash-native-audio-preview-12-2025")
        sess = model.session()
        print("Waiting to see if it connects...")
        await asyncio.sleep(5)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(check())
