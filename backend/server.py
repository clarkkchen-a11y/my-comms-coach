import os
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/getToken")
async def get_token(
    room: str = "my-comms-room",
    participantName: str = "qa_user",
    voice: str = "Aoede",
    mic_sensitivity: str = "high",
    silence_duration_ms: int = 1000,
):
    """
    Generate a secure LiveKit connection token for the frontend
    AND explicitly dispatch the agent to the room.
    """
    livekit_url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    if not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit keys missing in environment")

    import json
    metadata = json.dumps({
        "voice": voice,
        "mic_sensitivity": mic_sensitivity,
        "silence_duration_ms": silence_duration_ms,
    })

    # Create the access token for the frontend participant
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(participantName) \
        .with_name(participantName) \
        .with_metadata(metadata) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room
        ))

    # Explicitly dispatch the agent to the room via LiveKit API
    # This is the critical step that tells LiveKit Cloud to route a job to our worker
    try:
        lk = api.LiveKitAPI(
            url=livekit_url,
            api_key=api_key,
            api_secret=api_secret,
        )
        dispatch = await lk.agent_dispatch.create_dispatch(
            api.CreateAgentDispatchRequest(
                agent_name="taylor",
                room=room,
                metadata=metadata,
            )
        )
        await lk.aclose()
        print(f"[server] Agent dispatched: {dispatch}")
    except Exception as e:
        # Log but don't fail — the agent may still auto-dispatch in some configs
        print(f"[server] WARNING: Agent dispatch call failed: {e}")

    return {
        "accessToken": token.to_jwt(),
        "url": livekit_url,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
