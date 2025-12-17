// app/api/fetch-poker-data/route.ts

import { fetchAllPokerData } from '@/lib/poker-data-fetcher';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    await fetchAllPokerData();
    return NextResponse.json({ message: 'Data fetching completed successfully' });
  } catch (error) {
    console.error('Error fetching poker data:', error);
    return NextResponse.json({ message: 'Error fetching poker data' }, { status: 500 });
  }
}
