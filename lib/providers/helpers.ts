import { GameVariant } from "@prisma/client";

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

const MONTH_MAP: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

export function sanitizeText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function parseCurrency(rawValue: string | undefined | null) {
  if (!rawValue) return null;
  const cleaned = rawValue.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed)) return null;
  return Math.round(parsed);
}

export function inferVariantFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("plo5")) return GameVariant.PLO5;
  if (lower.includes("plo") || lower.includes("omaha")) return GameVariant.PLO;
  if (lower.includes("short deck")) return GameVariant.MIXED;
  if (lower.includes("mix")) return GameVariant.MIXED;
  if (lower.includes("stud")) return GameVariant.OTHER;
  return GameVariant.NLHE;
}

export function expandDaysExpression(label: string | undefined) {
  if (!label) return [0, 1, 2, 3, 4, 5, 6];
  const normalized = label.toLowerCase();
  if (normalized.includes("daily") || normalized.includes("every")) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  const tokens = normalized
    .split(/[,/&]/)
    .map((token) => token.replace(/-/g, " - "))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean);
  const days = new Set<number>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "-") {
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      if (prev && next) {
        addRange(days, prev, next);
      }
      continue;
    }
    addDay(days, token);
  }
  if (!days.size) {
    return [0, 1, 2, 3, 4, 5, 6];
  }
  return Array.from(days.values()).sort((a, b) => a - b);
}

function addDay(target: Set<number>, label: string) {
  const key = label.replace(/[^a-z]/g, "");
  if (DAY_MAP[key] !== undefined) {
    target.add(DAY_MAP[key]);
  }
}

function addRange(target: Set<number>, startLabel: string, endLabel: string) {
  const start = DAY_MAP[startLabel.replace(/[^a-z]/g, "")];
  const end = DAY_MAP[endLabel.replace(/[^a-z]/g, "")];
  if (start === undefined || end === undefined) return;
  let current = start;
  for (let i = 0; i < 7; i++) {
    target.add(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
}

export function parseUtcTimeLabel(label: string) {
  const match = sanitizeText(label).match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    throw new Error(`Unable to parse UTC time: ${label}`);
  }
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour > 23 || minute > 59) {
    throw new Error(`Invalid time ${label}`);
  }
  return { hour, minute };
}

export function getNextUtcOccurrence(dayIndexes: number[], hour: number, minute: number) {
  const now = new Date();
  let chosen: Date | null = null;
  for (const day of dayIndexes) {
    const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
    const delta = (day - candidate.getUTCDay() + 7) % 7;
    candidate.setUTCDate(candidate.getUTCDate() + delta);
    if (delta === 0 && candidate <= now) {
      candidate.setUTCDate(candidate.getUTCDate() + 7);
    }
    if (!chosen || candidate < chosen) {
      chosen = candidate;
    }
  }
  return chosen ?? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
}

export function parseUsDateLabel(label: string) {
  const sanitized = sanitizeText(label).replace(/,/g, "");
  const parts = sanitized.split(" ");
  if (parts.length < 3) {
    throw new Error(`Unable to parse date ${label}`);
  }
  const month = MONTH_MAP[parts[0].toLowerCase()];
  const day = Number.parseInt(parts[1], 10);
  const year = Number.parseInt(parts[2], 10);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) {
    throw new Error(`Invalid date ${label}`);
  }
  return { month, day, year };
}

export function parseMeridianTimeLabel(label: string) {
  const normalized = sanitizeText(label).replace(/(am|pm)$/i, " $1");
  const match = normalized.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (!match) {
    throw new Error(`Unable to parse time ${label}`);
  }
  let hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  const meridian = match[3].toLowerCase();
  hour = hour % 12;
  if (meridian === "pm") {
    hour += 12;
  }
  return { hour, minute };
}

export function toEasternUtcDate(
  dateParts: { year: number; month: number; day: number },
  timeParts: { hour: number; minute: number }
) {
  const offsetMinutes = getEasternOffsetMinutes(dateParts.year, dateParts.month, dateParts.day, timeParts.hour, timeParts.minute);
  const utcMillis = Date.UTC(
    dateParts.year,
    dateParts.month,
    dateParts.day,
    timeParts.hour + offsetMinutes / 60,
    timeParts.minute
  );
  return new Date(utcMillis);
}

function getEasternOffsetMinutes(year: number, month: number, day: number, hour: number, minute: number) {
  const dstStartDay = nthDow(year, 2, 0, 2); // second Sunday in March
  const dstEndDay = nthDow(year, 10, 0, 1); // first Sunday in November
  const afterStart =
    month > 2 ||
    (month === 2 && (day > dstStartDay || (day === dstStartDay && (hour >= 2))));
  const beforeEnd =
    month < 10 ||
    (month === 10 && (day < dstEndDay || (day === dstEndDay && hour < 2)));
  return afterStart && beforeEnd ? 240 : 300;
}

function nthDow(year: number, month: number, desiredDow: number, nth: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const firstDow = first.getUTCDay();
  const offset = (7 + desiredDow - firstDow) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  return day;
}
