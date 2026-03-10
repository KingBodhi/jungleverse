import { Role } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
    managedPokerRoomId?: string | null;
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role: Role;
      managedPokerRoomId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role: Role;
    managedPokerRoomId?: string | null;
  }
}
