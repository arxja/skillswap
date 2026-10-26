// userId is the Mongo _id. Callers convert to String when passing to
// services such as findMatches(userId: string).
// Do not call currentUser() here — auth() is cheap and sufficient.

import "server-only";
import type { Types } from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";
import { AppError } from "@/lib/errors";

export interface CurrentUser {
  _id: Types.ObjectId;
  clerkId: string;
  displayName: string;
  bio?: string;
  timezone: string;
  teaches: { skillId: string; level: string }[];
  learns: { skillId: string; level: string }[];
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  await connectDB();

  const existing = await UserModel.findOne({ clerkId }).lean();
  if (existing) return existing as CurrentUser;

  try {
    const created = await UserModel.findOneAndUpdate(
      { clerkId },
      {
        $setOnInsert: {
          clerkId,
          displayName: "New user",
          teaches: [],
          learns: [],
          timezone: "UTC",
        },
      },
      { upsert: true, new: true },
    ).lean();

    return created as CurrentUser;
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: number }).code === 11000
    ) {
      const raced = await UserModel.findOne({ clerkId }).lean();
      if (raced) return raced as CurrentUser;
    }
    throw err;
  }
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw AppError.unauthorized("You must be signed in");
  return user;
}
