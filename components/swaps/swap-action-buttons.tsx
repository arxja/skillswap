"use client";

import { useState, useTransition } from "react";
import { acceptSwap } from "@/lib/actions/swap/accept-swap.action";
import { cancelSwap } from "@/lib/actions/swap/cancel-swap.action";
import { completeSwap } from "@/lib/actions/swap/complete-swap.action";
import { declineSwap } from "@/lib/actions/swap/decline-swap.action";

export function SwapActionButtons({
  swapId,
  direction,
}: {
  swapId: string;
  direction: "incoming" | "outgoing" | "active";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = async (
    action: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) => {
    setError(null);
    const result = await action();
    if (!result.ok) {
      setError(result.error?.message ?? "Something went wrong");
    }
  };

  const buttons =
    direction === "incoming"
      ? [
          {
            label: "Accept",
            action: () => acceptSwap(swapId),
            variant: "primary",
          },
          {
            label: "Decline",
            action: () => declineSwap(swapId),
            variant: "secondary",
          },
        ]
      : direction === "outgoing"
        ? [
            {
              label: "Cancel",
              action: () => cancelSwap(swapId),
              variant: "secondary",
            },
          ]
        : [
            {
              label: "Cancel",
              action: () => cancelSwap(swapId),
              variant: "secondary",
            },
            {
              label: "Complete",
              action: () => completeSwap(swapId),
              variant: "primary",
            },
          ];

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <button
            key={button.label}
            type="button"
            disabled={isPending}
            className={
              button.variant === "primary"
                ? "rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                : "rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            }
            onClick={() => {
              startTransition(async () => {
                try {
                  await run(button.action);
                } catch {
                  setError("Something went wrong");
                }
              });
            }}
          >
            {button.label}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
