"use client";

import { useState, useTransition } from "react";
import { createSwap } from "@/lib/actions/swap/create-swap.action";

export function SendSwapRequestButton({
  recipientId,
  offeredSkillId,
  requestedSkillId,
}: {
  recipientId: string;
  offeredSkillId: string;
  requestedSkillId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const disabled =
    isPending || !recipientId || !offeredSkillId || !requestedSkillId;

  return (
    <div>
      <button
        type="button"
        className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createSwap({
              recipientId,
              offeredSkillId,
              requestedSkillId,
            });

            if (result.ok) {
              alert("Request sent");
              return;
            }

            setError(result.error.message);
          });
        }}
      >
        {isPending ? "Sending..." : "Send swap request"}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
