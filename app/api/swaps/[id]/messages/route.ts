import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { listMessages } from "@/services/messages/list-messages";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: swapId } = await params;
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const since = req.nextUrl.searchParams.get("since") ?? undefined;
    const rawLimit = req.nextUrl.searchParams.get("limit") ?? "100";
    const limit = Number.parseInt(rawLimit, 10);
    const messages = await listMessages(swapId, clerkId, {
      since,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
