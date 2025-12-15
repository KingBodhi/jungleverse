import Image from "next/image";
import Link from "next/link";
import { FEATURED_REGIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function FeaturedRegions() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {FEATURED_REGIONS.map((region) => (
        <Card key={region.name} className="overflow-hidden">
          <div className="relative h-32 w-full overflow-hidden">
            <Image
              src={region.image}
              alt={region.name}
              width={640}
              height={256}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
              className="h-full w-full object-cover"
              priority={region.name === "Las Vegas"}
            />
          </div>
          <CardHeader>
            <CardTitle>{region.name}</CardTitle>
            <CardDescription>{region.description}</CardDescription>
            <Link href={region.href} className="text-primary hover:underline">
              Explore rooms →
            </Link>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
