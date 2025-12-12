import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface SectionProps extends PropsWithChildren {
  id?: string;
  className?: string;
  title?: string;
  description?: string;
}

export function Section({ id, className, title, description, children }: SectionProps) {
  return (
    <section id={id} className={cn("py-12", className)}>
      <div className="container space-y-6">
        {(title || description) && (
          <div className="space-y-2">
            {title && <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
