import os
import json
from typing import Any, Dict
from pathlib import Path

from anthropic import Anthropic
from dotenv import load_dotenv

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")


class ClaudeClient:
    def __init__(self) -> None:
        # Load backend/.env so local runs don't require manual exports.
        env_path = Path(__file__).resolve().parents[2] / ".env"
        load_dotenv(env_path, override=False)
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if not api_key:
            raise RuntimeError("Anthropic API key not set. Set ANTHROPIC_API_KEY in .env or env vars.")

        # Pass explicitly so we don't rely on implicit env loading
        self.client = Anthropic(api_key=api_key)

    def json_response(
        self,
        *,
        system: str,
        user: str,
        schema_hint: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        msg = self.client.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system,
            messages=[
                {
                    "role": "user",
                    "content": f"{user}\n\nReturn ONLY valid JSON matching this schema:\n{schema_hint}",
                }
            ],
        )

        # Anthropic returns a list of content blocks; first block is text
        text = msg.content[0].text.strip()
        return json.loads(text)
