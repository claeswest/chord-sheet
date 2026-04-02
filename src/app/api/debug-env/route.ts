import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    GITHUB_CLIENT_ID: !!process.env.GITHUB_CLIENT_ID,
    DATABASE_URL: !!process.env.DATABASE_URL,
  });
}
