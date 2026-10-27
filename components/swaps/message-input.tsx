"use client";

import { useState } from "react";

export function MessageInput({
  onSend,
  disabled,
}: {
  onSend: (body: string) => Promise<{ ok: boolean; code?: string }>;
  disabled: boolean;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending || disabled) {
      return;
    }

    setSending(true);
    const ack = await onSend(trimmed);
    if (ack.ok) {
      setBody("");
    }
    setSending(false);
  };

  return (
    <div className="mt-4 flex items-end gap-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSend();
          }
        }}
        placeholder="Write a message..."
        disabled={disabled || sending}
        rows={3}
        className="min-h-20 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 disabled:cursor-not-allowed disabled:bg-stone-100"
      />

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={disabled || sending || body.trim().length === 0}
        className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {sending ? "Sending..." : "Send"}
      </button>
    </div>
  );
}
