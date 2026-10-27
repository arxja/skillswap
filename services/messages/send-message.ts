import "server-only";

import { isValidObjectId } from "mongoose";
import { z } from "zod";

import { MessageModel } from "@/lib/database/models/message.model";
import { SwapModel } from "@/lib/database/models/swap.model";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";
import { AppError } from "@/lib/errors";

export interface MessagePayload {
  _id: string;
  swapId: string;
  senderId: string;
  senderDisplayName: string;
  body: string;
  createdAt: string;
}

function serializeMessage(
  message: {
    _id: unknown;
    swapId: unknown;
    senderId: unknown;
    body: string;
    createdAt?: Date | string;
  },
  senderDisplayName: string,
): MessagePayload {
  return {
    _id: String(message._id),
    swapId: String(message.swapId),
    senderId: String(message.senderId),
    senderDisplayName,
    body: message.body,
    createdAt: new Date(message.createdAt ?? Date.now()).toISOString(),
  };
}

export async function sendMessage(
  swapId: string,
  clerkId: string,
  body: string,
): Promise<MessagePayload> {
  const normalizedBody = z.string().min(1).max(2000).parse(body);

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

  const userId = String(user._id);
  const participantIds = [String(swap.requesterId), String(swap.recipientId)];
  if (!participantIds.includes(userId)) {
    throw AppError.forbidden("You are not a participant in this swap.");
  }

  const message = await MessageModel.create({
    swapId,
    senderId: user._id,
    body: normalizedBody,
  });

  const raw = message.toObject ? message.toObject() : message;
  return serializeMessage(raw as any, user.displayName);
}
