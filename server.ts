import "dotenv/config";

import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { verifyToken } from "@clerk/nextjs/server";

import { connectDB } from "@/lib/database/mongoose";
import { UserModel } from "@/lib/database/models/user.model";
import { SwapModel } from "@/lib/database/models/swap.model";
import { AppError } from "@/lib/errors";
import { sendMessage } from "@/services/messages/send-message";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });

async function start() {
  await app.prepare();

  const httpServer = createServer((req, res) => {
    app.getRequestHandler()(req, res);
  });

  const io = new Server(httpServer, {
    path: "/ws",
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token || typeof token !== "string") {
      return next(new Error("UNAUTHORIZED"));
    }

    try {
      const payload = await verifyToken(token, {});
      socket.data.clerkId = payload.sub;
      next();
    } catch {
      next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("join_swap", async (payload, callback) => {
      const swapId = typeof payload?.swapId === "string" ? payload.swapId : "";
      if (!swapId) {
        callback?.({ ok: false, code: "FORBIDDEN" });
        return;
      }

      try {
        await connectDB();
        const swap = await SwapModel.findById(swapId).lean();
        const user = await UserModel.findOne({
          clerkId: socket.data.clerkId,
        }).lean();

        if (!swap || !user) {
          callback?.({ ok: false, code: "FORBIDDEN" });
          return;
        }

        const participantIds = [
          String(swap.requesterId),
          String(swap.recipientId),
        ];
        const userId = String(user._id);
        const isParticipant = participantIds.includes(userId);

        if (!isParticipant) {
          callback?.({ ok: false, code: "FORBIDDEN" });
          return;
        }

        socket.join(`swap:${swapId}`);
        callback?.({ ok: true });
      } catch {
        callback?.({ ok: false, code: "FORBIDDEN" });
      }
    });

    socket.on("send_message", async (payload, callback) => {
      const swapId = typeof payload?.swapId === "string" ? payload.swapId : "";
      const body = typeof payload?.body === "string" ? payload.body : "";

      try {
        const message = await sendMessage(swapId, socket.data.clerkId, body);
        io.to(`swap:${swapId}`).emit("new_message", message);
        callback?.({ ok: true, message });
      } catch (error) {
        const appError = error instanceof AppError ? error : undefined;
        callback?.({
          ok: false,
          code: appError?.errorCode ?? "INTERNAL_ERROR",
        });
      }
    });

    socket.on("leave_swap", (payload) => {
      const swapId = typeof payload?.swapId === "string" ? payload.swapId : "";
      if (swapId) {
        socket.leave(`swap:${swapId}`);
      }
    });
  });

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/ws")) {
      return;
    }

    app.getUpgradeHandler()(req, socket, head);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Ready on http://${hostname}:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start custom server:", error);
  process.exit(1);
});
