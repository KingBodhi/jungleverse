import Link from "next/link";
import { PropsWithChildren } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth-helpers";
import { UserNav } from "@/components/layout/user-nav";

const links = [
  { href: "/rooms", label: "Rooms" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/cash-games", label: "Cash Games" },
];

export async function SiteHeader({ children }: PropsWithChildren) {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="font-display text-2xl uppercase tracking-[0.35em] text-secondary">
            Jungleverse
          </span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground transition hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {children}
          {user ? (
            <UserNav user={user} />
          ) : (
            <Button asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteHeaderSlot({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("flex items-center gap-2", className)}>{children}</div>;
}
