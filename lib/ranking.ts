import { Game, GameType, PokerRoom, CashGame, Tournament, User, BankrollAccount, Provider } from "@prisma/client";
import { haversineDistanceKm } from "@/lib/geo";

type Maybe<T> = T | null | undefined;

export interface RankedGame extends Game {
  pokerRoom: PokerRoom;
  cashGame?: Maybe<CashGame>;
  tournament?: Maybe<Tournament>;
}

export interface BankrollContext {
  accounts: BankrollAccount[];
  totalEffectiveBankroll: number;
}

const DEFAULT_TRAVEL_MAX_KM = 800;
const SCORE_DECIMALS = 4;

// Comfortable buy-in thresholds as percentage of bankroll
const COMFORTABLE_BUYIN_RATIO = 0.05; // 5% of bankroll = very comfortable
const MAX_BUYIN_RATIO = 0.20; // 20% of bankroll = max recommended

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

// Legacy bankroll score using preferences only (fallback)
function computeBankrollScoreLegacy(user: User, game: RankedGame) {
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

// Determine which provider a game belongs to
function getGameProvider(game: RankedGame): Provider {
  // Online games are identified by room name patterns
  const roomName = game.pokerRoom.name.toLowerCase();

  if (roomName.includes("pokerstars")) return Provider.POKERSTARS;
  if (roomName.includes("gg poker") || roomName.includes("ggpoker")) return Provider.GG_POKER;
  if (roomName.includes("888")) return Provider.POKER_888;
  if (roomName.includes("partypoker") || roomName.includes("party poker")) return Provider.PARTY_POKER;
  if (roomName.includes("wpt")) return Provider.WPT_GLOBAL;
  if (roomName.includes("wsop")) return Provider.WSOP_ONLINE;

  // Default to LIVE_ROLL for physical poker rooms
  return Provider.LIVE_ROLL;
}

// Get the effective bankroll for a specific game
function getEffectiveBankrollForGame(
  bankrollContext: BankrollContext | undefined,
  game: RankedGame
): number {
  if (!bankrollContext || bankrollContext.accounts.length === 0) {
    return 0;
  }

  const gameProvider = getGameProvider(game);

  // Find matching account
  const account = bankrollContext.accounts.find(
    (acc) => acc.provider === gameProvider && acc.isActive
  );

  if (account) {
    return account.balance + account.depositTolerance;
  }

  // For live games, check LIVE_ROLL account
  if (gameProvider === Provider.LIVE_ROLL) {
    const liveAccount = bankrollContext.accounts.find(
      (acc) => acc.provider === Provider.LIVE_ROLL && acc.isActive
    );
    if (liveAccount) {
      return liveAccount.balance + liveAccount.depositTolerance;
    }
  }

  return 0;
}

// Get the buy-in amount for a game (in cents)
function getGameBuyIn(game: RankedGame): { min: number; max: number; typical: number } {
  if (game.gameType === GameType.CASH && game.cashGame) {
    return {
      min: game.cashGame.minBuyin,
      max: game.cashGame.maxBuyin,
      typical: Math.round((game.cashGame.minBuyin + game.cashGame.maxBuyin) / 2),
    };
  }

  if (game.gameType === GameType.TOURNAMENT && game.tournament) {
    const total = game.tournament.buyinAmount + (game.tournament.rakeAmount ?? 0);
    return {
      min: total,
      max: total,
      typical: total,
    };
  }

  return { min: 0, max: 0, typical: 0 };
}

// Enhanced bankroll score using real account data
function computeBankrollScore(
  user: User,
  game: RankedGame,
  bankrollContext?: BankrollContext
): { score: number; canAfford: boolean; affordabilityRatio: number } {
  // If no bankroll context, fall back to legacy scoring
  if (!bankrollContext || bankrollContext.accounts.length === 0) {
    return {
      score: computeBankrollScoreLegacy(user, game),
      canAfford: true, // Assume they can afford if we don't have data
      affordabilityRatio: 1,
    };
  }

  const effectiveBankroll = getEffectiveBankrollForGame(bankrollContext, game);
  const buyIn = getGameBuyIn(game);

  // Can't afford at all
  if (effectiveBankroll < buyIn.min) {
    return {
      score: 0,
      canAfford: false,
      affordabilityRatio: effectiveBankroll / buyIn.min,
    };
  }

  // Calculate how comfortable this buy-in is
  const buyInRatio = buyIn.typical / effectiveBankroll;

  let score: number;
  if (buyInRatio <= COMFORTABLE_BUYIN_RATIO) {
    // Very comfortable - 5% or less of bankroll
    score = 1.0;
  } else if (buyInRatio <= MAX_BUYIN_RATIO) {
    // Moderate risk - scale from 1.0 to 0.5
    const normalized = (buyInRatio - COMFORTABLE_BUYIN_RATIO) / (MAX_BUYIN_RATIO - COMFORTABLE_BUYIN_RATIO);
    score = 1.0 - (normalized * 0.5);
  } else {
    // High risk - scale from 0.5 down to 0.1
    const overMax = buyInRatio / MAX_BUYIN_RATIO;
    score = Math.max(0.1, 0.5 / overMax);
  }

  // Adjust based on user's risk tolerance
  const risk = (user.riskTolerance ?? "MEDIUM").toUpperCase();
  if (risk === "HIGH") {
    score = Math.min(1, score * 1.2); // More tolerant of higher buy-ins
  } else if (risk === "LOW") {
    score = score * 0.8; // More conservative
  }

  return {
    score: Number(score.toFixed(SCORE_DECIMALS)),
    canAfford: true,
    affordabilityRatio: 1 - buyInRatio,
  };
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

export interface ScoreResult {
  score: number;
  breakdown: {
    preferenceMatch: number;
    distanceScore: number;
    bankrollScore: number;
  };
  affordability: {
    canAfford: boolean;
    ratio: number;
    provider: Provider;
  };
}

export function scoreGameForUser(
  user: User,
  game: RankedGame,
  bankrollContext?: BankrollContext
): ScoreResult {
  const preferenceMatch = computePreferenceScore(user, game);
  const distanceScore = computeDistanceScore(user, game);
  const bankrollResult = computeBankrollScore(user, game, bankrollContext);

  // Use custom weights from user or defaults
  const wP = user.preferenceWeight ?? 0.45;
  const wD = user.distanceWeight ?? 0.3;
  const wB = user.bankrollWeight ?? 0.25;

  // Calculate base score
  let score = wP * preferenceMatch + wD * distanceScore + wB * bankrollResult.score;

  // If user can't afford, heavily penalize but don't eliminate
  // (they might want to see aspirational games)
  if (!bankrollResult.canAfford) {
    score = score * 0.3;
  }

  return {
    score: Number(score.toFixed(SCORE_DECIMALS)),
    breakdown: {
      preferenceMatch,
      distanceScore,
      bankrollScore: bankrollResult.score,
    },
    affordability: {
      canAfford: bankrollResult.canAfford,
      ratio: bankrollResult.affordabilityRatio,
      provider: getGameProvider(game),
    },
  };
}

// Legacy function for backward compatibility
export function scoreGameForUserLegacy(user: User, game: RankedGame) {
  const result = scoreGameForUser(user, game);
  return {
    score: result.score,
    breakdown: result.breakdown,
  };
}

export const rankingHelpers = {
  computeDistanceScore,
  computeBankrollScore,
  computeBankrollScoreLegacy,
  computePreferenceScore,
  getGameProvider,
  getEffectiveBankrollForGame,
  getGameBuyIn,
};
