#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
website_ai.py - SS Assist LOCAL launcher (no external AI, stdlib only)
======================================================================
Wraps the EXISTING knowledge engine  website_ai/ss_ai_assist.py .
That file is the source of truth; it is imported UNCHANGED and keeps
all SS Assist knowledge/logic.  No OpenAI/Gemini/Claude/Grok, no
internet search, no pip installs (Python standard library only).

Modes
-----
  Terminal (original behaviour):
      python website_ai.py
  Local HTTP server (for the website / VS Code Live Server):
      python website_ai.py --server          (default port 8765)
      python website_ai.py --server --port 9000

Endpoint
--------
  POST http://127.0.0.1:8765/chat
  body {"message": "your question"}   (alias: /api/chat, also
  accepts {"question": ...} or {"text": ...})
  -> {"ok": true, "answer": "...", "result": <ask_ai() result>,
      "endpoint": "/chat", "question": "..."}
"""
import json
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
ENGINE_DIR = ROOT / "website_ai"

# --- import the existing engine (source of truth, never modified) ---
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))
import ss_ai_assist as engine  # noqa: E402  (existing local knowledge engine)

DEFAULT_PORT = 8765
CHAT_PATHS = ("/chat", "/api/chat")


class AssistHandler(SimpleHTTPRequestHandler):
    """Static site files + JSON chat endpoint -> ss_ai_assist.ask_ai()."""

    server_version = "SSAssistLocal/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    # ---- local CORS so VS Code Live Server (any port) can call us ----
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_OPTIONS(self):  # CORS preflight (must never be 501/404)
        self.send_response(204)
        self.end_headers()
        print("  [cors] 204 preflight -> " + self.path, flush=True)

    def do_POST(self):
        path = urlparse(self.path).path
        if path not in CHAT_PATHS:
            self._json(404, {"ok": False, "error": "unknown endpoint",
                             "use": list(CHAT_PATHS)})
            return
        try:
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            payload = json.loads(raw or "{}")
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"ok": False, "error": "invalid JSON body"})
            return
        question = (payload.get("message") or payload.get("question")
                    or payload.get("text") or "").strip()
        if not question:
            self._json(400, {"ok": False,
                             "error": "missing question: {\"message\": \"...\"}"})
            return

        t0 = time.time()
        result = engine.ask_ai(question)   # <-- existing SS Assist brain
        ms = int((time.time() - t0) * 1000)
        self._json(200, {"ok": True, "endpoint": path, "question": question,
                         "answer": result.get("answer", ""), "result": result})
        print("  [chat] POST %s -> 200 (%dms) | Q: %s"
              % (path, ms, question[:70]), flush=True)

    def _json(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            pass

    # visible request/error logging - nothing hidden
    def log_message(self, fmt, *args):
        print("  [http] " + (fmt % args), flush=True)

    def log_error(self, fmt, *args):
        print("  [http ERROR] " + (fmt % args), flush=True)


def run_server(port):
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), AssistHandler)
    except OSError as exc:
        print("ERROR: cannot listen on 127.0.0.1:%d -> %s" % (port, exc))
        print("Is something else already running on that port "
              "(e.g. a bare 'python -m http.server')? Stop it first.")
        sys.exit(1)
    print("=" * 62, flush=True)
    print("  SS Assist LOCAL server  (Python stdlib only, no external AI)",
          flush=True)
    print("  Engine  : website_ai/ss_ai_assist.py  (ask_ai, unchanged)",
          flush=True)
    print("  Endpoint: POST http://127.0.0.1:%d/chat" % port, flush=True)
    print("  Alias   : POST http://127.0.0.1:%d/api/chat" % port, flush=True)
    print("  Site    : http://127.0.0.1:%d/" % port, flush=True)
    print("  Stop    : Ctrl+C", flush=True)
    print("=" * 62, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.", flush=True)
    finally:
        server.server_close()


def run_terminal():
    engine.run_terminal()          # original terminal chat, unchanged
    try:
        input("\nBand karne ke liye Enter dabayein...")
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    argv = sys.argv[1:]
    if "--server" in argv or "-s" in argv:
        port = DEFAULT_PORT
        if "--port" in argv:
            port = int(argv[argv.index("--port") + 1])
        run_server(port)
    else:
        run_terminal()
