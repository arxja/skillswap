import type { MatchResult } from "@/services/matching/find-matches";
import { SendSwapRequestButton } from "@/components/swaps/send-swap-request-button";

export function MatchCard({ match }: { match: MatchResult }) {
  // v1 simplification: the request uses the first overlap on each side.
  const offeredSkillId = match.iCanTeach[0] ?? "";
  const requestedSkillId = match.iCanLearn[0] ?? "";

  return (
    <article className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-900">
        {match.displayName}
      </h2>
      <p className="mt-2 text-sm text-stone-700">
        You teach: {match.iCanTeach.join(", ") || "—"}
      </p>
      <p className="mt-1 text-sm text-stone-700">
        They teach: {match.iCanLearn.join(", ") || "—"}
      </p>
      <div className="mt-4">
        <SendSwapRequestButton
          recipientId={match.userId}
          offeredSkillId={offeredSkillId}
          requestedSkillId={requestedSkillId}
        />
      </div>
    </article>
  );
}
