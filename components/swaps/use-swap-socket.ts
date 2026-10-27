"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { MessagePayload } from "@/services/messages/send-message";

function mergeMessages(
  existing: MessagePayload[],
  incoming: MessagePayload[],
): MessagePayload[] {
  const byId = new Map<string, MessagePayload>();

  for (const message of [...existing, ...incoming]) {
    byId.set(message._id, message);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function useSwapSocket(swapId: string): {
  status: "connecting" | "connected" | "disconnected";
  send: (body: string) => Promise<{ ok: boolean; code?: string }>;
  messages: MessagePayload[];
} {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [messages, setMessages] = useState<MessagePayload[]>([]);
  const messagesRef = useRef<MessagePayload[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const send = useCallback(
    async (body: string) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        return { ok: false, code: "DISCONNECTED" };
      }

      return await new Promise<{ ok: boolean; code?: string }>((resolve) => {
        socket.emit(
          "send_message",
          { swapId, body },
          (
            ack:
              | { ok: boolean; code?: string; message?: MessagePayload }
              | undefined,
          ) => {
            if (ack?.message) {
              setMessages((previous) =>
                mergeMessages(previous, [ack.message!]),
              );
            }
            resolve(ack ?? { ok: false, code: "DISCONNECTED" });
          },
        );
      });
    },
    [swapId],
  );

  useEffect(() => {
    let isCancelled = false;

    const connect = async () => {
      const token = await getToken();
      if (isCancelled || !token) {
        setStatus("disconnected");
        return;
      }

      const socket = io(undefined, {
        auth: { token },
        path: "/ws",
        transports: ["websocket"],
      });

      socketRef.current = socket;
      setStatus("connecting");

      socket.on("connect", () => {
        setStatus("connected");

        socket.emit(
          "join_swap",
          { swapId },
          async (ack: { ok: boolean } | undefined) => {
            if (!ack?.ok) {
              return;
            }

            const lastMessageAt = messagesRef.current.at(-1)?.createdAt;
            const url = new URL(
              `/api/swaps/${swapId}/messages`,
              window.location.origin,
            );
            if (lastMessageAt) {
              url.searchParams.set("since", lastMessageAt);
            }
            url.searchParams.set("limit", "100");

            try {
              const response = await fetch(url.toString(), {
                cache: "no-store",
              });
              if (!response.ok) {
                return;
              }

              const payload = (await response.json()) as {
                ok?: boolean;
                messages?: MessagePayload[];
              };

              if (payload.messages) {
                setMessages((previous) =>
                  mergeMessages(previous, payload.messages!),
                );
              }
            } catch {
              // Ignore catch-up failures in the reconnect flow; the socket will retry.
            }
          },
        );
      });

      socket.on("connect_error", () => {
        setStatus("disconnected");
      });

      socket.on("disconnect", () => {
        setStatus("disconnected");
      });

      socket.on("new_message", (message: MessagePayload) => {
        setMessages((previous) => mergeMessages(previous, [message]));
      });
    };

    void connect();

    return () => {
      isCancelled = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave_swap", { swapId });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [getToken, swapId]);

  return { status, send, messages };
}
