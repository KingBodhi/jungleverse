import Link from "next/link";

const footerLinks = [
  { label: "About", href: "#" },
  { label: "Data coverage", href: "#coverage" },
  { label: "API", href: "/api" },
  { label: "Careers", href: "#careers" },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Global Texas Hold&rsquo;em Index. Built for traveling grinders.
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {footerLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
