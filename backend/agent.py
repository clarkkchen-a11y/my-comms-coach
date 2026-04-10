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

    @llm.function_tool(description="Save the final feedback summary, actionable tips, MECE scores, and a targeted follow-up scenario at the end of the session.")
    async def save_session_feedback(
        self,
        summary: Annotated[str, "A 2-3 sentence summary of the scenario outcome and user's overall performance."],
        tip1: Annotated[str, "The first actionable constructive tip, following the sandwich feedback structure."],
        tip2: Annotated[str, "The second actionable constructive tip."],
        nativeness_score: Annotated[int, "Score 0-100 indicating how natural and idiomatic their phrasing was. Priority focus."],
        fluency_score: Annotated[int, "Score 0-100 indicating pacing, rhythm, and lack of hesitation."],
        pronunciation_score: Annotated[int, "Score 0-100 indicating physical clarity of articulation and accent mechanics."],
        pragmatic_score: Annotated[int, "Score 0-100 indicating how effectively they achieved the practical goal (e.g. diplomacy)."],
        suggested_practice_scenario: Annotated[str, "CRITICAL: Identify the absolute worst sentence or expression the user used in this session. Return a string containing exactly what they said wrong, and what the natural/native-English way to say it should be. This fuels their next Shadowing exercise."]
    ):
        print(f"[{datetime.utcnow()}] Saving feedback for {self.uid} on scenario {self.scenario_id}")
        if self.uid and self.uid.strip():
            doc_ref = db.collection("users").document(self.uid).collection("sessions").document()
            doc_ref.set({
                "scenario_id": self.scenario_id,
                "summary": summary,
                "tips": [tip1, tip2],
                "nativeness_score": nativeness_score,
                "fluency_score": fluency_score,
                "pronunciation_score": pronunciation_score,
                "pragmatic_score": pragmatic_score,
                "suggested_practice_scenario": suggested_practice_scenario,
                "timestamp": datetime.utcnow()
            })
            print(f"[{datetime.utcnow()}] Feedback saved successfully to Firestore.")
        return "Feedback saved successfully. You may now inform the user that their feedback has been saved."

    @llm.function_tool(description="Save the final feedback and single score at the end of a targeted practice session.")
    async def save_targeted_feedback(
        self,
        summary: Annotated[str, "A 1-2 sentence summary of their targeted practice performance."],
        targeted_metric: Annotated[str, "The specific metric being trained (e.g., 'Nativeness' or 'Pronunciation')."],
        score: Annotated[int, "Score 0-100 indicating their mastery of this specific targeted exercise."],
    ):
        print(f"[{datetime.utcnow()}] Saving targeted feedback for {self.uid}")
        if self.uid and self.uid.strip():
            doc_ref = db.collection("users").document(self.uid).collection("sessions").document()
            doc_ref.set({
                "scenario_id": self.scenario_id,
                "summary": summary,
                "targeted_metric": targeted_metric,
                "targeted_score": score,
                "is_targeted_practice": True,
                "timestamp": datetime.utcnow()
            })
            print(f"[{datetime.utcnow()}] Targeted feedback saved successfully.")
        return "Feedback saved. Ask if they want to repeat the shadowing or exit."

server = AgentServer()

@server.rtc_session(agent_name="taylor")
async def taylor_session(ctx: agents.JobContext):
    chosen_voice = "Aoede"
    mic_sensitivity = "high"
    silence_duration_ms = 1000
    uid = ""
    scenario_id = "1"
    custom_scenario_text = ""
    is_targeted_practice = False

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
                custom_scenario_text = meta.get("custom_scenario_text", custom_scenario_text)
                is_targeted_practice = str(meta.get("is_targeted_practice", "false")).lower() == "true"
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
    
    if scenario_id == "custom" and custom_scenario_text:
        current_scenario_text = f"Custom Scenario created by the user: '{custom_scenario_text}'"
    else:
        current_scenario_text = scenario_contexts.get(scenario_id, scenario_contexts["1"])

    if is_targeted_practice:
        system_instruction = f"""
<persona>
You are Taylor, an elite conversational vocal coach for non-native English speakers.
Tone: Conversational, idiomatic, and highly natural. Adjust formality based on the specific scenario, but lean towards authentic real-world workplace conversation.
</persona>

<scenario>
The user is returning for a "Shadowing" session to correct a specific poorly phrased or unnatural expression they used in their previous session. 
Here is their specific mistake and the context:
"{current_scenario_text}"
</scenario>

<instructions>
1. GREETING: Welcome them back. Briefly remind them of the exact expression they struggled with in the last session.
2. MODELING: Speak the highly idiomatic, natural, correct English sentence that they *should* have used in that situation.
3. SHADOWING: Ask the user to repeat this exact native-style sentence back to you.
4. EVALUATION: When they repeat, give immediate conversational micro-feedback on their pronunciation or delivery.
5. REPETITION: Have them repeat the exact same corrected sentence again until they sound completely natural and confident (up to 3 times total).
6. TOOL CALLING: At the absolute end of the shadowing exercise, CALL THE TOOL `save_targeted_feedback` with the summary, the metric name ("Nativeness"), and a final score out of 100 based entirely on their shadowing performance today.
7. CONCLUSION: Ask them if they'd like to practice another phrase or conclude.
</instructions>
"""
    else:
        system_instruction = f"""
<persona>
You are Taylor, a Senior QA Mentor in the Australian furniture industry.
Your role is to coach non-native English speakers working as Quality Assurance (QA) Officers.
Tone: Supportive, clear, professional, and encouraging, using an accessible vocabulary.
</persona>

<scenario>
The user has chosen to practice the following scenario:
"{current_scenario_text}"
</scenario>

<instructions>
1. GREETING: Begin by warmly greeting the user and setting up the scenario. Let them know you're playing the counterpart in this scenario.
2. ROLEPLAY: Engage in the roleplay realistically. Subtly monitor their fluency, tone, and vocabulary.
3. EVALUATION: When the context concludes, stop the roleplay. Silently calculate 4 MECE categories:
   - Nativeness (Vocabulary, idiomatic expressions, natural phrasing) [PRIORITY 1]
   - Fluency (Speed, rhythm, minimal hesitation)
   - Pronunciation (Clear articulations, vowel sounds)
   - Pragmatics (Was the communication goal met diplomatically and effectively?)
4. "SANDWICH" FEEDBACK: Provide a bright, encouraging summary and 2 specific tips. Conclude by designing a heavily tailored `suggested_practice_scenario` isolating their weakest MECE domain.
5. TOOL CALLING: Right before the end of the session, CALL THE TOOL `save_session_feedback` with the summary, tips, 4 numeric scores (0-100), and the follow-up scenario string.
6. REPLAY LOOP: After saving, ask the user if they'd like to try their new targeted practice right now, or repeat the original scenario.
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
