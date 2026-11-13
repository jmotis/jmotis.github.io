#!/bin/bash
# Double-click to play. Serves this folder on your own computer only (the game needs that to load
# the map into the graphics card) and opens it in your browser. Close this Terminal window to stop.
cd "$(dirname "$0")" || exit 1
PORT=8767
( sleep 1; open "http://localhost:$PORT/index.html" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
