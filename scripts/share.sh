#!/usr/bin/env bash
# Start a Cloudflare quick-tunnel so you can open the app on your phone over HTTPS.
# If the presentation slides sit alongside this repo, also bake the URL in for the
# slide-18 QR codes. Runs until you press Ctrl-C.
#
#   (terminal 1)  npm run dev
#   (terminal 2)  npm run share

# Optional: where the slides live (only present in the full session setup).
SLIDES_DIR="$(cd "$(dirname "$0")/../../slides" 2>/dev/null && pwd || true)"
TMP="$(mktemp)"

bake() { [ -n "$SLIDES_DIR" ] && printf '{"url":"%s"}\n' "$1" > "$SLIDES_DIR/tunnel.json"; }

echo "Starting tunnel to http://localhost:5173 …"
npx --yes cloudflared tunnel --url http://localhost:5173 > "$TMP" 2>&1 &
CF_PID=$!

trap 'kill $CF_PID 2>/dev/null; bake ""; echo; echo "Tunnel stopped."; exit 0' INT TERM

URL=""
for i in $(seq 1 90); do
  URL=$(grep -oE 'https://[a-z0-9.-]+\.trycloudflare\.com' "$TMP" | head -1)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Tunnel failed to start. Output:"; tail -20 "$TMP"; kill "$CF_PID" 2>/dev/null; exit 1
fi

bake "$URL"
echo ""
echo "  ✓ Tunnel ready:  $URL"
echo "      App:    $URL/"
echo "      Camera: $URL/camera-test.html"
[ -n "$SLIDES_DIR" ] && echo "  ✓ Baked into slides/tunnel.json — reload the deck for the slide-18 QRs."
echo "  (Ctrl-C to stop.)"
wait "$CF_PID"
