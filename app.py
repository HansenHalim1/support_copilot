"""
Support Copilot FastAPI service wrapping Gemini 2.5 Flash.

Exposes /health and /triage endpoints. Requires GOOGLE_API_KEY env var.
"""
from __future__ import annotations

import os
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import google.generativeai as genai

from prompts import SYSTEM_PROMPT, TICKET_RESPONSE_SCHEMA


def configure_client() -> genai.GenerativeModel:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable is required.")
    genai.configure(api_key=api_key)
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    generation_config = {
        "temperature": float(os.getenv("TEMPERATURE", "0.2")),
        "top_p": float(os.getenv("TOP_P", "0.95")),
        "top_k": int(os.getenv("TOP_K", "32")),
        "max_output_tokens": int(os.getenv("MAX_OUTPUT_TOKENS", "768")),
        "response_mime_type": "application/json",
        "response_schema": TICKET_RESPONSE_SCHEMA,
    }
    return genai.GenerativeModel(
        model_name,
        generation_config=generation_config,
        system_instruction=SYSTEM_PROMPT,
    )


MODEL = None
app = FastAPI(title="Support Copilot API", version="0.1.0")


class Message(BaseModel):
    role: str = Field(..., description="customer or agent")
    text: str = Field(..., min_length=1, max_length=4000)


class TicketPayload(BaseModel):
    ticket_id: str = Field(..., min_length=1)
    messages: List[Message] = Field(..., min_items=1)
    language: str = Field("en", description="ISO language code (for tonal guidance)")
    channel: Optional[str] = Field(None, description="e.g. email, chat, whatsapp")
    customer_tier: Optional[str] = Field(None)
    knowledge_snippets: Optional[List[str]] = Field(None, description="Optional KB extracts to ground Gemini")


class TriageResponse(BaseModel):
    ticket_id: str
    intent: str
    sentiment: str
    priority: str
    confidence: float
    summary: str
    suggested_reply: str
    actions: List[str]
    tags: Optional[List[str]] = None
    language: Optional[str] = None


def get_model() -> genai.GenerativeModel:
    global MODEL
    if MODEL is None:
        MODEL = configure_client()
    return MODEL


def build_prompt(payload: TicketPayload) -> List[dict]:
    transcript_lines = [
        f"{msg.role.upper()}: {msg.text.strip()}" for msg in payload.messages if msg.text.strip()
    ]
    context_parts = [
        f"Ticket ID: {payload.ticket_id}",
        f"Channel: {payload.channel or 'unknown'}",
        f"Customer tier: {payload.customer_tier or 'unknown'}",
        f"Language hint: {payload.language}",
    ]
    if payload.knowledge_snippets:
        context_parts.append("Relevant KB:")
        for idx, snippet in enumerate(payload.knowledge_snippets, 1):
            context_parts.append(f"[KB {idx}] {snippet.strip()}")

    user_prompt = "\n".join(
        [
            "\n".join(context_parts),
            "Transcript:",
            "\n".join(transcript_lines),
            "",
            "Return JSON only.",
        ]
    )
    return [{"role": "user", "parts": [user_prompt]}]


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/triage", response_model=TriageResponse)
def triage(payload: TicketPayload) -> TriageResponse:
    if not payload.messages:
        raise HTTPException(status_code=422, detail="messages cannot be empty")

    model = get_model()
    prompt = build_prompt(payload)
    try:
        response = model.generate_content(prompt, safety_settings="BLOCK_NONE")
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Gemini call failed: {err}") from err

    try:
        data = response.parsed if hasattr(response, "parsed") else response.text
    except Exception as err:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Unexpected response format: {err}") from err

    if isinstance(data, str):
        # When schema parsing fails, Gemini returns JSON string.
        import json

        data = json.loads(data)

    data["ticket_id"] = payload.ticket_id
    return TriageResponse(**data)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=9000, reload=True)
