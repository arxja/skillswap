import "server-only";

import { AppError } from "@/lib/errors";
import { SwapModel } from "@/lib/database/models/swap.model";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";

export async function getSwapById(swapId: string, viewerId: string) {
  await connectDB();

  const swap = await SwapModel.findById(swapId).lean();
  if (!swap) {
    throw AppError.notFound("Swap");
  }

  const requesterId = String(swap.requesterId);
  const recipientId = String(swap.recipientId);

  if (viewerId !== requesterId && viewerId !== recipientId) {
    throw AppError.forbidden("You are not a participant in this swap.");
  }

  const users = await UserModel.find(
    { _id: { $in: [requesterId, recipientId] } },
    { displayName: 1 },
  ).lean();

  const displayNames = new Map<string, string>();
  for (const user of users) {
    displayNames.set(String(user._id), user.displayName);
  }

  const myRole = viewerId === requesterId ? "requester" : "recipient";
  const normalizedSwap = {
    ...swap,
    _id: String(swap._id),
    requesterId,
    recipientId,
  };

  return {
    swap: normalizedSwap,
    requester: {
      _id: requesterId,
      displayName: displayNames.get(requesterId) ?? "Unknown user",
    },
    recipient: {
      _id: recipientId,
      displayName: displayNames.get(recipientId) ?? "Unknown user",
    },
    myRole,
  };
}
