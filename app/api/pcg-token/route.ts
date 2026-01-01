import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/pcg-token
 *
 * Generates a short-lived JWT token for authenticating with the PCG virtual environment.
 * The token contains the user's ID, email, and name from the Jungleverse session.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.PCG_JWT_SECRET;

    if (!jwtSecret) {
      console.error("PCG_JWT_SECRET is not configured");
      return NextResponse.json(
        { error: "Virtual environment not configured" },
        { status: 500 }
      );
    }

    // Create a short-lived token (5 minutes)
    const token = jwt.sign(
      {
        sub: session.user.id,
        email: session.user.email,
        name: session.user.name,
        provider: "jungleverse",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 5 * 60, // 5 minute expiry
      },
      jwtSecret,
      { algorithm: "HS256" }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating PCG token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
