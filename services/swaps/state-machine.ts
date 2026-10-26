import "server-only";

export type SwapStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed";

export type SwapAction = "accept" | "decline" | "cancel" | "complete";

export type Actor = "requester" | "recipient";

interface Rule {
  action: SwapAction;
  from: SwapStatus;
  to: SwapStatus;
  who: Actor | "either";
}

const RULES: Rule[] = [
  { action: "accept", from: "pending", to: "accepted", who: "recipient" },
  { action: "decline", from: "pending", to: "declined", who: "recipient" },
  { action: "cancel", from: "pending", to: "cancelled", who: "requester" },
  { action: "cancel", from: "accepted", to: "cancelled", who: "either" },
  { action: "complete", from: "accepted", to: "completed", who: "either" },
];

export function canTransition(
  from: SwapStatus,
  action: SwapAction,
  actor: Actor,
): SwapStatus | null {
  const rule = RULES.find(
    (rule) => rule.from === from && rule.action === action,
  );

  if (!rule) {
    return null;
  }

  if (rule.who !== "either" && rule.who !== actor) {
    return null;
  }

  return rule.to;
}
