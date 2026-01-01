import { describe, expect, it } from "vitest";
import {
  expandDaysExpression,
  parseCurrency,
  parseMeridianTimeLabel,
  parseUsDateLabel,
  toEasternUtcDate,
} from "./helpers";

describe("provider helpers", () => {
  it("parses currency strings", () => {
    expect(parseCurrency("$1,250")).toBe(1250);
    expect(parseCurrency("1.88")).toBe(2);
    expect(parseCurrency("$0")).toBe(0);
  });

  it("expands weekday expressions", () => {
    expect(expandDaysExpression("Mon - Wed")).toEqual([1, 2, 3]);
    expect(expandDaysExpression("Sat & Sun")).toEqual([0, 6]);
    expect(expandDaysExpression("Daily")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("parses AM/PM labels", () => {
    const parts = parseMeridianTimeLabel("12:05pm");
    expect(parts).toEqual({ hour: 12, minute: 5 });
  });

  it("converts eastern date to UTC honoring DST", () => {
    const dateParts = parseUsDateLabel("July 10, 2025");
    const summer = toEasternUtcDate(dateParts, { hour: 12, minute: 0 });
    expect(summer.toISOString()).toBe("2025-07-10T16:00:00.000Z");

    const winterParts = parseUsDateLabel("December 10, 2025");
    const winter = toEasternUtcDate(winterParts, { hour: 12, minute: 0 });
    expect(winter.toISOString()).toBe("2025-12-10T17:00:00.000Z");
  });
});
