import { publicFetch } from '@/lib/publicFetch';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }
  try {
    const res = await publicFetch(url, { method: "GET", headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    // Extract <title>
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : url;
    // Extract favicon
    let favicon = url.replace(/^(https?:\/\/[^\/]+).*/, "$1/favicon.ico");
    const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i);
    if (iconMatch && iconMatch[1]) {
      favicon = iconMatch[1].startsWith("http") ? iconMatch[1] : new URL(iconMatch[1], url).href;
    }
    // Extract main content (very basic: strip HTML tags, limit length)
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const content = text.slice(0, 2000);
    return NextResponse.json({ title, favicon, content });
  } catch (e: any) {
    return NextResponse.json({ title: url, favicon: undefined, content: "", error: "Failed to fetch metadata" }, { status: 200 });
  }
} 