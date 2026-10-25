import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";

export default function Header() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="text-lg font-semibold tracking-tight text-stone-900">
          SkillSwap
        </div>

        <div>
          <Suspense>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </Suspense>
          <Suspense>
            <Show when="signed-out">
              <SignInButton mode="modal" />
            </Show>
          </Suspense>
        </div>
      </div>
    </header>
  );
}
