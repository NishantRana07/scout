// ─── POST /api/worker/message ─────────────────────────────────────────────────
// Handles incoming iMessage webhook from Photon Spectrum (if using webhook mode
// instead of the persistent worker). Also used for testing.

import { NextRequest, NextResponse } from "next/server";
import { connectDB, User } from "@/lib/db";
import { processMessage } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic webhook validation
    const userId = body.userId ?? body.user?.id ?? body.spaceId;
    const text = body.text ?? body.message?.text ?? body.content;

    if (!userId || !text) {
      return NextResponse.json(
        { error: "Missing userId or text" },
        { status: 400 }
      );
    }

    await connectDB();

    // Upsert user
    await User.findOneAndUpdate(
      { photonUserId: userId },
      {
        $setOnInsert: {
          photonUserId: userId,
          preferences: {
            skills: [],
            location: "",
            workMode: "any",
            opportunityTypes: [],
            paidOnly: false,
            experienceLevel: "any",
            interests: [],
            reminderLeadDays: 2,
            timezone: "UTC",
            persona: "haryanvi",
          },
        },
      },
      { upsert: true }
    );

    const reply = await processMessage(userId, text);

    return NextResponse.json({ reply, ok: true });
  } catch (err) {
    console.error("[/api/worker/message] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "Scout iMessage API is running",
    timestamp: new Date().toISOString(),
  });
}
