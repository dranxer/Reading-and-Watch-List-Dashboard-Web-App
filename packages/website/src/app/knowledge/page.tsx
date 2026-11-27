"use client";
import { useState } from "react";

interface EntryMeta {
  url: string;
  title: string;
  type: "article" | "video" | "unknown";
  favicon?: string;
}

export default function KnowledgeTracker() {
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<EntryMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detect type from URL
  function detectType(url: string): "article" | "video" | "unknown" {
    if (/youtube|youtu\.be|vimeo|dailymotion|video/.test(url)) return "video";
    if (/medium|blog|news|article|substack|dev\.to|docs|wikipedia/.test(url)) return "article";
    return "unknown";
  }

  // Fetch metadata (title, favicon)
  async function fetchMeta(url: string) {
    setLoading(true);
    setError("");
    try {
      // Use a public metadata API (or fallback to just the URL)
      const res = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`);
      if (!res.ok) throw new Error("Failed to fetch metadata");
      const data = await res.json();
      setMeta({
        url,
        title: data.title || url,
        favicon: data.icon,
        type: detectType(url),
      });
    } catch (e: any) {
      setMeta({ url, title: url, type: detectType(url) });
      setError("Could not fetch metadata. You can still save the link.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    fetchMeta(url);
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">ReadWatch</h1>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          type="url"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Paste article or video URL..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Fetching..." : "Add"}
        </button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {meta && (
        <div className="border rounded p-4 bg-white shadow mb-4">
          <div className="flex items-center gap-3 mb-2">
            {meta.favicon && <img src={meta.favicon} alt="favicon" className="w-6 h-6" />}
            <span className="font-semibold text-lg">{meta.title}</span>
          </div>
          <div className="text-sm text-gray-500 mb-1">{meta.url}</div>
          <div className="inline-block px-2 py-1 rounded bg-gray-100 text-xs text-gray-700">
            {meta.type === "article" ? "📰 Article" : meta.type === "video" ? "🎬 Video" : "🔗 Unknown"}
          </div>
          {/* Next: Add Save & Summarize button here */}
        </div>
      )}
      <div className="text-gray-500 text-sm mt-8">
        <b>How it works:</b> Paste a link to an article or video. The tracker will fetch metadata and (in the next step) summarize it locally with an LLM, then store it in your personal knowledge base.
      </div>
    </div>
  );
} 