"use client";

import { useMemo } from "react";

import type { MessagePayload } from "@/services/messages/send-message";
import { MessageBubble } from "./message-bubble";
import { MessageInput } from "./message-input";
import { useSwapSocket } from "./use-swap-socket";

function mergeInitialMessages(
  initialMessages: MessagePayload[],
  liveMessages: MessagePayload[],
): MessagePayload[] {
  const byId = new Map<string, MessagePayload>();

  for (const message of [...initialMessages, ...liveMessages]) {
    byId.set(message._id, message);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function MessageThread({
  swapId,
  initialMessages,
  currentUserId,
}: {
  swapId: string;
  initialMessages: MessagePayload[];
  currentUserId: string;
}) {
  const { status, send, messages } = useSwapSocket(swapId);
  const mergedMessages = useMemo(
    () => mergeInitialMessages(initialMessages, messages),
    [initialMessages, messages],
  );

  return (
    <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {status === "disconnected" ? (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Reconnecting...
        </div>
      ) : null}

      <div className="space-y-3">
        {mergedMessages.length === 0 ? (
          <p className="text-sm text-stone-500">No messages yet.</p>
        ) : (
          mergedMessages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isMine={String(message.senderId) === currentUserId}
            />
          ))
        )}
      </div>

      <MessageInput onSend={send} disabled={status !== "connected"} />
    </div>
  );
}
