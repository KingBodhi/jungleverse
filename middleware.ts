import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/?error=admin-only", req.url));
    }

    if (pathname.startsWith("/casino")) {
      if (!token) {
        return NextResponse.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(req.nextUrl.pathname)}`, req.url));
      }

      if (pathname === "/casino" || pathname === "/casino/") {
        if (token.role === "CASINO" && token.managedPokerRoomId) {
          return NextResponse.redirect(new URL(`/casino/${token.managedPokerRoomId}`, req.url));
        }
        return NextResponse.next();
      }

      const [, , roomId] = pathname.split("/");
      if (!roomId) {
        return NextResponse.redirect(new URL("/casino", req.url));
      }

      if (token.role === "ADMIN") {
        return NextResponse.next();
      }
      if (token.role === "CASINO" && token.managedPokerRoomId === roomId) {
        return NextResponse.next();
      }

      return NextResponse.rewrite(new URL("/?error=restricted", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/casino/:path*", "/casino"],
};
