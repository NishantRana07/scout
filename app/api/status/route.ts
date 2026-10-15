// ─── GET /api/status ─────────────────────────────────────────────────────────
// Health check for Scout service

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";

export async function GET() {
  await connectDB();

  return NextResponse.json({
    ok: true,
    service: "Scout — Student Opportunity Scout",
    timestamp: new Date().toISOString(),
    storage: "local-storage (data/store.json)",
    integrations: {
      tinyfish: !!process.env.TINYFISH_API_KEY,
      photon: !!process.env.PHOTON_PROJECT_ID,
    },
  });
}
