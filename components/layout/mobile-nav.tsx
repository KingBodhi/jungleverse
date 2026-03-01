"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  links: { href: string; label: string }[];
}

export function MobileNav({ links }: MobileNavProps) {
  // Defer rendering until after hydration to avoid browser-extension mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full border border-border/50 md:hidden"
        aria-label="Open navigation menu"
      >
        <span className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-border/50 md:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader className="text-left">
          <SheetTitle className="text-base font-semibold tracking-wide text-muted-foreground">
            Browse Jungleverse
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col space-y-4">
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link href={link.href} className="text-base font-semibold text-foreground">
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
