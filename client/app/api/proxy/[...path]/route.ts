/**
 * Server-side proxy: signs every request to the FastAPI backend with the
 * caller's NextAuth JWT, so the JWT never touches client JS. We mint a fresh
 * HS256 token from the user's session and forward streaming responses
 * (SSE / file downloads) untouched.
 */

import { NextResponse } from "next/server";
import { SignJWT } from "jose";

import { auth } from "@/lib/auth";

const API_URL = process.env.BACKEND_URL ?? "http://backend:8000";
const SECRET = process.env.NEXTAUTH_SECRET!;

async function makeBackendToken(provider: string, sub: string, extras: Record<string, unknown>) {
  return await new SignJWT({ provider, ...extras })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(SECRET));
}

async function handle(req: Request, ctx: RouteContext<"/api/proxy/[...path]">) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ detail: "unauthorized" }, { status: 401 });
  }
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const target = `${API_URL}/api/${path.join("/")}${url.search}`;

  const provider = (session.user as { provider?: string }).provider ?? "google";
  const sub = (session.user as { id?: string }).id ?? "";
  const token = await makeBackendToken(provider, sub, {
    email: session.user.email,
    name: session.user.name,
    picture: session.user.image,
  });

  const headers = new Headers(req.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.delete("host");
  headers.delete("cookie");

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

export const dynamic = "force-dynamic";
