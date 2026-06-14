import { describe, it, expect } from "vitest";
import { vnTime, vnDateKey, vnShortDateTime, pad } from "@/lib/time";

// 2026-06-13T19:00:00Z = 02:00 ngày 14/06 giờ VN (UTC+7)
const iso = "2026-06-13T19:00:00Z";

describe("time helpers (UTC+7)", () => {
  it("pad", () => {
    expect(pad(3)).toBe("03");
    expect(pad(12)).toBe("12");
  });
  it("vnTime shifts to UTC+7", () => {
    expect(vnTime(iso)).toBe("02:00");
  });
  it("vnDateKey uses VN date", () => {
    expect(vnDateKey(iso)).toBe("2026-06-14");
  });
  it("vnShortDateTime", () => {
    expect(vnShortDateTime(iso)).toBe("14/06 02:00");
  });
});
