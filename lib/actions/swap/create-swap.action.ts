"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { AppError } from "@/lib/errors";
import { SwapModel } from "@/lib/database/models/swap.model";
import { requireCurrentUser } from "@/services/users/get-current-user";
import { buildPairKey } from "@/services/swaps/pair-key";
import { CreateSwapInput } from "@/lib/validation/swap.schema";

export async function createSwap(
  input: unknown,
): Promise<ActionResult<{ swapId: string }>> {
  return runAction(async () => {
    const data = CreateSwapInput.parse(input);
    const me = await requireCurrentUser();

    if (String(me._id) === data.recipientId) {
      throw AppError.badRequest("You cannot swap with yourself");
    }

    const pairKey = buildPairKey(
      String(me._id),
      data.recipientId,
      data.offeredSkillId,
      data.requestedSkillId,
    );

    try {
      const swap = await SwapModel.create({
        requesterId: me._id,
        recipientId: data.recipientId,
        requesterSkillId: data.offeredSkillId,
        recipientSkillId: data.requestedSkillId,
        pairKey,
        status: "pending",
      });

      revalidatePath("/dashboard");
      return { swapId: String(swap._id) };
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: number }).code === 11000
      ) {
        throw AppError.conflict(
          "An active swap for these skills already exists with this user",
        );
      }
      throw err;
    }
  });
}
