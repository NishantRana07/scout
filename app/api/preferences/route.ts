// ─── GET/PUT /api/preferences ──────────────────────────────────────────────────
// Zero-auth: falls back to "dashboard-demo" default user.

import { NextRequest, NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";

export async function GET(req: NextRequest) {
  await connectDB();
  const userId = req.headers.get("x-user-id") || "dashboard-demo";

  let user = await User.findOne({ photonUserId: userId });
  if (!user) {
    user = await User.findOneAndUpdate(
      { photonUserId: userId },
      {},
      { upsert: true, new: true }
    );
  }

  return NextResponse.json({ preferences: user?.preferences });
}

export async function PUT(req: NextRequest) {
  await connectDB();
  const userId = req.headers.get("x-user-id") || "dashboard-demo";

  const body = await req.json();
  const { preferences } = body;

  if (!preferences) {
    return NextResponse.json({ error: "Missing preferences" }, { status: 400 });
  }

  await User.findOneAndUpdate(
    { photonUserId: userId },
    { preferences },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}
