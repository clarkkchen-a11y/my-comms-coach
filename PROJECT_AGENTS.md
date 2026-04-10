# Project Architecture & Agents Roster

## Project Overview
**My Comms Coach** - An AI-powered communication coach for non-native English speakers working in Australian businesses. 

## Active Skills & Workflows
The following skills have been evaluated against `~/.gemini/antigravity/skills/awesome-library/CATALOG.md` and activated via semantic linking in the `.agents/skills` folder.

- **@brainstorming**: Activated for initial planning, feature reasoning, and design validation.
- **@architecture**: Activated to handle requirements analysis, and trade-off evaluation.
- **@code-reviewer**: Activated for standard logic review and quality control.
- **@lint-and-validate**: Activated to strictly ensure error-free code before every commit.
- **@doc-coauthoring**: Activated for maintaining internal project documentation and Phase transitions.

## Current Project Phase
**Phase 2: Post-MVP Feature Iteration & Specialized AI Practice**
Focusing on refining the AI functionality and implementing user-submitted persistent custom scenarios. 

*Upcoming Feature Priorities:*
- **Custom Scenarios**: Supporting natively submitted, persistent scenarios in the database.
- **Targeted Target-Practice**: Advanced post-session evaluations analyzing specific mechanics (Pronunciation, Idiomatic Phrasing, Nativeness, Fluency). The system will generate separated, targeted exercises specifically honing out weaknesses for smooth, intuitive flow. 

## Future Considerations / Technical Debt
- **Self-Hosting LiveKit**: Investigate migrating from LiveKit Cloud free tier to a self-hosted Open Source LiveKit server to handle scale and reduce dependency on proprietary SaaS.
