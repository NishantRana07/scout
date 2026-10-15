// ─── GET & DELETE /api/opportunities ──────────────────────────────────────────
// Zero-auth: falls back to "dashboard-demo" default user.

import { NextRequest, NextResponse } from "next/server";
import { connectDB, SavedOpportunity, ISavedOpportunity } from "@/lib/db";

export async function GET(req: NextRequest) {
  await connectDB();

  const userId = req.headers.get("x-user-id") || "dashboard-demo";
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const filter: any = { userId };
  if (type) filter.type = type;

  const allUserOpps: ISavedOpportunity[] = await SavedOpportunity.find({ userId });
  const opportunities = type ? allUserOpps.filter((o) => o.type === type) : allUserOpps;

  // Counts by type for collection cards
  const countsByType: Record<string, number> = {};
  for (const o of allUserOpps) {
    countsByType[o.type] = (countsByType[o.type] || 0) + 1;
  }

  return NextResponse.json({
    opportunities,
    countsByType,
    total: opportunities.length,
  });
}

export async function DELETE(req: NextRequest) {
  await connectDB();
  const userId = req.headers.get("x-user-id") || "dashboard-demo";

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await SavedOpportunity.deleteOne({ _id: id, userId });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
