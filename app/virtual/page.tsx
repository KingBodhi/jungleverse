import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { VirtualEnvironmentEmbed } from "./VirtualEnvironmentEmbed";

/**
 * Virtual Environment Page
 *
 * Server component that handles authentication and generates a PCG token,
 * then renders the iframe embed as a client component.
 */
export default async function VirtualPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const jwtSecret = process.env.PCG_JWT_SECRET;
  const pcgUrl = process.env.NEXT_PUBLIC_PCG_URL || "http://localhost:3001";

  if (!jwtSecret) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-2">Configuration Error</p>
          <p className="text-gray-400 text-sm">Virtual environment is not configured.</p>
        </div>
      </div>
    );
  }

  const token = createPcgToken(
    {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    jwtSecret
  );

  const iframeSrc = `${pcgUrl}/embed/virtual-environment?token=${token}`;

  return <VirtualEnvironmentEmbed initialSrc={iframeSrc} />;
}

type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

function createPcgToken(user: SessionUser, secret: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    provider: "jungleverse" as const,
    iat: issuedAt,
    exp: issuedAt + 5 * 60,
  };

  return jwt.sign(payload, secret, { algorithm: "HS256" });
}
