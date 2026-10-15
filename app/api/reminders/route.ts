// ─── Reminders API ────────────────────────────────────────────────────────────
// Zero-auth: falls back to "dashboard-demo" default user.

import { NextRequest, NextResponse } from "next/server";
import { connectDB, Reminder, SavedOpportunity } from "@/lib/db";

// GET — list reminders for user
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "dashboard-demo";
  await connectDB();

  const allReminders = await Reminder.find({ userId, cancelled: false });
  return NextResponse.json({ reminders: allReminders });
}

// POST — create reminder
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "dashboard-demo";
  const body = await req.json();
  const { opportunityId, leadDays } = body;

  if (!opportunityId) {
    return NextResponse.json({ error: "Missing opportunityId" }, { status: 400 });
  }

  await connectDB();

  const opps = await SavedOpportunity.find({ userId });
  const opp = opps.find((o) => o._id === opportunityId);
  if (!opp) {
    return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  }

  const deadlineDate = opp.deadline ? new Date(opp.deadline) : new Date(Date.now() + 7 * 86400000);
  const remindAt = new Date(deadlineDate);
  remindAt.setDate(remindAt.getDate() - (leadDays ?? 2));

  const reminder = await Reminder.create({
    userId,
    opportunityId: opp._id,
    opportunityName: opp.name,
    deadline: opp.deadline || "TBD",
    remindAt: remindAt.toISOString(),
    leadDays: leadDays ?? 2,
    delivered: false,
    cancelled: false,
  });

  return NextResponse.json({ ok: true, reminder });
}

// DELETE — cancel reminder
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || "dashboard-demo";
  const { id } = await req.json();

  await connectDB();
  await Reminder.deleteOne({ _id: id, userId });

  return NextResponse.json({ ok: true });
}
