import Link from "next/link";
import type { SwapSummary } from "@/services/swaps/list-my-swaps";
import { SwapActionButtons } from "@/components/swaps/swap-action-buttons";

export function SwapCard({
  swap,
  direction,
}: {
  swap: SwapSummary;
  direction: "incoming" | "outgoing" | "active";
}) {
  const badgeClass =
    swap.status === "accepted"
      ? "bg-emerald-100 text-emerald-800"
      : swap.status === "pending"
        ? "bg-amber-100 text-amber-800"
        : swap.status === "declined" || swap.status === "cancelled"
          ? "bg-stone-200 text-stone-700"
          : "bg-blue-100 text-blue-800";

  const description =
    swap.myRole === "requester"
      ? `You offered ${swap.myOfferedSkillId} for ${swap.theirOfferedSkillId}`
      : `You offered ${swap.myOfferedSkillId} for ${swap.theirOfferedSkillId}`;

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">
          {swap.otherUserDisplayName}
        </h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClass}`}
        >
          {swap.status}
        </span>
      </div>

      <p className="mt-2 text-sm text-stone-700">{description}</p>

      <SwapActionButtons swapId={swap._id} direction={direction} />

      <Link
        href={`/swaps/${swap._id}`}
        className="mt-4 inline-block text-sm font-medium text-stone-700 underline"
      >
        Open swap
      </Link>
    </article>
  );
}
