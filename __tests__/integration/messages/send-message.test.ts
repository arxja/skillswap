import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { connectDB, disconnectDB } from "@/lib/database/mongoose";
import { MessageModel } from "@/lib/database/models/message.model";
import { SwapModel } from "@/lib/database/models/swap.model";
import { UserModel } from "@/lib/database/models/user.model";
import { AppError } from "@/lib/errors";
import { sendMessage } from "@/services/messages/send-message";
import { listMessages } from "@/services/messages/list-messages";

let testSwapId: string;
let senderUserId: string;
let recipientUserId: string;

beforeAll(async () => {
  await connectDB();
  await UserModel.findOne({});

  const sender = await UserModel.create({
    clerkId: "test_clerk_msg_sender",
    displayName: "Sender User",
    teaches: [],
    learns: [],
    timezone: "UTC",
  });

  const recipient = await UserModel.create({
    clerkId: "test_clerk_msg_recipient",
    displayName: "Recipient User",
    teaches: [],
    learns: [],
    timezone: "UTC",
  });

  const swap = await SwapModel.create({
    requesterId: sender._id,
    recipientId: recipient._id,
    requesterSkillId: "test_msg_react",
    recipientSkillId: "test_msg_spanish",
    status: "accepted",
    pairKey: `test_msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  });

  senderUserId = String(sender._id);
  recipientUserId = String(recipient._id);
  testSwapId = String(swap._id);
}, 30_000);

afterAll(async () => {
  await MessageModel.deleteMany({ swapId: { $in: [testSwapId] } });
  await SwapModel.deleteMany({ requesterSkillId: /^test_msg_/ });
  await UserModel.deleteMany({ clerkId: /^test_clerk_msg_/ });
  await disconnectDB();
}, 30_000);

describe("message service integration", () => {
  it("sendMessage persists and returns normalized payload", async () => {
    const message = await sendMessage(
      testSwapId,
      "test_clerk_msg_sender",
      "Hello from sender",
    );

    expect(message).toMatchObject({
      swapId: testSwapId,
      senderId: senderUserId,
      senderDisplayName: "Sender User",
      body: "Hello from sender",
    });
    expect(message._id).toBeTypeOf("string");
    expect(message.createdAt).toEqual(expect.any(String));
    expect(new Date(message.createdAt).toISOString()).toBe(message.createdAt);
  });

  it("sendMessage rejects a non-participant", async () => {
    const outsider = await UserModel.create({
      clerkId: "test_clerk_msg_stranger",
      displayName: "Stranger User",
      teaches: [],
      learns: [],
      timezone: "UTC",
    });

    await expect(
      sendMessage(testSwapId, outsider.clerkId, "not allowed"),
    ).rejects.toThrow(AppError);

    await UserModel.deleteOne({ _id: outsider._id });
  });

  it("sendMessage rejects empty body", async () => {
    await expect(
      sendMessage(testSwapId, "test_clerk_msg_sender", ""),
    ).rejects.toThrow();
  });

  it("sendMessage rejects nonexistent swap", async () => {
    const missingSwapId = "507f1f77bcf86cd799439011";

    await expect(
      sendMessage(missingSwapId, "test_clerk_msg_sender", "oops"),
    ).rejects.toThrow(AppError);
  });

  it("listMessages returns ordered messages for participants", async () => {
    const first = await sendMessage(
      testSwapId,
      "test_clerk_msg_sender",
      "first message",
    );
    const second = await sendMessage(
      testSwapId,
      "test_clerk_msg_sender",
      "second message",
    );

    const messages = await listMessages(testSwapId, "test_clerk_msg_sender");
    const ids = messages.map((m) => m._id);

    expect(ids).toContain(first._id);
    expect(ids).toContain(second._id);
    expect(messages).toEqual(
      [...messages].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    );
  });
});
