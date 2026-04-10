import asyncio
from livekit import agents
from typing import Annotated
from livekit.agents import llm

class CoachTools(llm.Toolset):
    def __init__(self, uid: str, scenario_id: str):
        super().__init__(id="coach_tools", tools=[])
        self.uid = uid
        self.scenario_id = scenario_id

    @llm.function_tool(description="Save the final feedback summary and actionable tips")
    def save_session_feedback(
        self,
        summary: Annotated[str, "A 2-3 sentence summary of the scenario outcome"],
        tip1: Annotated[str, "The first actionable constructive tip"],
        tip2: Annotated[str, "The second actionable constructive tip"],
    ):
        print(f"Feedback saved: {summary}")
        return "Saved"

async def test():
    tools = [CoachTools("user123", "scenario-1")]
    agent = agents.Agent(
        instructions="Hello",
        tools=tools
    )
    print("Agent tools:", agent.tools)

asyncio.run(test())
