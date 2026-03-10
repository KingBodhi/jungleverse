import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth-helpers";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="container space-y-8 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Global Texas Hold&apos;em Index</p>
          <h1 className="text-3xl font-bold tracking-tight">Admin console</h1>
          <p className="text-sm text-muted-foreground">Manage rooms, partner access, and network content.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to site
          </Link>
          <Link href="/casino" className={buttonVariants({ variant: "default" })}>
            Casino portal
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
