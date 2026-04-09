import os
import asyncio
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.multimodal import MultimodalAgent
from livekit.plugins import google
import firebase_admin
from firebase_admin import credentials, firestore

# ----- FIREBASE INIT -----
cred = credentials.Certificate("my-comms-coach-firebase-adminsdk-fbsvc-5c191af4c1.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

async def entrypoint(ctx: JobContext):
    """
    Entrypoint for the My Comms Coach Voice Agent.
    Runs whenever a user connects to the WebRTC Room.
    """
    
    # 1. Connect to the LiveKit Room (auto-subscribing to audio tracks)
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    
    # 2. Identify the Participant (passed from the frontend)
    participant_identity = ctx.participant.identity
    print(f"Connecting Agent for User: {participant_identity}")

    # 3. Simulate fetching user progress from Firebase
    # user_ref = db.collection("users").document(participant_identity)
    # user_doc = user_ref.get()
    current_level = 1

    # 4. Define the System Prompt based on user progress
    if current_level == 1:
        instructions = (
            "You are a friendly Australian colleague named Lumina working at a Sydney-based furniture e-commerce company. "
            "You are chatting near the loading dock. Have a casual conversation about the recent shipment. "
            "Evaluate their English subtly. At the end of the conversation, give them 2 tips to improve their pronunciation or grammar."
        )
    else:
        instructions = (
            "You are a strict supplier from overseas. The user is a QA officer complaining about tanning defects in the latest "
            "leather sofa shipment. Push back firmly."
        )

    # 5. Initialize the Gemini Multimodal Voice Model
    model = google.beta.llm.LLM(
        model="gemini-2.0-flash-exp", 
        # Using 2.0-flash-exp (or whichever equivalent the SDK currently maps the Live API to)
    )

    # 6. Initialize the Agent
    agent = MultimodalAgent(
        model=model,
    )
    
    # Configure context/instructions and start
    chat_ctx = llm.ChatContext()
    chat_ctx.append(text=instructions, role="system")
    
    agent.start(ctx.room)
    agent.generate_reply(chat_ctx)

    print("Agent is actively listening and speaking...")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
