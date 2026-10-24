import "server-only";
import mongoose from "mongoose";
import { config } from "@/lib/config/server";
import { AppError } from "@/lib/errors";

export interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

const MONGODB_URI = config.DATABASE_URL;
// Defense-in-depth; config already validates but this module shouldn't silently run without a URI.
if (!MONGODB_URI) {
  throw new AppError("Please define DATABASE_URL environment variable", 500);
}

export async function connectDB(): Promise<mongoose.Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      // bufferCommands:false — queries before connection throw instead of
      // queueing. Every service function must `await connectDB()` first.
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongoose) => mongoose.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
