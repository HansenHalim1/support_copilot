# Support Copilot — Gemini 2.5 Flash Ticket Intelligence

This folder contains a FastAPI service that orchestrates Google’s Gemini 2.5
Flash for real-time customer-support triage. Feed it a transcript and it
returns structured insights (intent, sentiment, priority) plus a suggested
reply that agents can review before sending.

## Capabilities

- Multi-turn context ingestion (customer ↔ agent).
- Prompt templates optimised for Gemini 2.5 Flash with JSON Schema validation.
- Optional retrieval attachments (knowledge base snippets) before inference.
- FastAPI endpoints for `/health` and `/triage`.

## Quickstart

```bash
cp .env.example .env            # add GOOGLE_API_KEY=... inside
python -m venv .venv
# Windows: .\.venv\Scripts\activate
source .venv/bin/activate

pip install -r requirements.txt

uvicorn app:app --host 0.0.0.0 --port 9000 --reload
```

Then POST a ticket transcript:

```bash
curl -X POST http://localhost:9000/triage \
  -H "Content-Type: application/json" \
  -d '{
        "ticket_id": "A-10293",
        "messages": [
          {"role": "customer", "text": "My order 9283 still says processing after 10 days."},
          {"role": "customer", "text": "Please cancel and refund ASAP."}
        ],
        "language": "en"
      }'
```

Sample response (trimmed):

```json
{
  "ticket_id": "A-10293",
  "intent": "refund_request",
  "sentiment": "angry",
  "priority": "high",
  "confidence": 0.82,
  "summary": "Order 9283 stuck; customer now wants a refund.",
  "suggested_reply": "Apologise, cancel the order, initiate refund, offer coupon.",
  "actions": [
    "Cancel order 9283 in OMS",
    "Send refund confirmation email"
  ]
}
```

## Environment variables

| Variable            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `GOOGLE_API_KEY`    | Required Google AI Studio key (load via `.env`).             |
| `GEMINI_MODEL`      | Optional model override (default `gemini-2.5-flash`).        |
| `TEMPERATURE`       | Optional float, generation temperature (default `0.2`).      |
| `TOP_P`, `TOP_K`    | Optional sampling controls.                                  |
| `MAX_OUTPUT_TOKENS` | Optional cap (default `768`).                                |

## Extending

- Stream ticket payloads from CRM/webhooks.
- Persist outputs & feedback in a vector store for continual prompt tuning.
- Add a Next.js dashboard that calls this API (the portfolio links here).

## Deploy to Railway (recommended free tier)

1. Push this folder to its own Git repository (or use an existing one).
2. Create a new project in [Railway](https://railway.app/) and connect the repo.
3. Railway will detect the provided `Dockerfile` automatically and build it. No extra configuration
   is required.
4. In the Railway dashboard, add environment variables:
   - `GOOGLE_API_KEY=<your Google AI Studio key>`
   - Optional tuning vars (`GEMINI_MODEL`, `TEMPERATURE`, etc.)
5. Deploy. Railway assigns a public URL like `https://support-copilot.up.railway.app`. If Railway
   asks for a start command, use `uvicorn app:app --host 0.0.0.0 --port $PORT`.
6. Test the deployment:
   ```bash
   curl https://support-copilot.up.railway.app/health
   curl -X POST https://support-copilot.up.railway.app/triage \
     -H "Content-Type: application/json" \
     -d '{"ticket_id":"demo","messages":[{"role":"customer","text":"Need a refund"}]}'
   ```
