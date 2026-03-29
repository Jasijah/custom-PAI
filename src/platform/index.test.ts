import { describe, expect, it } from "vitest";

import { getPlatformPathAdapter } from "./index.js";

describe("platform path adapters", () => {
  it("returns windows adapter and joins with backslashes", () => {
    const adapter = getPlatformPathAdapter("win32");
    expect(adapter.id).toBe("windows");
    expect(adapter.join("C:\\Users\\me", "clawd", "miya")).toBe(
      "C:\\Users\\me\\clawd\\miya",
    );
  });

  it("returns mac adapter and joins with slashes", () => {
    const adapter = getPlatformPathAdapter("darwin");
    expect(adapter.id).toBe("mac");
    expect(adapter.join("/Users/me", "clawd", "miya")).toBe(
      "/Users/me/clawd/miya",
    );
  });
});
