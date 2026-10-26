import "server-only";
import { SwapModel } from "@/lib/database/models/swap.model";
import { connectDB } from "@/lib/database/mongoose";
import { AppError } from "@/lib/errors";
import { canTransition, type SwapAction, type Actor } from "./state-machine";

export async function transition(
  swapId: string,
  actorId: string, // Mongo _id (string) of whoever is firing the action
  action: SwapAction,
) {
  await connectDB();

  const swap = await SwapModel.findById(swapId).lean();
  if (!swap) {
    throw AppError.notFound("Swap");
  }

  // Resolve actor role. Note: 403 leaks existence; 404 hides it.
  // v1 uses 403 for clearer dev UX; flip to 404 in production.
  let actor: Actor;
  if (String(swap.requesterId) === actorId) {
    actor = "requester";
  } else if (String(swap.recipientId) === actorId) {
    actor = "recipient";
  } else {
    throw AppError.forbidden("You are not a participant in this swap.");
  }

  const next = canTransition(swap.status, action, actor);
  if (next === null) {
    throw AppError.conflict(
      `Action "${action}" is not allowed from status "${swap.status}".`,
    );
  }

  // Guard: status in filter, not just _id. If another caller changed status
  // between our read and this write, the filter matches zero docs → null.
  const updated = await SwapModel.findOneAndUpdate(
    { _id: swapId, status: swap.status },
    { $set: { status: next } },
    { returnDocument: "after", lean: true },
  );

  if (!updated) {
    throw AppError.conflict(
      "Swap status changed while processing this action.",
    );
  }

  return updated;
}
