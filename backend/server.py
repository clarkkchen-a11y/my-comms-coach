import os
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
    mic_sensitivity: str = "high",       # "high" = picks up voice easily, "low" = ignores background noise
    silence_duration_ms: int = 1000,     # ms of silence before AI considers you done speaking
):
    """
    Generate a secure LiveKit connection token for the frontend.
    """
    if not os.getenv("LIVEKIT_API_KEY") or not os.getenv("LIVEKIT_API_SECRET"):
        raise HTTPException(status_code=500, detail="LiveKit keys missing in environment")

    import json
    metadata = json.dumps({
        "voice": voice,
        "mic_sensitivity": mic_sensitivity,
        "silence_duration_ms": silence_duration_ms,
    })

    # Create the access token
    token = api.AccessToken(
        os.getenv("LIVEKIT_API_KEY"),
        os.getenv("LIVEKIT_API_SECRET")
    ) \
    .with_identity(participantName) \
    .with_name(participantName) \
    .with_metadata(metadata) \
    .with_grants(api.VideoGrants(
        room_join=True,
        room=room
    ))
    
    return {
        "accessToken": token.to_jwt(),
        "url": os.getenv("LIVEKIT_URL")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
