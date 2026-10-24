import { describe, it, expect, vi } from "vitest";

// `vi.mock` is hoisted above imports by Vitest's transform, so its position
// here is irrelevant — the module is mocked before the import below runs.
vi.mock("server-only", () => ({}));

import { buildPairKey } from "@/services/swaps/pair-key";

describe("buildPairKey", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // The invariant that makes the partial unique index work: swapping the
  // arguments must not change the key. One case proves this — the function
  // has no branches, so every case takes the same code path.
  // ───────────────────────────────────────────────────────────────────────────
  it("is direction-independent", () => {
    expect(buildPairKey("you", "ana", "spanish", "react")).toBe(
      buildPairKey("ana", "you", "react", "spanish"),
    );
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Input → output contract. Covers canonical ordering, already-sorted inputs,
  // and degenerate values. Every row asserts the exact string that gets stored
  // and indexed in the DB, so a format change fails loudly.
  // ───────────────────────────────────────────────────────────────────────────
  it.each([
    // canonical: unsorted inputs must be normalized
    {
      userA: "ana",
      userB: "you",
      skillA: "react",
      skillB: "spanish",
      expected: "ana:you:react:spanish",
    },
    {
      userA: "you",
      userB: "ana",
      skillA: "spanish",
      skillB: "react",
      expected: "ana:you:react:spanish",
    },
    {
      userA: "bob",
      userB: "alice",
      skillA: "ts",
      skillB: "js",
      expected: "alice:bob:js:ts",
    },
    // already sorted — sort must be a no-op
    {
      userA: "alice",
      userB: "bob",
      skillA: "js",
      skillB: "ts",
      expected: "alice:bob:js:ts",
    },
    // degenerate but valid
    {
      userA: "ana",
      userB: "ana",
      skillA: "react",
      skillB: "react",
      expected: "ana:ana:react:react",
    },
    { userA: "", userB: "b", skillA: "", skillB: "z", expected: ":b::z" },
    { userA: "", userB: "", skillA: "", skillB: "", expected: ":::" },
  ])(
    "buildPairKey($userA, $userB, $skillA, $skillB) → $expected",
    ({ userA, userB, skillA, skillB, expected }) => {
      expect(buildPairKey(userA, userB, skillA, skillB)).toBe(expected);
    },
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Known limitation, not desired behavior: `:` is not escaped, so two
  // distinct swaps can produce the same key. Kept separate from the table
  // above because it documents a risk, not a contract — and it should be
  // visible, searchable, and hard to delete by accident.
  // ───────────────────────────────────────────────────────────────────────────
  it("does not escape `:` in values (known limitation)", () => {
    // Two different swaps collide on the same pair key:
    expect(buildPairKey("a:b", "c", "x", "y")).toBe("a:b:c:x:y");
    expect(buildPairKey("a", "b:c", "x", "y")).toBe("a:b:c:x:y");
  });
});
