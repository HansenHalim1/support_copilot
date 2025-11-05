"\"\"Utility objects for Support Copilot prompts and structured output.\"\"\""

from __future__ import annotations

from typing import Any, Dict

SYSTEM_PROMPT = (
    "You are Support Copilot, a customer support specialist. "
    "Given the full ticket transcript, return intent, urgency, sentiment, "
    "a concise summary, recommended actions, and a short reply draft. "
    "Follow company tone: empathic, concise, solution-focused. "
    "If you lack detail, highlight missing info instead of inventing answers."
)

# JSON schema guiding Gemini's response.
TICKET_RESPONSE_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "intent": {
            "type": "string",
            "enum": [
                "refund_request",
                "order_status",
                "technical_issue",
                "account_access",
                "billing_question",
                "feedback",
                "other",
            ],
        },
        "sentiment": {"type": "string", "enum": ["angry", "frustrated", "neutral", "satisfied", "delighted"]},
        "priority": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
        "confidence": {"type": "number", "description": "Confidence between 0 and 1"},
        "summary": {"type": "string", "description": "Concise ticket summary"},
        "suggested_reply": {"type": "string", "description": "Reply draft for the agent to send"},
        "actions": {"type": "array", "items": {"type": "string", "description": "Recommended follow-up step"}},
        "tags": {"type": "array", "items": {"type": "string"}},
        "language": {"type": "string"},
    },
    "required": ["intent", "sentiment", "priority", "confidence", "summary", "suggested_reply", "actions"],
}
