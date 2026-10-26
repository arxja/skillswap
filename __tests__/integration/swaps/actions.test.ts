import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";

vi.hoisted(() => {
  process.env.DEMO_READ_ONLY = "false";
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
});

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { Types } from "mongoose";
import { auth } from "@clerk/nextjs/server";
import { connectDB, disconnectDB } from "@/lib/database/mongoose";
import { UserModel } from "@/lib/database/models/user.model";
import { SwapModel } from "@/lib/database/models/swap.model";
import { buildPairKey } from "@/services/swaps/pair-key";
import { createSwap } from "@/lib/actions/swap/create-swap.action";
import { acceptSwap } from "@/lib/actions/swap/accept-swap.action";
import { declineSwap } from "@/lib/actions/swap/decline-swap.action";
import { cancelSwap } from "@/lib/actions/swap/cancel-swap.action";
import { completeSwap } from "@/lib/actions/swap/complete-swap.action";
import { AppError } from "@/lib/errors";

function expectOk<T>(
  result: { ok: true; data: T } | { ok: false; error: { message: string } },
) {
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function expectErr<T>(
  result:
    | { ok: true; data: T }
    | { ok: false; error: { code: string; message: string } },
) {
  if (result.ok) {
    throw new Error("Expected an error result");
  }
  return result.error;
}

const makeAuthMock = (clerkId: string) => {
  vi.mocked(auth).mockResolvedValue({ userId: clerkId } as any);
};

async function makeSwap(
  status: "pending" | "accepted" | "declined" | "cancelled" | "completed",
  requesterId?: Types.ObjectId,
  recipientId?: Types.ObjectId,
) {
  const reqId = requesterId ?? new Types.ObjectId();
  const recId = recipientId ?? new Types.ObjectId();

  return SwapModel.create({
    requesterId: reqId,
    recipientId: recId,
    requesterSkillId: "test_action_react",
    recipientSkillId: "test_action_spanish",
    pairKey: `test-action-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status,
  });
}

beforeAll(async () => {
  await connectDB();
  await SwapModel.findOne({});

  await UserModel.deleteMany({ clerkId: /^test_clerk_/ });
  await UserModel.create([
    {
      clerkId: "test_clerk_creator",
      displayName: "Creator Test",
      timezone: "UTC",
      teaches: [{ skillId: "react", level: "advanced" }],
      learns: [{ skillId: "python", level: "beginner" }],
    },
    {
      clerkId: "test_clerk_target",
      displayName: "Target Test",
      timezone: "UTC",
      teaches: [{ skillId: "python", level: "advanced" }],
      learns: [{ skillId: "react", level: "beginner" }],
    },
  ]);
}, 30_000);

afterAll(async () => {
  await SwapModel.deleteMany({ requesterSkillId: /^test_action_/ });
  await UserModel.deleteMany({ clerkId: /^test_clerk_/ });
  await disconnectDB();
}, 30_000);

beforeEach(async () => {
  vi.clearAllMocks();
  await SwapModel.deleteMany({
    $or: [
      { requesterSkillId: /^test_action_/ },
      { recipientSkillId: /^test_action_/ },
    ],
  });
  await UserModel.deleteMany({ clerkId: /^test_clerk_/ });
  await UserModel.create([
    {
      clerkId: "test_clerk_creator",
      displayName: "Creator Test",
      timezone: "UTC",
      teaches: [{ skillId: "react", level: "advanced" }],
      learns: [{ skillId: "python", level: "beginner" }],
    },
    {
      clerkId: "test_clerk_target",
      displayName: "Target Test",
      timezone: "UTC",
      teaches: [{ skillId: "python", level: "advanced" }],
      learns: [{ skillId: "react", level: "beginner" }],
    },
  ]);
});

describe("swap actions (integration)", () => {
  it("createSwap rejects self-swap", async () => {
    const creator = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    makeAuthMock("test_clerk_creator");

    const result = await createSwap({
      recipientId: String(creator?._id),
      offeredSkillId: "react",
      requestedSkillId: "python",
    });

    const err = expectErr(result);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toContain("cannot swap with yourself");
  });

  it("createSwap creates pending swap with correct pairKey", async () => {
    const creator = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const target = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    makeAuthMock("test_clerk_target");

    const result = await createSwap({
      recipientId: String(creator?._id),
      offeredSkillId: "test_action_python",
      requestedSkillId: "test_action_react",
    });

    const data = expectOk(result);

    const created = await SwapModel.findOne({
      requesterId: target?._id,
      recipientId: creator?._id,
    }).lean();

    expect(created?.status).toBe("pending");
    expect(created?.pairKey).toBe(
      buildPairKey(
        String(target?._id),
        String(creator?._id),
        "test_action_python",
        "test_action_react",
      ),
    );
    expect(data.swapId).toBe(String(created?._id));
  });

  it("createSwap duplicate → AppError conflict", async () => {
    const creator = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const target = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    makeAuthMock("test_clerk_target");

    const payload = {
      recipientId: String(creator?._id),
      offeredSkillId: `test_python_${suffix}`,
      requestedSkillId: `test_react_${suffix}`,
    };

    const first = expectOk(await createSwap(payload));
    const second = await createSwap(payload);

    expect(first.swapId).toBeTruthy();
    const err = expectErr(second);
    expect(err.code).toBe("CONFLICT");

    const count = await SwapModel.countDocuments({
      requesterId: target?._id,
      recipientId: creator?._id,
      pairKey: buildPairKey(
        String(target?._id),
        String(creator?._id),
        payload.offeredSkillId,
        payload.requestedSkillId,
      ),
    });
    expect(count).toBe(1);
  });

  it("acceptSwap by recipient → status accepted", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_creator");

    const result = await acceptSwap(String(swap._id));

    const data = expectOk(result);
    expect(data.status).toBe("accepted");
  });

  it("acceptSwap by requester → AppError", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_target");

    const err = expectErr(await acceptSwap(String(swap._id)));
    expect(err.code).toBe("CONFLICT");
  });

  it("acceptSwap by non-participant → AppError forbidden", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const stranger = await UserModel.create({
      clerkId: "test_clerk_stranger",
      displayName: "Stranger",
      timezone: "UTC",
      teaches: [],
      learns: [],
    });
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_stranger");

    const err = expectErr(await acceptSwap(String(swap._id)));
    expect(err.code).toBe("FORBIDDEN");
    await UserModel.deleteOne({ _id: stranger._id });
  });

  it("declineSwap by recipient → status declined", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_creator");

    const data = expectOk(await declineSwap(String(swap._id)));
    expect(data.status).toBe("declined");
  });

  it("cancelSwap from pending by requester → status cancelled", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_target");

    const data = expectOk(await cancelSwap(String(swap._id)));
    expect(data.status).toBe("cancelled");
  });

  it("cancelSwap from pending by recipient → AppError", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "pending",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_creator");

    const err = expectErr(await cancelSwap(String(swap._id)));
    expect(err.code).toBe("CONFLICT");
  });

  it("completeSwap from accepted → status completed", async () => {
    const requester = await UserModel.findOne({
      clerkId: "test_clerk_target",
    }).lean();
    const recipient = await UserModel.findOne({
      clerkId: "test_clerk_creator",
    }).lean();
    const swap = await makeSwap(
      "accepted",
      new Types.ObjectId(requester?._id),
      new Types.ObjectId(recipient?._id),
    );
    makeAuthMock("test_clerk_target");

    const data = expectOk(await completeSwap(String(swap._id)));
    expect(data.status).toBe("completed");
  });
});
