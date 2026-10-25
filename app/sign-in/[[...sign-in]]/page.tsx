import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense fallback={<div className="h-32 w-32 animate-pulse rounded-lg bg-border" />}>
        <SignIn />
      </Suspense>
    </div>
  );
}
