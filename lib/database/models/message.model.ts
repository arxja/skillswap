import "server-only";

import { Schema, model, models } from "mongoose";
import type { Model, Types } from "mongoose";

interface Message {
  swapId: Types.ObjectId;
  senderId: Types.ObjectId;
  body: string;
}

const MessageSchema = new Schema<Message>(
  {
    swapId: { type: Schema.Types.ObjectId, ref: "Swap", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
);

// Message: a swap thread is read by time order, so this compound index keeps the thread chronologically ordered.
MessageSchema.index({ swapId: 1, createdAt: 1 });

export const MessageModel =
  (models.Message as Model<Message> | undefined) ??
  model<Message>("Message", MessageSchema);
