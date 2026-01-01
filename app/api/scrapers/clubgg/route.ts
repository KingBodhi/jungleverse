// app/api/scrapers/clubgg/route.ts
// API endpoint for fetching ClubGG poker game data

import { NextResponse } from 'next/server';
import {
  scrapeClubGG,
  getActiveCashGames,
  getUpcomingTournaments,
  transformToDbFormat,
  type ClubGGScraperResult
} from '@/lib/scrapers/clubgg';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'cash', 'tournament', or 'all'
  const format = searchParams.get('format'); // 'raw' or 'db'

  try {
    let result: ClubGGScraperResult;

    if (type === 'cash') {
      const games = await getActiveCashGames();
      result = {
        success: true,
        timestamp: new Date(),
        source: 'mock',
        clubs: [],
        games,
      };
    } else if (type === 'tournament') {
      const games = await getUpcomingTournaments();
      result = {
        success: true,
        timestamp: new Date(),
        source: 'mock',
        clubs: [],
        games,
      };
    } else {
      result = await scrapeClubGG();
    }

    // Transform to database format if requested
    const responseData = format === 'db'
      ? {
          ...result,
          games: transformToDbFormat(result.games),
        }
      : result;

    return NextResponse.json({
      success: result.success,
      data: responseData,
      meta: {
        fetchedAt: result.timestamp,
        source: result.source,
        gameCount: result.games.length,
        cashGames: result.games.filter(g => g.gameType === 'CASH').length,
        tournaments: result.games.filter(g => g.gameType === 'TOURNAMENT').length,
      },
      ...(result.errors && result.errors.length > 0 ? { warnings: result.errors } : {}),
    });
  } catch (error) {
    console.error('ClubGG scraper error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch ClubGG data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST endpoint to trigger data sync to database
export async function POST(request: Request) {
  try {
    const result = await scrapeClubGG();

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to scrape ClubGG data' },
        { status: 500 }
      );
    }

    // Transform and prepare for database insertion
    const dbData = transformToDbFormat(result.games);

    // Here you would typically:
    // 1. Find or create the ClubGG poker room
    // 2. Upsert the games into the database
    // For now, we return the data that would be synced

    return NextResponse.json({
      success: true,
      message: 'ClubGG data processed successfully',
      data: {
        source: result.source,
        gamesProcessed: dbData.length,
        games: dbData,
      },
      note: result.source === 'mock'
        ? 'Using mock data - integrate with ClubGG API for live data'
        : undefined,
    });
  } catch (error) {
    console.error('ClubGG sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync ClubGG data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
