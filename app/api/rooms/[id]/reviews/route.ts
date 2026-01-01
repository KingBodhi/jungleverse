import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const idSchema = z.string().min(1);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = idSchema.parse(id);

    const reviews = await prisma.review.findMany({
      where: {
        pokerRoomId: roomId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reviews);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    return new Response(null, { status: 500 });
  }
}

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const roomId = idSchema.parse(id);

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response("Unauthorized", { status: 403 });
    }

    const json = await req.json();
    const body = createReviewSchema.parse(json);

    const review = await prisma.review.create({
      data: {
        rating: body.rating,
        comment: body.comment,
        pokerRoomId: roomId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify(error.issues), { status: 422 });
    }

    return new Response(null, { status: 500 });
  }
}
