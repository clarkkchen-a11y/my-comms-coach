#!/bin/bash
# Start FastAPI Token Server in the background
uvicorn server:app --host 0.0.0.0 --port $PORT &

# Start LiveKit Agent in the foreground so the container stays alive
python agent.py start
