"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { requireCurrentUser } from "@/services/users/get-current-user";
import { transition } from "@/services/swaps/transition";

export async function completeSwap(
  swapId: string,
): Promise<ActionResult<{ status: string }>> {
  return runAction(async () => {
    const me = await requireCurrentUser();
    const updated = await transition(swapId, String(me._id), "complete");
    revalidatePath("/dashboard");
    revalidatePath(`/swaps/${swapId}`);
    return { status: updated.status };
  });
}
