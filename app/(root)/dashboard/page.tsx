import { redirect } from "next/navigation";
import { getCurrentUser } from "@/services/users/get-current-user";
import { Suspense } from "react";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");

  return (
    <Suspense>
      <main className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold text-stone-900">
          Welcome, {user.displayName}
        </h1>
        <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 p-6">
          <p className="text-base text-stone-700">
            Your matches will appear here.
          </p>
        </div>
      </main>
    </Suspense>
  );
}
