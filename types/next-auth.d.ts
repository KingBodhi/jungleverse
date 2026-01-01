import { Role } from "@prisma/client";
import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    role: Role;
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role: Role;
  }
}
