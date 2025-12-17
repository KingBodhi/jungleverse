import { CashGame, FavoriteRoom, Game, PokerRoom, Tournament } from "@prisma/client";

export type RoomWithGames = PokerRoom & {
  games: (Game & { cashGame: CashGame | null; tournament: Tournament | null })[];
};

export type TournamentWithRoom = Tournament & {
  game: Game & { pokerRoom: PokerRoom };
};

export type CashGameWithRoom = CashGame & {
  game: Game & { pokerRoom: PokerRoom };
};

export type FavoriteRoomWithDetails = FavoriteRoom & {
  pokerRoom: RoomWithGames;
};
