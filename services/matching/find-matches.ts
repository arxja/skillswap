import "server-only";
import { UserModel } from "@/lib/database/models/user.model";
import { connectDB } from "@/lib/database/mongoose";

export interface MatchResult {
  userId: string;
  displayName: string;
  iCanTeach: string[]; // skill slugs I offer that they want
  iCanLearn: string[]; // skill slugs they offer that I want
}

export async function findMatches(userId: string): Promise<MatchResult[]> {
  await connectDB();
  // Throws on DB failure. Caller translates:
  //   - Server Action: runAction → logError → INTERNAL
  //   - Server Component: app/error.tsx boundary
  // Do not catch here — silent failure would mask DB outages.
  const me = await UserModel.findById(userId).lean();
  if (!me) return [];
  if (!me.learns.length || !me.teaches.length) return [];

  const myTeachIds = me.teaches.map((t) => t.skillId);
  const myLearnIds = me.learns.map((l) => l.skillId);

  // userId is the Mongo _id as a string, NOT the Clerk ID.
  const candidates = await UserModel.find({
    _id: { $ne: me._id },
    "teaches.skillId": { $in: myLearnIds },
    "learns.skillId": { $in: myTeachIds },
  }).lean();

  return candidates.map((other) => {
    const theirTeach = other.teaches.map((t) => t.skillId);
    const theirLearn = other.learns.map((l) => l.skillId);

    const iCanTeach = myTeachIds.filter((skillId) =>
      theirLearn.includes(skillId),
    );
    const iCanLearn = myLearnIds.filter((skillId) =>
      theirTeach.includes(skillId),
    );

    return {
      userId: String(other._id),
      displayName: other.displayName,
      iCanTeach,
      iCanLearn,
    };
  });
}
