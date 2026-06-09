#!/usr/bin/env bash
# Start the Cloudflare quick-tunnel, bake its URL into the slides, keep it running.
# Slide 18's "Open the app" + "Camera test" QR codes auto-load from slides/tunnel.json.
#
#   (terminal 1)  npm run dev
#   (terminal 2)  npm run share     <- this script
#   then open/reload the deck → slide 18 QRs are pre-generated.

SLIDES_JSON="$(cd "$(dirname "$0")/../../slides" && pwd)/tunnel.json"
TMP="$(mktemp)"

echo "Starting tunnel to http://localhost:5173 …"
npx --yes cloudflared tunnel --url http://localhost:5173 > "$TMP" 2>&1 &
CF_PID=$!

# reset the slide + stop the tunnel on Ctrl-C
trap 'kill $CF_PID 2>/dev/null; printf "{\"url\":\"\"}\n" > "$SLIDES_JSON"; echo; echo "Tunnel stopped, slide reset."; exit 0' INT TERM

URL=""
for i in $(seq 1 90); do
  URL=$(grep -oE 'https://[a-z0-9.-]+\.trycloudflare\.com' "$TMP" | head -1)
  [ -n "$URL" ] && break
  sleep 1
done

if [ -z "$URL" ]; then
  echo "Tunnel failed to start. Output:"; tail -20 "$TMP"; kill "$CF_PID" 2>/dev/null; exit 1
fi

printf '{"url":"%s"}\n' "$URL" > "$SLIDES_JSON"
echo ""
echo "  ✓ Tunnel ready:  $URL"
echo "  ✓ Baked into slides/tunnel.json — reload the deck; slide 18 QRs are pre-generated."
echo "      App:    $URL/"
echo "      Camera: $URL/camera-test.html"
echo "  (Ctrl-C to stop the tunnel and reset the slide.)"
wait "$CF_PID"
