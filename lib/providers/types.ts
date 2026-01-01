import { GameVariant } from "@prisma/client";

export type ProviderCategory = "ONLINE" | "IRL";

export interface NormalizedTournament {
  pokerRoom: string;
  variant: GameVariant;
  startTime: Date;
  buyinAmount: number;
  rakeAmount?: number;
  startingStack?: number;
  blindLevelMinutes?: number;
  reentryPolicy?: string;
  bountyAmount?: number;
  recurringRule?: string;
  estimatedPrizePool?: number;
  typicalFieldSize?: number;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedCashGame {
  pokerRoom: string;
  variant: GameVariant;
  smallBlind: number;
  bigBlind: number;
  minBuyin: number;
  maxBuyin: number;
  usualDaysOfWeek?: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderConnector {
  name: string;
  type: ProviderCategory;
  pokerRooms: string[];
  fetchTournaments?: () => Promise<NormalizedTournament[]>;
  fetchCashGames?: () => Promise<NormalizedCashGame[]>;
}
