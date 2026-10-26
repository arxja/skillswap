import { Suspense } from "react";
import { MatchCard } from "@/components/swaps/match-card";
import { SwapCard } from "@/components/swaps/swap-card";
import { findMatches } from "@/services/matching/find-matches";
import { listMySwaps } from "@/services/swaps/list-my-swaps";
import { requireCurrentUser } from "@/services/users/get-current-user";

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

async function DashboardContent() {
  const user = await requireCurrentUser();
  const [matches, swaps] = await Promise.all([
    findMatches(String(user._id)),
    listMySwaps(String(user._id)),
  ]);

  const activeOtherIds = new Set(swaps.active.map((swap) => swap.otherUserId));
  const freshMatches = matches.filter(
    (match) => !activeOtherIds.has(match.userId),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <h1 className="text-3xl font-semibold text-stone-900">
        Welcome, {user.displayName}
      </h1>

      {freshMatches.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-stone-900">
            Suggested matches
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {freshMatches.map((match) => (
              <MatchCard key={match.userId} match={match} />
            ))}
          </div>
        </section>
      )}

      {swaps.incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-stone-900">
            Incoming requests
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {swaps.incoming.map((swap) => (
              <SwapCard key={swap._id} swap={swap} direction="incoming" />
            ))}
          </div>
        </section>
      )}

      {swaps.outgoing.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-stone-900">
            Outgoing requests
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {swaps.outgoing.map((swap) => (
              <SwapCard key={swap._id} swap={swap} direction="outgoing" />
            ))}
          </div>
        </section>
      )}

      {swaps.active.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold text-stone-900">
            Active swaps
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {swaps.active.map((swap) => (
              <SwapCard key={swap._id} swap={swap} direction="active" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="h-9 w-52 animate-pulse rounded bg-stone-200" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-lg bg-stone-200" />
        <div className="h-40 animate-pulse rounded-lg bg-stone-200" />
      </div>
    </main>
  );
}
