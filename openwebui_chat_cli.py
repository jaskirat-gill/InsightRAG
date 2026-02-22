#!/usr/bin/env python3
"""
Open WebUI streaming CLI chat client with server-side chat persistence.

Usage:
  python3 scripts/openwebui_chat_cli.py --base-url http://localhost:8080 --token "$OPENWEBUI_TOKEN"
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid
from typing import Any

try:
    import requests  # type: ignore
except ModuleNotFoundError:
    requests = None


class _StdlibResponse:
    def __init__(self, raw: Any, body: bytes | None, status_code: int, streamed: bool):
        self._raw = raw
        self._body = body
        self.status_code = status_code
        self._streamed = streamed

    @property
    def ok(self) -> bool:
        return 200 <= self.status_code < 300

    @property
    def text(self) -> str:
        if self._body is None:
            self._body = self._raw.read()
        return self._body.decode("utf-8", errors="replace")

    def json(self) -> Any:
        return json.loads(self.text)

    def iter_lines(self, decode_unicode: bool = True):
        if not self._streamed:
            data = self.text if decode_unicode else self._body or b""
            for line in data.splitlines():
                yield line
            return

        try:
            while True:
                line = self._raw.readline()
                if not line:
                    break
                if decode_unicode:
                    yield line.decode("utf-8", errors="replace").rstrip("\r\n")
                else:
                    yield line.rstrip(b"\r\n")
        finally:
            self._raw.close()


class _StdlibSession:
    def __init__(self):
        self.headers: dict[str, str] = {}

    def request(self, method: str, url: str, timeout: int | float | None = None, **kwargs: Any) -> _StdlibResponse:
        stream = bool(kwargs.pop("stream", False))
        data = kwargs.pop("data", None)
        extra_headers = kwargs.pop("headers", None) or {}

        if kwargs:
            raise RuntimeError(f"Unsupported request kwargs without requests installed: {sorted(kwargs)}")

        if isinstance(data, str):
            data = data.encode("utf-8")
        elif data is not None and not isinstance(data, (bytes, bytearray)):
            raise RuntimeError("Request body must be str or bytes")

        headers = dict(self.headers)
        headers.update(extra_headers)

        req = urllib.request.Request(
            url=url,
            data=data,
            headers=headers,
            method=method.upper(),
        )

        try:
            raw = urllib.request.urlopen(req, timeout=timeout)
            if stream:
                return _StdlibResponse(raw=raw, body=None, status_code=raw.status, streamed=True)
            body = raw.read()
            raw.close()
            return _StdlibResponse(raw=None, body=body, status_code=raw.status, streamed=False)
        except urllib.error.HTTPError as err:
            body = err.read()
            return _StdlibResponse(raw=None, body=body, status_code=err.code, streamed=False)

    def get(self, url: str, timeout: int | float | None = None) -> _StdlibResponse:
        return self.request("GET", url, timeout=timeout)

DEFAULT_BASE_URL = "http://localhost:3000"
FALLBACK_BASE_URLS = [
    "http://127.0.0.1:3000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
]
DEFAULT_MCP_SERVER = "Mymcp"
DEFAULT_TOKEN = (
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjFjOTBmNjk4LTc4ZmUtNDkyZS1iYjhiLTkyODMwMjhkYmE5NiIsImV4cCI6MTc3NDE0NTYwOSwianRpIjoiOGNiYmRmOWQtOTdjMi00ZThhLWI4NDgtMWZiZWExOTM1YmUzIn0.-RLPW6ibDXsYEJgL8inBmGhOplqSJLAEhnQfmiDzfOs"
)


class OpenWebUIChatClient:
    def __init__(
        self,
        base_url: str,
        token: str,
        model: str | None = None,
        timeout: int = 120,
        mcp_server: str | None = DEFAULT_MCP_SERVER,
    ):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.model = model
        self.timeout = timeout
        self.mcp_server = mcp_server
        self.mcp_tool_id: str | None = None
        self.session = requests.Session() if requests is not None else _StdlibSession()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            }
        )

        self.chat_id: str | None = None
        self.chat: dict[str, Any] | None = None

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        resp = self.session.request(method, self._url(path), timeout=self.timeout, **kwargs)
        if not resp.ok:
            detail = None
            try:
                detail = resp.json()
            except Exception:
                detail = resp.text
            raise RuntimeError(f"{method} {path} failed ({resp.status_code}): {detail}")
        return resp

    def is_reachable(self) -> bool:
        # /health is unauthenticated and cheap; use it for endpoint probing.
        try:
            resp = self.session.get(self._url("/health"), timeout=min(self.timeout, 5))
            return resp.ok
        except Exception:
            return False

    def resolve_model(self) -> str:
        if self.model:
            return self.model

        resp = self._request("GET", "/api/models")
        data = resp.json()
        models = data["data"] if isinstance(data, dict) and "data" in data else data
        if not isinstance(models, list) or not models:
            raise RuntimeError("No models available from /api/models")

        first = models[0]
        model_id = first.get("id") if isinstance(first, dict) else None
        if not model_id:
            raise RuntimeError("Could not infer model id from /api/models response")
        self.model = model_id
        return model_id

    def resolve_mcp_tool_id(self) -> str | None:
        if not self.mcp_server:
            return None
        if self.mcp_tool_id:
            return self.mcp_tool_id
        if self.mcp_server.startswith("server:mcp:"):
            self.mcp_tool_id = self.mcp_server
            return self.mcp_tool_id

        resp = self._request("GET", "/api/v1/tools/")
        tools = resp.json()
        if not isinstance(tools, list):
            raise RuntimeError("Unexpected /api/v1/tools/ response while resolving MCP server")

        target = self.mcp_server.strip().lower()
        available: list[str] = []
        fallback: str | None = None

        for tool in tools:
            if not isinstance(tool, dict):
                continue
            tool_id = tool.get("id")
            if not isinstance(tool_id, str) or not tool_id.startswith("server:mcp:"):
                continue

            available.append(tool_id)
            name = tool.get("name")
            suffix = tool_id[len("server:mcp:") :]

            if tool_id.lower() == f"server:mcp:{target}":
                self.mcp_tool_id = tool_id
                return self.mcp_tool_id
            if isinstance(name, str) and name.strip().lower() == target:
                self.mcp_tool_id = tool_id
                return self.mcp_tool_id
            if suffix.strip().lower() == target:
                self.mcp_tool_id = tool_id
                return self.mcp_tool_id
            if fallback is None:
                fallback = tool_id

        if fallback and target == DEFAULT_MCP_SERVER.lower():
            self.mcp_tool_id = fallback
            return self.mcp_tool_id

        raise RuntimeError(
            f"MCP server '{self.mcp_server}' not found in /api/v1/tools/. "
            f"Available MCP tool ids: {available if available else '[]'}"
        )

    def create_chat(self) -> str:
        if self.chat_id is not None:
            return self.chat_id

        now = int(time.time())
        model = self.resolve_model()
        self.chat = {
            "title": "CLI Chat",
            "models": [model],
            "messages": [],
            "history": {"currentId": None, "messages": {}},
            "params": {},
            "timestamp": now,
        }

        payload = {"chat": self.chat, "folder_id": None}
        resp = self._request("POST", "/api/v1/chats/new", data=json.dumps(payload))
        created = resp.json()
        self.chat_id = created["id"]
        if "chat" in created and isinstance(created["chat"], dict):
            self.chat = created["chat"]
        return self.chat_id

    def _append_message(self, role: str, content: str, model: str | None = None) -> dict[str, Any]:
        if self.chat is None:
            raise RuntimeError("Chat not initialized")

        history = self.chat.setdefault("history", {"currentId": None, "messages": {}})
        messages_map = history.setdefault("messages", {})
        messages_list = self.chat.setdefault("messages", [])

        parent_id = history.get("currentId")
        msg_id = str(uuid.uuid4())
        message = {
            "id": msg_id,
            "parentId": parent_id,
            "childrenIds": [],
            "role": role,
            "content": content,
            "timestamp": int(time.time()),
            "done": True,
        }
        if model:
            message["model"] = model

        messages_map[msg_id] = message
        messages_list.append(message)
        history["currentId"] = msg_id

        if parent_id and parent_id in messages_map:
            parent = messages_map[parent_id]
            parent.setdefault("childrenIds", [])
            if msg_id not in parent["childrenIds"]:
                parent["childrenIds"].append(msg_id)

        return message

    def _persist_chat(self) -> None:
        if not self.chat_id or self.chat is None:
            return
        payload = {"chat": self.chat, "folder_id": None}
        self._request("POST", f"/api/v1/chats/{self.chat_id}", data=json.dumps(payload))

    def stream_reply(self, user_text: str) -> str:
        if self.chat is None:
            raise RuntimeError("Chat not initialized")
        model = self.resolve_model()
        mcp_tool_id = self.resolve_mcp_tool_id()

        user_msg = self._append_message("user", user_text)
        assistant_msg = self._append_message("assistant", "", model=model)
        self._persist_chat()

        payload = {
            "model": model,
            "stream": True,
            "chat_id": self.chat_id,
            "id": assistant_msg["id"],
            "parent_id": user_msg["id"],
            "tool_ids": [mcp_tool_id] if mcp_tool_id else None,
        }

        response = self._request(
            "POST",
            "/api/chat/completions",
            data=json.dumps(payload),
            stream=True,
        )

        reply_chunks: list[str] = []
        for raw_line in response.iter_lines(decode_unicode=True):
            if not raw_line:
                continue
            line = raw_line.strip()
            if not line.startswith("data:"):
                continue
            data_part = line[len("data:") :].strip()
            if data_part == "[DONE]":
                break
            try:
                event = json.loads(data_part)
            except json.JSONDecodeError:
                continue

            piece = ""
            choices = event.get("choices") or []
            if choices:
                choice0 = choices[0] or {}
                delta = choice0.get("delta") or {}
                if isinstance(delta.get("content"), str):
                    piece = delta["content"]
                elif isinstance(choice0.get("message"), dict) and isinstance(
                    choice0["message"].get("content"), str
                ):
                    piece = choice0["message"]["content"]

            if piece:
                reply_chunks.append(piece)
                print(piece, end="", flush=True)

        print()
        final_reply = "".join(reply_chunks)

        assistant_msg["content"] = final_reply
        assistant_msg["done"] = True
        self._persist_chat()
        return final_reply


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Open WebUI streaming CLI chat client")
    parser.add_argument(
        "--base-url",
        default=os.getenv("OPENWEBUI_BASE_URL", DEFAULT_BASE_URL),
        help="Open WebUI base URL (optional override)",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("OPENWEBUI_TOKEN", DEFAULT_TOKEN),
        help="Auth token (optional override)",
    )
    parser.add_argument(
        "--model",
        default=os.getenv("OPENWEBUI_MODEL"),
        help="Model id (optional; auto-selects first model if omitted)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="HTTP timeout in seconds (default: %(default)s)",
    )
    parser.add_argument(
        "--mcp-server",
        default=os.getenv("OPENWEBUI_MCP_SERVER", DEFAULT_MCP_SERVER),
        help="MCP server name or tool id (default: %(default)s)",
    )
    return parser.parse_args()


def resolve_base_url(preferred: str, token: str, timeout: int) -> str:
    candidates: list[str] = [preferred] + [url for url in FALLBACK_BASE_URLS if url != preferred]
    for candidate in candidates:
        probe = OpenWebUIChatClient(base_url=candidate, token=token, timeout=timeout)
        if probe.is_reachable():
            return candidate
    return preferred


def main() -> int:
    args = parse_args()
    resolved_base_url = resolve_base_url(args.base_url, args.token, args.timeout)

    client = OpenWebUIChatClient(
        base_url=resolved_base_url,
        token=args.token,
        model=args.model,
        timeout=args.timeout,
        mcp_server=args.mcp_server,
    )

    try:
        chat_id = client.create_chat()
        model = client.resolve_model()
        mcp_tool_id = client.resolve_mcp_tool_id()
        print(f"Base URL: {resolved_base_url}")
        print(f"Chat created: {chat_id}")
        print(f"Model: {model}")
        if mcp_tool_id:
            print(f"MCP tool: {mcp_tool_id}")
        print("Type your prompt and press Enter. Ctrl+C to exit.")

        while True:
            try:
                user_text = input("\nYou: ").strip()
            except EOFError:
                break
            if not user_text:
                continue
            print("Assistant: ", end="", flush=True)
            client.stream_reply(user_text)
    except KeyboardInterrupt:
        print("\nExiting.")
        return 0
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        if "Connection refused" in str(exc) or "Failed to establish a new connection" in str(exc):
            print(
                "Open WebUI does not appear to be running. Start it, then rerun "
                "`python3 scripts/openwebui_chat_cli.py`.",
                file=sys.stderr,
            )
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
