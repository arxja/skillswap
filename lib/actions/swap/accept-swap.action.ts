"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/actions/result";
import { requireCurrentUser } from "@/services/users/get-current-user";
import { transition } from "@/services/swaps/transition";

export async function acceptSwap(
  swapId: string,
): Promise<ActionResult<{ status: string }>> {
  return runAction(async () => {
    const me = await requireCurrentUser();
    const updated = await transition(swapId, String(me._id), "accept");
    revalidatePath("/dashboard");
    revalidatePath(`/swaps/${swapId}`);
    return { status: updated.status };
  });
}
