import "server-only";

import { Schema, model, models } from "mongoose";
import type { Model } from "mongoose";

interface UserSkill {
  skillId: string;
  level: "beginner" | "intermediate" | "advanced";
}

interface User {
  clerkId: string;
  displayName: string;
  bio?: string;
  timezone: string;
  teaches: UserSkill[];
  learns: UserSkill[];
}

const UserSkillSchema = new Schema<UserSkill>(
  {
    skillId: { type: String, required: true },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
    },
  },
  { _id: false },
);

const UserSchema = new Schema<User>(
  {
    // User: clerkId is the app's auth join key, so each Clerk account maps to exactly one profile.
    clerkId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    bio: { type: String },
    timezone: { type: String, default: "UTC" },
    teaches: { type: [UserSkillSchema], default: [] },
    learns: { type: [UserSkillSchema], default: [] },
  },
  { timestamps: true },
);

// User: the dashboard match query filters by taught skills, so this index keeps the read together with the user fast.
UserSchema.index({ "teaches.skillId": 1 });

// User: the dashboard match query filters by wanted skills, so this index lets Mongo find reciprocal candidates efficiently.
UserSchema.index({ "learns.skillId": 1 });

export const UserModel =
  (models.User as Model<User> | undefined) ?? model<User>("User", UserSchema);
