from dotenv import load_dotenv

load_dotenv()

from livekit import agents
from livekit.agents import AgentServer, AgentSession, Agent
from livekit.plugins import google, silero
import firebase_admin
from firebase_admin import credentials, firestore

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


# No agent_name = automatic dispatch (agent joins every room automatically)
@server.rtc_session
async def taylor_session(ctx: agents.JobContext):
    # Parse requested voice from participant metadata
    chosen_voice = "Aoede"
    import json
    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                meta = json.loads(p.metadata)
                if "voice" in meta:
                    chosen_voice = meta["voice"]
            except Exception as e:
                pass

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-2.5-flash-native-audio-latest",
            voice=chosen_voice,
        ),
        vad=silero.VAD.load(),
    )

    await session.start(
        room=ctx.room,
        agent=Taylor(),
    )

    await session.generate_reply(
        instructions="Greet the user warmly, state your role as a communication coach, and ask what workplace scenario they would like to practice today."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
