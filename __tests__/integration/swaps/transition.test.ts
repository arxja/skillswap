import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { Types } from "mongoose";
import { connectDB, disconnectDB } from "@/lib/database/mongoose";
import { SwapModel } from "@/lib/database/models/swap.model";
import { transition } from "@/services/swaps/transition";
import { AppError } from "@/lib/errors";
import type { SwapStatus } from "@/services/swaps/state-machine";

// ─── SETUP ─────────────────────────────────────────────

beforeAll(
  async () => {
    await connectDB();
    await SwapModel.findOne({}); // ← warm the pool before tests run
  },
  30_000, // 30s timeout for initial connection
);

afterAll(async () => {
  await SwapModel.deleteMany({ requesterSkillId: /^test_/ });
  await disconnectDB();
});

async function makeSwap(status: SwapStatus = "pending") {
  const requesterId = new Types.ObjectId();
  const recipientId = new Types.ObjectId();

  return SwapModel.create({
    requesterId,
    recipientId,
    requesterSkillId: "test_react",
    recipientSkillId: "test_spanish",
    // Unique per call — partial unique index on pairKey only fires when
    // status ∈ {pending, accepted}, and random suffix guarantees no collision.
    pairKey: `test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status,
  });
}

// ─── HAPPY PATH ─────────────────────────────────────────────

describe("transition (integration)", () => {
  it("accepts a pending swap when fired by recipient", async () => {
    const swap = await makeSwap("pending");

    const updated = await transition(
      String(swap._id),
      String(swap.recipientId),
      "accept",
    );

    expect(updated.status).toBe("accepted");

    const fresh = await SwapModel.findById(swap._id).lean();
    expect(fresh?.status).toBe("accepted");
  });

  // ---- ILLEGAL / FORBIDDEN ----

  it("rejects a second accept — already accepted", async () => {
    const swap = await makeSwap("pending");

    // First accept succeeds
    await transition(String(swap._id), String(swap.recipientId), "accept");

    // Second accept — canTransition("accepted", "accept", "recipient") → null
    await expect(
      transition(String(swap._id), String(swap.recipientId), "accept"),
    ).rejects.toThrow(AppError);
  });

  it("rejects a transition from a non-participant", async () => {
    const swap = await makeSwap("pending");
    const stranger = new Types.ObjectId();

    await expect(
      transition(String(swap._id), String(stranger), "accept"),
    ).rejects.toThrow(AppError);
  });

  it("rejects complete on a pending swap (skipping accept)", async () => {
    const swap = await makeSwap("pending");

    await expect(
      transition(String(swap._id), String(swap.recipientId), "complete"),
    ).rejects.toThrow(/not allowed from status "pending"/);
  });

  // ---- RACE: two different actions, same swap ----
  // This is the test that proves the atomic write. If both succeed, the
  // filter on findOneAndUpdate is missing `status: swap.status`.

  it("two concurrent transitions on accepted swap → exactly one wins", async () => {
    const swap = await makeSwap("accepted");

    const results = await Promise.allSettled([
      transition(String(swap._id), String(swap.requesterId), "complete"),
      transition(String(swap._id), String(swap.recipientId), "cancel"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(AppError);

    // Final status must be one of the two valid end states — not still "accepted".
    const fresh = await SwapModel.findById(swap._id).lean();
    expect(["completed", "cancelled"]).toContain(fresh?.status);
  });

  // ─── RACE: same action fired twice ─────────────────────────────────────────────

  it("same action fired twice → one succeeds, one conflicts", async () => {
    const swap = await makeSwap("pending");

    const results = await Promise.allSettled([
      transition(String(swap._id), String(swap.recipientId), "accept"),
      transition(String(swap._id), String(swap.recipientId), "accept"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(AppError);

    const fresh = await SwapModel.findById(swap._id).lean();
    expect(fresh?.status).toBe("accepted");
  });
});
