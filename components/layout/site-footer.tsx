import Link from "next/link";
import { Github, MapPin, Mail } from "lucide-react";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Data Coverage", href: "#coverage" },
  { label: "Careers", href: "#careers" },
];

const resourceLinks = [
  { label: "Provider Guide", href: "/PROVIDER_INTEGRATION_GUIDE" },
  { label: "Deployment", href: "/DEPLOYMENT" },
  { label: "Support", href: "mailto:ops@jungleverse.gg" },
];

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="container grid gap-8 py-12 lg:grid-cols-[1.2fr,1fr,1fr]">
        <div className="space-y-4">
          <Link href="/" className="font-display text-2xl tracking-[0.08em] text-secondary">
            Jungleverse
          </Link>
          <p className="max-w-md text-sm text-muted-foreground">
            Expedition-grade intel on poker rooms, tournaments, and cash games worldwide. Built for grinders charting
            their next score.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> Global coverage
            </span>
            <Link href="mailto:ops@jungleverse.gg" className="inline-flex items-center gap-1 hover:text-secondary">
              <Mail className="h-4 w-4" /> ops@jungleverse.gg
            </Link>
            <Link href="https://github.com" className="inline-flex items-center gap-1 hover:text-secondary">
              <Github className="h-4 w-4" /> Github
            </Link>
          </div>
        </div>
        <FooterColumn title="Company" links={navLinks} />
        <FooterColumn title="Resources" links={resourceLinks} />
      </div>
      <div className="border-t border-border/60">
        <div className="container flex flex-col gap-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span>© {currentYear} Jungleverse. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="#privacy" className="hover:text-secondary">
              Privacy
            </Link>
            <Link href="#terms" className="hover:text-secondary">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="font-display text-base tracking-[0.08em] text-secondary">{title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition hover:text-secondary">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
