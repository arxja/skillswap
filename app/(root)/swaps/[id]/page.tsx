import Link from "next/link";
import { Suspense } from "react";
import { SwapActionButtons } from "@/components/swaps/swap-action-buttons";
import { getSwapById } from "@/services/swaps/get-swap-by-id";
import { requireCurrentUser } from "@/services/users/get-current-user";

export default function SwapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<SwapDetailSkeleton />}>
        <SwapDetailContent params={params} />
      </Suspense>
    </div>
  );
}

async function SwapDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireCurrentUser();
  const detail = await getSwapById(id, String(user._id));

  const detailDirection =
    detail.swap.status === "accepted"
      ? "active"
      : detail.swap.status === "pending"
        ? detail.myRole === "requester"
          ? "outgoing"
          : "incoming"
        : null;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-stone-700 underline"
      >
        ← Back to dashboard
      </Link>

      <h1 className="mt-6 text-3xl font-semibold text-stone-900">
        Swap with{" "}
        {detail.myRole === "requester"
          ? detail.recipient.displayName
          : detail.requester.displayName}
      </h1>

      <div className="mt-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-stone-600">
          Status:{" "}
          <span className="font-semibold text-stone-900">
            {detail.swap.status}
          </span>
        </p>
        <div className="mt-4 space-y-2 text-sm text-stone-700">
          <p>
            Requester:{" "}
            <span className="font-medium text-stone-900">
              {detail.requester.displayName}
            </span>
          </p>
          <p>
            Recipient:{" "}
            <span className="font-medium text-stone-900">
              {detail.recipient.displayName}
            </span>
          </p>
          <p>
            Offered by requester:{" "}
            <span className="font-medium text-stone-900">
              {detail.swap.requesterSkillId}
            </span>
          </p>
          <p>
            Offered by recipient:{" "}
            <span className="font-medium text-stone-900">
              {detail.swap.recipientSkillId}
            </span>
          </p>
        </div>
      </div>

      {detailDirection ? (
        <div className="mt-6">
          <SwapActionButtons
            swapId={detail.swap._id}
            direction={detailDirection}
          />
        </div>
      ) : null}

      <div className="mt-8 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
        Messages will appear here (coming in Unit 6)
      </div>
    </main>
  );
}

function SwapDetailSkeleton() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <div className="h-5 w-32 animate-pulse rounded bg-stone-200" />
      <div className="mt-6 h-12 animate-pulse rounded bg-stone-200" />
      <div className="mt-4 h-40 animate-pulse rounded-lg bg-stone-200" />
    </main>
  );
}
