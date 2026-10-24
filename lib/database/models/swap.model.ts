import "server-only";

import { Schema, model, models } from "mongoose";
import type { Model, Types } from "mongoose";

interface Swap {
  requesterId: Types.ObjectId;
  recipientId: Types.ObjectId;
  requesterSkillId: string;
  recipientSkillId: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed";
  pairKey: string;
}

const SwapSchema = new Schema<Swap>(
  {
    requesterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requesterSkillId: {
      type: String,
      required: true,
      // the skill the requester OFFERS (teaches) in exchange
    },
    recipientSkillId: {
      type: String,
      required: true,
      // the skill the recipient OFFERS (teaches);
      // this is what the requester wants to learn
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "cancelled", "completed"],
      default: "pending",
    },
    // Set by services/swaps/pair-key.ts (hand-written).
    // MUST be canonical: sorted user IDs + sorted skill slugs,
    // joined with ":". Required by the partial unique index below.
    pairKey: { type: String, required: true },
  },
  { timestamps: true },
);

// Swap: duplicate requests should be prevented regardless of who initiated them, so this partial unique index detects the same pair even when the active status is pending or accepted.
SwapSchema.index(
  { pairKey: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "accepted"] } },
  },
);

// Swap: the inbox surfaces incoming requests by recipient and status, so this index filters quickly.
SwapSchema.index({ recipientId: 1, status: 1 });

// Swap: the dashboard shows outgoing requests by requester and status, so this index filters quickly.
SwapSchema.index({ requesterId: 1, status: 1 });

export const SwapModel =
  (models.Swap as Model<Swap> | undefined) ?? model<Swap>("Swap", SwapSchema);
