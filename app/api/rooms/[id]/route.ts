import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/services/rooms';
import { getCurrentUser } from '@/lib/auth-helpers';
import { isFavorite } from '@/lib/services/favorites';
import type { RoomWithGames } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: roomId } = await params;
  try {
    const roomData = await getRoomById(roomId) as RoomWithGames | null;

    if (!roomData) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }

    const currentUserData = await getCurrentUser();
    const isFavoriteData = currentUserData ? await isFavorite(currentUserData.id, roomData.id) : false;

    return NextResponse.json({
      room: roomData,
      currentUser: currentUserData,
      initialIsFavorite: isFavoriteData,
    });
  } catch (error) {
    console.error('Error fetching room details:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
