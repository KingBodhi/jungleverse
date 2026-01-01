import { describe, expect, it } from "vitest";
import { GameType, type CashGame, type PokerRoom, type User } from "@prisma/client";
import { rankingHelpers, scoreGameForUser, type RankedGame } from "@/lib/ranking";

const randomId = () => Math.random().toString(36).slice(2);

const baseRoom: PokerRoom = {
  id: "room_1",
  name: "Test Room",
  brand: "Sample",
  address: "123 Main",
  city: "Las Vegas",
  state: "NV",
  country: "USA",
  latitude: 36.1147,
  longitude: -115.1728,
  timezone: "America/Los_Angeles",
  website: null,
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  games: [],
};

const baseUser: User = {
  id: "user_1",
  email: "player@example.com",
  username: "player",
  hashedPassword: "hash",
  homeLat: 36.1699,
  homeLng: -115.1398,
  bankrollProfile: "BALANCED",
  riskTolerance: "MEDIUM",
  preferredStakesMin: 2,
  preferredStakesMax: 5,
  maxTravelDistance: 800,
  preferredStartTimes: [10, 18],
  createdAt: new Date(),
  updatedAt: new Date(),
  preferenceSnapshots: [],
};

function buildCashGame(overrides: Partial<CashGame> = {}): CashGame {
  return {
    id: overrides.id ?? randomId(),
    gameId: overrides.gameId ?? randomId(),
    smallBlind: overrides.smallBlind ?? 1,
    bigBlind: overrides.bigBlind ?? 2,
    minBuyin: overrides.minBuyin ?? 100,
    maxBuyin: overrides.maxBuyin ?? 400,
    usualDaysOfWeek: overrides.usualDaysOfWeek ?? ["Mon", "Wed", "Fri"],
    usualHours: overrides.usualHours ?? { start: "10:00", end: "04:00" },
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

function buildRankedGame(overrides: Partial<RankedGame> = {}): RankedGame {
  const cashGame = overrides.cashGame ?? buildCashGame({ gameId: overrides.id ?? randomId() });
  return {
    id: overrides.id ?? cashGame.gameId,
    pokerRoomId: overrides.pokerRoomId ?? baseRoom.id,
    pokerRoom: overrides.pokerRoom ?? baseRoom,
    gameType: overrides.gameType ?? GameType.CASH,
    variant: overrides.variant ?? "NLHE",
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    cashGame: overrides.gameType === GameType.TOURNAMENT ? null : cashGame,
    tournament: overrides.tournament ?? null,
    preferences: [],
  } as RankedGame;
}

describe("ranking", () => {
  it("prefers nearby cash games", () => {
    const nearGame = buildRankedGame();
    const farRoom: PokerRoom = { ...baseRoom, id: "room_far", latitude: 48.8566, longitude: 2.3522 };
    const farGame = buildRankedGame({ pokerRoom: farRoom, pokerRoomId: farRoom.id, id: "game_far" });

    const nearScore = scoreGameForUser(baseUser, nearGame);
    const farScore = scoreGameForUser(baseUser, farGame);

    expect(nearScore.score).toBeGreaterThan(farScore.score);
  });

  it("rewards bankroll alignment", () => {
    const aligned = buildRankedGame({
      cashGame: buildCashGame({ minBuyin: 2, maxBuyin: 4, smallBlind: 1, bigBlind: 2 }),
    });
    const highStakes = buildRankedGame({
      cashGame: buildCashGame({ minBuyin: 1000, maxBuyin: 5000, smallBlind: 10, bigBlind: 20 }),
    });

    const lowBankrollUser: User = {
      ...baseUser,
      preferredStakesMin: 1,
      preferredStakesMax: 3,
    };
    const alignedResult = rankingHelpers.computeBankrollScore(lowBankrollUser, aligned);
    const highResult = rankingHelpers.computeBankrollScore(lowBankrollUser, highStakes);

    expect(alignedResult.score).toBeGreaterThan(highResult.score);
  });

  it("computes positive distance scores", () => {
    const score = rankingHelpers.computeDistanceScore(baseUser, buildRankedGame());
    expect(score).toBeGreaterThan(0.9);
  });
});
