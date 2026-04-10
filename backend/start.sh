#!/bin/bash
# Start FastAPI Token Server in the background
uvicorn server:app --host 0.0.0.0 --port $PORT &

# Start LiveKit Agent with auto-restart loop (keeps agent alive if it crashes)
while true; do
    echo "Starting LiveKit agent..."
    python agent.py start
    echo "Agent exited with code $?. Restarting in 3 seconds..."
    sleep 3
done
