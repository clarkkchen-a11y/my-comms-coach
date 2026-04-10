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

# ----- FIREBASE INIT -----
cred = credentials.Certificate("my-comms-coach-firebase-adminsdk-fbsvc-5c191af4c1.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

from typing import Annotated
from datetime import datetime
from livekit.agents import llm

class CoachTools(llm.Toolset):
    def __init__(self, uid: str, scenario_id: str):
        super().__init__(id="coach_tools", tools=[])
        self.uid = uid
        self.scenario_id = scenario_id

    @llm.function_tool(description="Save the final feedback summary and actionable tips at the end of the session.")
    async def save_session_feedback(
        self,
        summary: Annotated[str, "A 2-3 sentence summary of the scenario outcome and user's overall performance."],
        tip1: Annotated[str, "The first actionable constructive tip, following the sandwich feedback structure."],
        tip2: Annotated[str, "The second actionable constructive tip."],
    ):
        print(f"[{datetime.utcnow()}] Saving feedback for {self.uid} on scenario {self.scenario_id}")
        if self.uid and self.uid.strip():
            doc_ref = db.collection("users").document(self.uid).collection("sessions").document()
            doc_ref.set({
                "scenario_id": self.scenario_id,
                "summary": summary,
                "tips": [tip1, tip2],
                "timestamp": datetime.utcnow()
            })
            print(f"[{datetime.utcnow()}] Feedback saved successfully to Firestore.")
        return "Feedback saved successfully. You may now inform the user that their feedback has been saved to their dashboard, and ask if they'd like to retry the scenario to improve."

server = AgentServer()

@server.rtc_session(agent_name="taylor")
async def taylor_session(ctx: agents.JobContext):
    chosen_voice = "Aoede"
    mic_sensitivity = "high"
    silence_duration_ms = 1000
    uid = ""
    scenario_id = "1"

    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY)

    for p in ctx.room.remote_participants.values():
        if p.metadata:
            try:
                meta = json.loads(p.metadata)
                chosen_voice = meta.get("voice", chosen_voice)
                mic_sensitivity = meta.get("mic_sensitivity", mic_sensitivity)
                silence_duration_ms = int(meta.get("silence_duration_ms", silence_duration_ms))
                uid = meta.get("uid", uid)
                scenario_id = str(meta.get("scenario_id", scenario_id))
            except Exception:
                pass

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

    # Dynamic Scenario Context Mapping
    scenario_contexts = {
        "1": "The Loading Dock: Chitchat with the warehouse manager. Build social confidence using casual greetings.",
        "2": "The Visual Inspection: Describing a scratch on a timber sideboard. Practice using descriptive adjectives.",
        "3": "The Assembly Guide: Explaining to a customer how to fix a wobbly chair leg. Clear, step-by-step instructional English.",
        "4": "The Supplier Push-back: Telling a supplier that 10% of the sofas have 'stitching defects'. Diplomatic but firm technical English."
    }
    
    current_scenario_text = scenario_contexts.get(scenario_id, scenario_contexts["1"])

    system_instruction = f"""
<persona>
You are Lumina, a Senior QA Mentor in the Australian furniture industry.
Your role is to coach non-native English speakers working as Quality Assurance (QA) Officers.
Tone: Supportive, clear, professional, and encouraging, using an accessible vocabulary.
</persona>

<scenario>
The user has chosen to practice the following scenario:
"{current_scenario_text}"
</scenario>

<instructions>
1. GREETING: Begin by warmly greeting the user and setting up the scenario. Let them know you're playing the counterpart in this scenario (e.g., the warehouse manager, the customer).
2. ROLEPLAY: Engage in the roleplay realistically. Subtly monitor their fluency, tone, and vocabulary.
3. EVALUATION: When the conversation naturally concludes, or after a few turns, stop the roleplay and provide evaluation.
4. "SANDWICH" FEEDBACK: Use the "Sandwich" structure. 
    a. Point out what they did well (Positive). 
    b. Give them 2 actionable, specific constructive tips for improvement (Constructive). 
    c. End with encouraging words (Positive).
5. TOOL CALLING: Right before the end of the session, CALL THE TOOL `save_session_feedback` with the summary and your 2 tips. This is mandatory so the user's progress is saved!
6. REPLAY LOOP: After saving the feedback, ask the user if they want to repeat the scenario right away to practice applying your tips, or if they are done. If they want to repeat, start the roleplay again from the top, bearing in mind their previous errors to see if they improved.
</instructions>
"""

    session = AgentSession(
        llm=google.realtime.RealtimeModel(
            model="gemini-3.1-flash-live-preview",
            voice=chosen_voice,
            realtime_input_config=realtime_input_config,
        ),
    )

    agent = agents.Agent(
        instructions=system_instruction,
        tools=[CoachTools(uid, scenario_id)]
    )

    await session.start(
        room=ctx.room,
        agent=agent,
    )

    await session.generate_reply(
        instructions=(
            "Welcome the user to the coaching session, announce the chosen scenario briefly, "
            "and kick off the roleplay."
        )
    )

if __name__ == "__main__":
    agents.cli.run_app(server)
