import "server-only";

import { isValidObjectId } from "mongoose";

import { MessageModel } from "@/lib/database/models/message.model";
import { SwapModel } from "@/lib/database/models/swap.model";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";
import { AppError } from "@/lib/errors";
import type { MessagePayload } from "./send-message";

export async function listMessages(
  swapId: string,
  clerkId: string,
  opts?: { since?: string; limit?: number },
): Promise<MessagePayload[]> {
  await connectDB();

  if (!isValidObjectId(swapId)) {
    throw AppError.notFound("Swap");
  }

  const user = await UserModel.findOne({ clerkId }).lean();
  if (!user) {
    throw AppError.unauthorized("Unauthorized");
  }

  const swap = await SwapModel.findById(swapId).lean();
  if (!swap) {
    throw AppError.notFound("Swap");
  }

  const viewerId = String(user._id);
  const participantIds = [String(swap.requesterId), String(swap.recipientId)];
  if (!participantIds.includes(viewerId)) {
    throw AppError.forbidden("You are not a participant in this swap.");
  }

  const limit = Number.isFinite(opts?.limit)
    ? Math.max(1, Math.min(Number(opts!.limit), 500))
    : 100;

  const query: Record<string, unknown> = { swapId };
  if (opts?.since) {
    const sinceDate = new Date(opts.since);
    if (!Number.isNaN(sinceDate.getTime())) {
      query.createdAt = { $gt: sinceDate };
    }
  }

  const messages = await MessageModel.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  const senderIds = [
    ...new Set(messages.map((message) => String(message.senderId))),
  ];
  const users = senderIds.length
    ? await UserModel.find(
        { _id: { $in: senderIds } },
        { displayName: 1 },
      ).lean()
    : [];

  const displayNames = new Map(
    users.map((entry) => [String(entry._id), entry.displayName]),
  );

  return messages.map((message) => {
    const createdAt = new Date(
      ((message as { createdAt?: Date | string }).createdAt ?? Date.now()) as
        | Date
        | string,
    );

    return {
      _id: String(message._id),
      swapId: String(message.swapId),
      senderId: String(message.senderId),
      senderDisplayName:
        displayNames.get(String(message.senderId)) ?? "Unknown user",
      body: message.body,
      createdAt: createdAt.toISOString(),
    };
  });
}
