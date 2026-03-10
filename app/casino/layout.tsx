import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdminOrCasinoUser } from "@/lib/auth-helpers";
import { buttonVariants } from "@/components/ui/button";

export default async function CasinoLayout({ children }: { children: ReactNode }) {
  await requireAdminOrCasinoUser();

  return (
    <div className="container space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Partner tools</p>
          <h1 className="text-3xl font-bold tracking-tight">Casino portal</h1>
          <p className="text-sm text-muted-foreground">Update your profile, media, and sources.</p>
        </div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Return to site
        </Link>
      </div>
      {children}
    </div>
  );
}
