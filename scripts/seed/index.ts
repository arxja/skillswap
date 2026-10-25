// Assumes the caller has already connected. Does not manage the connection lifecycle.
import "server-only";
import { SkillModel } from "@/lib/database/models/skill.model";
import { UserModel } from "@/lib/database/models/user.model";
import { SKILL_CATALOG, DEV_USERS, TEST_USERS, DEMO_USERS } from "./data";

export type SeedProfile = "dev" | "demo";

export async function seedData(profile: SeedProfile): Promise<void> {
  // 1. Skills — always wipe and re-insert (catalog is static, cheap to replace)
  await SkillModel.deleteMany({});
  await SkillModel.insertMany(SKILL_CATALOG);

  // 2. Users — prefix-scoped cleanup, then insert profile-specific users
  if (profile === "dev") {
    await UserModel.deleteMany({ clerkId: { $regex: /^(dev_seed_|test_)/ } });
    await UserModel.insertMany([...DEV_USERS, ...TEST_USERS]);
  } else {
    await UserModel.deleteMany({ clerkId: { $regex: /^demo_/ } });
    await UserModel.insertMany(DEMO_USERS);
  }
}