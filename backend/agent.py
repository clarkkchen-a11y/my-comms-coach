from dotenv import load_dotenv

load_dotenv()

import json
from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent
from livekit.plugins import google
from livekit.plugins.google.realtime.api_proto import types
import firebase_admin
from firebase_admin import credentials, firestore
import logging

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("livekit.plugins.google").setLevel(logging.DEBUG)
logging.getLogger("livekit.agents").setLevel(logging.DEBUG)

# ----- FIREBASE INIT -----
cred = credentials.Certificate("my-comms-coach-firebase-adminsdk-fbsvc-5c191af4c1.json")
firebase_admin.initialize_app(cred)
db = firestore.client()


class Taylor(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are Taylor, an AI communication coach and colleague at a corporate office. "
                "You speak clearly and professionally with a helpful, encouraging tone. "
                "Engage the user in a realistic workplace scenario, such as practicing a "
                "presentation or navigating a difficult conversation. Subtly evaluate their "
                "clarity and tone. Offer exactly 2 constructive tips before ending the conversation."
            )
        )


server = AgentServer()


# agent_name="taylor" must match the name used in server.py's create_dispatch call
@server.rtc_session(agent_name="taylor")
async def taylor_session(ctx: agents.JobContext):
    # Parse voice and VAD settings from participant metadata
    chosen_voice = "Aoede"
    mic_sensitivity = "high"
    silence_duration_ms = 1000

    # Connect to the room
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                meta = json.loads(p.metadata)
                chosen_voice = meta.get("voice", chosen_voice)
                mic_sensitivity = meta.get("mic_sensitivity", mic_sensitivity)
                silence_duration_ms = int(meta.get("silence_duration_ms", silence_duration_ms))
            except Exception:
                pass

    # Map sensitivity string to API enum
    start_sensitivity = (
        types.StartSensitivity.START_SENSITIVITY_HIGH
        if mic_sensitivity == "high"
        else types.StartSensitivity.START_SENSITIVITY_LOW
    )

    realtime_input_config = types.RealtimeInputConfig(
        automatic_activity_detection=types.AutomaticActivityDetection(
            start_of_speech_sensitivity=start_sensitivity,
            silence_duration_ms=silence_duration_ms,
        )
    )

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-preview-12-2025",
            voice=chosen_voice,
            realtime_input_config=realtime_input_config,
        ),
    )

    await session.start(
        room=ctx.room,
        agent=Taylor(),
    )

    await session.generate_reply(
        instructions=(
            "Greet the user warmly, state your role as a communication coach, "
            "and ask what workplace scenario they would like to practice today."
        )
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
