"use client";

import React from "react";

const API_URL = process.env.NEXT_PUBLIC_SUPPORT_COPILOT_URL ?? "";

type ResponseShape = {
  ticket_id: string;
  intent: string;
  sentiment: string;
  priority: string;
  confidence: number;
  summary: string;
  suggested_reply: string;
  actions?: string[];
};

const SAMPLE_MESSAGES = [
  "My order 9283 still shows processing after 10 days.",
  "Please cancel it and refund me ASAP.",
];

export function SupportCopilotDemo() {
  const [messages, setMessages] = React.useState<string[]>(SAMPLE_MESSAGES);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<ResponseShape | null>(null);

  const updateMessage = (index: number, value: string) => {
    setMessages((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addMessage = () => setMessages((prev) => [...prev, ""]);
  const removeMessage = (index: number) =>
    setMessages((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setData(null);

    if (!API_URL) {
      setError("Set NEXT_PUBLIC_SUPPORT_COPILOT_URL before using the demo.");
      return;
    }

    const sanitized = messages.map((m) => m.trim()).filter(Boolean);
    if (sanitized.length === 0) {
      setError("Please provide at least one customer message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const resp = await fetch(`${API_URL.replace(/\/$/, "")}/triage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: "demo-ticket",
          messages: sanitized.map((text) => ({ role: "customer", text })),
          language: "en",
          channel: "email",
        }),
      });

      if (!resp.ok) {
        const detail = await resp.text();
        throw new Error(detail || `Request failed with status ${resp.status}`);
      }

      const json = (await resp.json()) as ResponseShape;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-10 space-y-5">
      {!API_URL && (
        <div className="rounded-xl border border-dashed border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Configure <code className="font-mono text-amber-200">NEXT_PUBLIC_SUPPORT_COPILOT_URL</code> in
          your Next.js environment to enable live API calls (e.g., Render URL).
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          {messages.map((value, idx) => (
            <div key={idx} className="flex gap-3">
              <textarea
                value={value}
                onChange={(event) => updateMessage(idx, event.target.value)}
                className="h-24 flex-1 rounded-xl border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                placeholder="Customer message..."
              />
              {messages.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeMessage(idx)}
                  className="h-10 w-10 rounded-lg border border-neutral-800 text-neutral-400 transition hover:border-neutral-700 hover:text-white"
                  title="Remove message"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addMessage}
            className="rounded-xl border border-neutral-800 px-3 py-2 text-sm text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-900"
          >
            Add message
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700/70"
          >
            {isSubmitting ? "Calling Gemini…" : "Triage with Gemini"}
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {data && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 text-sm text-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-50">Triage Summary</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <InfoTile label="Intent" value={data.intent} />
            <InfoTile label="Sentiment" value={data.sentiment} />
            <InfoTile label="Priority" value={data.priority} />
            <InfoTile label="Confidence" value={`${Math.round(data.confidence * 100)}%`} />
          </div>
          <div className="mt-4 space-y-2">
            <DetailBlock label="Summary" value={data.summary} />
            <DetailBlock label="Suggested reply" value={data.suggested_reply} />
            {data.actions?.length ? (
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-500">Recommended actions</div>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {data.actions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">
      <div>{label}</div>
      <div className="text-sm text-neutral-100">{value}</div>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <p className="mt-1 text-neutral-200">{value}</p>
    </div>
  );
}
