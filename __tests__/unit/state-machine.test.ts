import { describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { canTransition } from "@/services/swaps/state-machine";

describe("canTransition", () => {
  it("should allow accept from pending by recipient", () => {
    const result = canTransition("pending", "accept", "recipient");
    expect(result).toBe("accepted");
  });

  it("should not allow accept from pending by requester", () => {
    const result = canTransition("pending", "accept", "requester");
    expect(result).toBeNull();
  });

  it("should not allow any transition out of completed", () => {
    const result = canTransition("completed", "cancel", "recipient");
    expect(result).toBeNull();
  });

  it("should not allow complete from pending (skipping accept)", () => {
    const result = canTransition("pending", "complete", "recipient");
    expect(result).toBeNull();
  });

  it("should not allow recipient to cancel a pending swap", () => {
    const result = canTransition("pending", "cancel", "recipient");
    expect(result).toBeNull();
  });
});
