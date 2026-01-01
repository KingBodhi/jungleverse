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
            {title && (
              <h2 className="font-display text-3xl tracking-[0.08em] text-secondary">
                {title}
              </h2>
            )}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
