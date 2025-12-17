import { Game, GameType, PokerRoom, CashGame, Tournament, User } from "@prisma/client";
import { haversineDistanceKm } from "@/lib/geo";

type Maybe<T> = T | null | undefined;

export interface RankedGame extends Game {
  pokerRoom: PokerRoom;
  cashGame?: Maybe<CashGame>;
  tournament?: Maybe<Tournament>;
}

const DEFAULT_TRAVEL_MAX_KM = 800;
const SCORE_DECIMALS = 4;

function normalize(value: number, min: number, max: number) {
  if (Number.isNaN(value) || Number.isNaN(min) || Number.isNaN(max) || max - min === 0) {
    return 0;
  }
  const clamped = Math.min(Math.max(value, min), max);
  return (clamped - min) / (max - min);
}

function computeDistanceScore(user: User, game: RankedGame) {
  if (!user.homeLat || !user.homeLng || !game.pokerRoom.latitude || !game.pokerRoom.longitude) {
    return 0.5; // neutral score when coordinates missing
  }
  const maxKm = user.maxTravelDistance ?? DEFAULT_TRAVEL_MAX_KM;
  const distance = haversineDistanceKm(
    { lat: user.homeLat, lng: user.homeLng },
    { lat: game.pokerRoom.latitude, lng: game.pokerRoom.longitude }
  );
  if (!maxKm) {
    return 0.5;
  }
  const ratio = Math.max(0, 1 - distance / maxKm);
  return Number(Math.min(1, ratio).toFixed(SCORE_DECIMALS));
}

function computeBankrollScore(user: User, game: RankedGame) {
  const minPref = user.preferredStakesMin ?? user.preferredStakesMax ?? 0;
  const maxPref = user.preferredStakesMax ?? minPref;
  let targetMin = minPref;
  let targetMax = maxPref || minPref || 1;

  if (game.gameType === GameType.CASH && game.cashGame) {
    targetMin = game.cashGame.minBuyin;
    targetMax = game.cashGame.maxBuyin;
  }
  if (game.gameType === GameType.TOURNAMENT && game.tournament) {
    targetMin = game.tournament.buyinAmount;
    targetMax = game.tournament.buyinAmount + (game.tournament.rakeAmount ?? 0);
  }
  const userSpan = Math.max(1, (user.preferredStakesMax ?? targetMax) - (user.preferredStakesMin ?? targetMin));
  const midpoint = (user.preferredStakesMin ?? targetMin) + userSpan / 2;
  const targetMidpoint = (targetMin + targetMax) / 2;
  const diff = Math.abs(midpoint - targetMidpoint);
  const normalizedDiff = normalize(diff, 0, Math.max(1, midpoint));
  return Number((1 - normalizedDiff).toFixed(SCORE_DECIMALS));
}

function parsePreferredStartTimes(preferredStartTimes: User["preferredStartTimes"]) {
  if (!preferredStartTimes) return [] as number[];
  if (Array.isArray(preferredStartTimes)) {
    return preferredStartTimes.filter((value): value is number => typeof value === "number");
  }
  if (typeof preferredStartTimes === "string") {
    try {
      const parsed = JSON.parse(preferredStartTimes);
      if (Array.isArray(parsed)) {
        return parsed.filter((value): value is number => typeof value === "number");
      }
    } catch (error) {
      console.warn("Could not parse preferredStartTimes", error);
    }
  }
  return [] as number[];
}

function computePreferenceScore(user: User, game: RankedGame) {
  let score = 0.5;
  const risk = (user.riskTolerance ?? "MEDIUM").toUpperCase();
  const bankrollProfile = (user.bankrollProfile ?? "BALANCED").toUpperCase();

  if (game.gameType === GameType.CASH && bankrollProfile !== "TOURNAMENT_ONLY") {
    score += 0.1;
  }
  if (game.gameType === GameType.TOURNAMENT && bankrollProfile !== "CASH_ONLY") {
    score += 0.1;
  }

  if (
    user.preferredVariants &&
    user.preferredVariants.length > 0 &&
    user.preferredVariants.includes(game.variant)
  ) {
    score += 0.1;
  }

  if (risk === "HIGH" && game.gameType === GameType.CASH && game.cashGame && game.cashGame.bigBlind >= 5) {
    score += 0.05;
  }
  if (risk === "LOW" && game.gameType === GameType.CASH && game.cashGame && game.cashGame.bigBlind <= 5) {
    score += 0.05;
  }

  if (game.gameType === GameType.TOURNAMENT && game.tournament) {
    const preferredStartTimes = parsePreferredStartTimes(user.preferredStartTimes);
    if (preferredStartTimes.length) {
      const startHour = new Date(game.tournament.startTime).getUTCHours();
      const diffs = preferredStartTimes.map((hour) => Math.abs(hour - startHour));
      const minDiff = Math.min(...diffs);
      score += minDiff <= 2 ? 0.1 : 0;
    }
  }

  return Number(Math.min(1, score).toFixed(SCORE_DECIMALS));
}

export function scoreGameForUser(user: User, game: RankedGame) {
  const preferenceMatch = computePreferenceScore(user, game);
  const distanceScore = computeDistanceScore(user, game);
  const bankrollScore = computeBankrollScore(user, game);
  const wP = 0.45;
  const wD = 0.3;
  const wB = 0.25;
  const score = Number((wP * preferenceMatch + wD * distanceScore + wB * bankrollScore).toFixed(SCORE_DECIMALS));

  return {
    score,
    breakdown: { preferenceMatch, distanceScore, bankrollScore },
  };
}

export const rankingHelpers = {
  computeDistanceScore,
  computeBankrollScore,
  computePreferenceScore,
};
