"use client";

import type { MessagePayload } from "@/services/messages/send-message";

export function MessageBubble({
  message,
  isMine,
}: {
  message: MessagePayload;
  isMine: boolean;
}) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
          isMine
            ? "bg-stone-900 text-white"
            : "border border-stone-200 bg-white text-stone-800"
        }`}
      >
        {!isMine && (
          <div className="mb-1 text-xs font-medium text-stone-500">
            {message.senderDisplayName}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {message.body}
        </p>
        <div
          className={`mt-1 text-[10px] ${
            isMine ? "text-stone-200" : "text-stone-400"
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}
