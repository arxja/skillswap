import "server-only";

import { Schema, model, models } from "mongoose";
import type { Model } from "mongoose";

interface Skill {
  _id: string;
  name: string;
  category: string;
}

const SkillSchema = new Schema<Skill>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
  },
  { timestamps: true },
);

// Skill: the catalog is looked up by human-readable name in discovery, so this index supports name searches efficiently.
SkillSchema.index({ name: 1 });

export const SkillModel =
  (models.Skill as Model<Skill> | undefined) ??
  model<Skill>("Skill", SkillSchema);
