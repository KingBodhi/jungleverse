import Image from "next/image";
import Link from "next/link";
import { FEATURED_REGIONS } from "@/lib/constants";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function FeaturedRegions() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {FEATURED_REGIONS.map((region) => (
        <Card key={region.name} className="overflow-hidden">
          <div className="relative h-32 w-full">
            <Image src={region.image} alt={region.name} fill className="object-cover" />
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
