import os
import json
from typing import Any, Dict
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class ClaudeClient:
    """Renamed to ClaudeClient for backward compatibility, but now uses Gemini"""
    def __init__(self) -> None:
        # Load backend/.env so local runs don't require manual exports.
        # Go up from common/ -> src/ -> backend/ -> .env
        env_path = Path(__file__).resolve().parents[2] / ".env"
        load_dotenv(env_path, override=False)
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise RuntimeError("Gemini API key not set. Set GEMINI_API_KEY in .env or env vars. Get free key at https://aistudio.google.com/app/apikey")

        # Configure Gemini
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 2048,
            }
        )

    def json_response(
        self,
        *,
        system: str,
        user: str,
        schema_hint: str,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> Dict[str, Any]:
        # Gemini doesn't have separate system/user, combine them
        prompt = f"""System Instructions: {system}

User Request: {user}

CRITICAL: You MUST return ONLY valid JSON. No markdown, no code blocks, no explanations.
Just raw JSON matching this exact schema:
{schema_hint}

Return the JSON now:"""
        
        response = self.model.generate_content(prompt)
        text = response.text.strip()
        
        # Aggressively clean markdown formatting
        if text.startswith('```'):
            # Remove code block markers
            lines = text.split('\n')
            # Remove first line (```json or ```)
            if lines[0].startswith('```'):
                lines = lines[1:]
            # Remove last line if it's closing ```
            if lines and lines[-1].strip() == '```':
                lines = lines[:-1]
            text = '\n'.join(lines).strip()
        
        # Try to extract JSON if wrapped in other text
        if not text.startswith('{') and '{' in text:
            start = text.index('{')
            end = text.rindex('}') + 1
            text = text[start:end]
            
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            # Log the problematic text for debugging
            print(f"JSON Parse Error: {e}")
            print(f"Problematic text: {text[:500]}")
            raise RuntimeError(f"Failed to parse LLM JSON response: {e}") from e
