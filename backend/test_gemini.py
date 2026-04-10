import asyncio
from dotenv import load_dotenv
load_dotenv()
from livekit.plugins import google

async def main():
    model = google.realtime.RealtimeModel(
        model="gemini-2.5-flash-native-audio-preview-12-2025"
    )
    session = model.session()
    print("Session created. Connecting...")
    try:
        # Create a tiny task that cancels it if it takes >10s
        async def do_connect():
            await session._ensure_session()
            print("Connected!")
        await asyncio.wait_for(do_connect(), timeout=10)
    except Exception as e:
        print("EXCEPTION:", type(e), e)
    
asyncio.run(main())
