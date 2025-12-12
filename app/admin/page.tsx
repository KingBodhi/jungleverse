import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AdminForms } from "@/components/admin/admin-forms";

export const metadata: Metadata = {
  title: "Admin — Global TH Index",
};

export default async function AdminPage() {
  const rooms = await prisma.pokerRoom.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold">Admin Console</h1>
        <p className="text-muted-foreground">Quickly onboard rooms, tournaments, and cash games.</p>
      </div>
      <AdminForms rooms={rooms} />
    </div>
  );
}
