#!/usr/bin/env python3
# ==============================================================
# SS INDUSTRIES - SS ASSIST WEB BRIDGE
# Thin HTTP transport around the EXISTING assistant engine
# (website_ai/ss_ai_assist.py). The engine is imported and used
# as-is — this file never redefines or replaces any AI logic.
#
#   Run:   python website_ai/server.py [port]
#   Site:  http://127.0.0.1:8765/
#   API:   POST /api/chat   {"message": "..."}
#          -> {"ok": true, "result": <ask_ai(...) result>}
# ==============================================================

import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent           # .../website_ai
SITE_ROOT = HERE.parent                          # .../website folder (static site)
DEFAULT_PORT = int(os.environ.get("SS_ASSIST_PORT", "8765"))
HOST = os.environ.get("SS_ASSIST_HOST", "127.0.0.1")

# Import the existing AI engine exactly where it lives (unchanged).
sys.path.insert(0, str(HERE))
import ss_ai_assist as engine  # noqa: E402


class AssistHandler(SimpleHTTPRequestHandler):
    """Static file serving + /api/chat wired to ss_ai_assist.ask_ai()."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE_ROOT), **kwargs)

    # CORS so a page opened directly from disk (file://) can reach the API.
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if urlparse(self.path).path not in ("/chat", "/api/chat"):
            self._json(404, {"ok": False, "error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length).decode("utf-8") or "{}"
            payload = json.loads(raw)
            message = str(payload.get("message", ""))
            result = engine.ask_ai(message)          # <- existing backend
            self._json(200, {"ok": True, "result": result})
        except Exception as exc:                     # keep the chat alive
            self._json(500, {"ok": False,
                             "error": "%s: %s" % (type(exc).__name__, exc)})

    def _json(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        # Quiet for static assets (450 frames!), visible for API traffic.
        if len(args) > 1 and "/api/" in str(args[1]):
            super().log_message(fmt, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    server = ThreadingHTTPServer((HOST, port), AssistHandler)
    print("=" * 58)
    print("  SS Assist web bridge")
    print("  Engine : ss_ai_assist.ask_ai (existing, unchanged)")
    print("  Site   : http://%s:%d/" % (HOST, port))
    print("  Stop   : Ctrl+C")
    print("=" * 58)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
