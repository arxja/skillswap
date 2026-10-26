import { z } from "zod";

export const CreateSwapInput = z.object({
  recipientId: z.string().min(1),
  offeredSkillId: z.string().min(1),
  requestedSkillId: z.string().min(1),
});

export type CreateSwapInput = z.infer<typeof CreateSwapInput>;
