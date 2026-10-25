import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { connectDB, disconnectDB } from "@/lib/database/mongoose";
import { UserModel } from "@/lib/database/models/user.model";
import {
  getCurrentUser,
  requireCurrentUser,
} from "@/services/users/get-current-user";

const mockedAuth = vi.mocked(auth as unknown as ReturnType<typeof vi.fn>);

describe("getCurrentUser", () => {
  beforeAll(async () => {
    await connectDB();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({ clerkId: { $regex: /^test_/ } });
    mockedAuth.mockReset();
  });

  afterAll(async () => {
    await UserModel.deleteMany({ clerkId: { $regex: /^test_/ } });
    await disconnectDB();
  });

  it("returns null when auth() has no userId", async () => {
    mockedAuth.mockResolvedValue({ userId: null });

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(requireCurrentUser()).rejects.toMatchObject({
      errorCode: "UNAUTHORIZED",
    });
  });

  it("creates a Mongo user for a new Clerk user", async () => {
    const clerkId = `test_clerk_${Date.now()}`;
    mockedAuth.mockResolvedValue({ userId: clerkId });

    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user).toMatchObject({
      clerkId,
      displayName: "New user",
      teaches: [],
      learns: [],
    });
    expect(await UserModel.countDocuments({ clerkId })).toBe(1);
  });

  it("returns the same user on a second call without creating a duplicate", async () => {
    const clerkId = `test_clerk_${Date.now()}`;
    mockedAuth.mockResolvedValue({ userId: clerkId });

    const first = await getCurrentUser();
    const second = await getCurrentUser();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!._id.toString()).toBe(second!._id.toString());
    expect(await UserModel.countDocuments({ clerkId })).toBe(1);
  });

  it("returns an existing user document when the clerkId already exists", async () => {
    const clerkId = "test_clerk_existing";
    const seed = await UserModel.create({
      clerkId,
      displayName: "Seeded user",
      timezone: "UTC",
      teaches: [],
      learns: [],
    });

    mockedAuth.mockResolvedValue({ userId: clerkId });

    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user!._id.toString()).toBe(seed._id.toString());
    expect(user).toMatchObject({ clerkId, displayName: "Seeded user" });
  });
});
