import "server-only";

import { SwapModel } from "@/lib/database/models/swap.model";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";

export interface SwapSummary {
  _id: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  myRole: "requester" | "recipient";
  otherUserId: string;
  otherUserDisplayName: string;
  myOfferedSkillId: string;
  theirOfferedSkillId: string;
  createdAt: Date;
}

export interface MySwaps {
  incoming: SwapSummary[];
  outgoing: SwapSummary[];
  active: SwapSummary[];
}

export async function listMySwaps(userId: string): Promise<MySwaps> {
  await connectDB();

  const [incoming, outgoing, active] = await Promise.all([
    SwapModel.find({ recipientId: userId, status: "pending" }).lean(),
    SwapModel.find({ requesterId: userId, status: "pending" }).lean(),
    SwapModel.find({
      $or: [{ requesterId: userId }, { recipientId: userId }],
      status: "accepted",
    }).lean(),
  ]);

  const otherUserIds = Array.from(
    new Set(
      [...incoming, ...outgoing, ...active].map((swap) => {
        const requesterId = String(swap.requesterId);
        const recipientId = String(swap.recipientId);
        return requesterId === userId ? recipientId : requesterId;
      }),
    ),
  );

  const userMap = new Map<string, string>();
  if (otherUserIds.length > 0) {
    const users = await UserModel.find(
      { _id: { $in: otherUserIds } },
      { displayName: 1 },
    ).lean();

    for (const user of users) {
      userMap.set(String(user._id), user.displayName);
    }
  }

  type LeanSwap = (typeof incoming)[number];
  const mapSwap = (
    swap: LeanSwap,
    myRole: "requester" | "recipient",
  ): SwapSummary => {
    const otherUserId =
      myRole === "requester"
        ? String(swap.recipientId)
        : String(swap.requesterId);
    const myOfferedSkillId =
      myRole === "requester" ? swap.requesterSkillId : swap.recipientSkillId;
    const theirOfferedSkillId =
      myRole === "requester" ? swap.recipientSkillId : swap.requesterSkillId;

    const createdAt = new Date(
      ((swap as { createdAt?: Date | string }).createdAt ?? Date.now()) as
        | Date
        | string,
    );

    return {
      _id: String(swap._id),
      status: swap.status,
      myRole,
      otherUserId,
      otherUserDisplayName: userMap.get(otherUserId) ?? "Unknown user",
      myOfferedSkillId,
      theirOfferedSkillId,
      createdAt,
    };
  };

  const incomingSummary = incoming.map((swap) => mapSwap(swap, "recipient"));
  const outgoingSummary = outgoing.map((swap) => mapSwap(swap, "requester"));
  const activeSummary = active.map((swap) =>
    mapSwap(
      swap,
      String(swap.requesterId) === userId ? "requester" : "recipient",
    ),
  );

  return {
    incoming: incomingSummary.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
    outgoing: outgoingSummary.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
    active: activeSummary.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    ),
  };
}
