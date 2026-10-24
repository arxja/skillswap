import "server-only";

import { Schema, model, models } from "mongoose";
import type { Model, Types } from "mongoose";

interface Review {
  swapId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  comment?: string;
}

const ReviewSchema = new Schema<Review>(
  {
    swapId: { type: Schema.Types.ObjectId, ref: "Swap", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);

// Review: one reviewer can leave at most one review per swap, so the compound unique index prevents duplicate reviews.
ReviewSchema.index({ swapId: 1, reviewerId: 1 }, { unique: true });

// Review: profiles show the other person's reviews by recipient, so this index supports review listings efficiently.
ReviewSchema.index({ revieweeId: 1 });

export const ReviewModel =
  (models.Review as Model<Review> | undefined) ??
  model<Review>("Review", ReviewSchema);
