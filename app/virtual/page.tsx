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

  // Generate initial token
  const token = jwt.sign(
    {
      sub: session.user.id,
      email: session.user.email,
      name: session.user.name,
      provider: "jungleverse",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 5 * 60,
    },
    jwtSecret,
    { algorithm: "HS256" }
  );

  const iframeSrc = `${pcgUrl}/embed/virtual-environment?token=${token}`;

  return <VirtualEnvironmentEmbed initialSrc={iframeSrc} />;
}
