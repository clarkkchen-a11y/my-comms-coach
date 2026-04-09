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
async def get_token(room: str = "my-comms-room", participantName: str = "qa_user", voice: str = "Aoede", min_speech_duration: float = 0.05, min_silence_duration: float = 0.55):
    """
    Generate a secure LiveKit connection token for the frontend.
    """
    if not os.getenv("LIVEKIT_API_KEY") or not os.getenv("LIVEKIT_API_SECRET"):
        raise HTTPException(status_code=500, detail="LiveKit keys missing in environment")

    import json
    metadata = json.dumps({
        "voice": voice,
        "min_speech_duration": min_speech_duration,
        "min_silence_duration": min_silence_duration
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
