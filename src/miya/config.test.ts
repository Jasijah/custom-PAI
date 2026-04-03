import { describe, expect, it } from "vitest";

import { resolveMiyaBaseDir } from "./config.js";

describe("resolveMiyaBaseDir", () => {
  it("appends miya directory without duplicating separators", () => {
    expect(resolveMiyaBaseDir("/tmp/clawd/")).toBe("/tmp/clawd/miya");
  });

  it("supports windows-style workspace paths", () => {
    expect(resolveMiyaBaseDir("C:\\Users\\alice\\clawd\\")).toBe(
      "C:\\Users\\alice\\clawd\\miya",
    );
  });
});
