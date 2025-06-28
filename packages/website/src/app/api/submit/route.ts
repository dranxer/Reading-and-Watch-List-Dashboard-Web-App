import { NextRequest, NextResponse } from "next/server";

// In-memory store for demo (replace with DB in production)
let entries: { url: string; created: string }[] = [];

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid url" }, { status: 400 });
    }
    entries.unshift({ url, created: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  // For demo: return all entries
  return NextResponse.json(entries);
} 