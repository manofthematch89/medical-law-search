"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const RECENT_SEARCHES_KEY = "mdlaw_recent";

function getRecent() {
  if (typeof window === 'undefined') return [];
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(query) {
  const prev = getRecent().filter((q) => q !== query);
  const next = [query, ...prev].slice(0, 5);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState([]);
  useEffect(() => { setRecents(getRecent()); }, []);

  function handleSearch(q) {
    const trimmed = (q || query).trim();
    if (!trimmed) return;
    saveRecent(trimmed);
    setRecents(getRecent());
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  function clearRecent() {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecents([]);
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-8 pb-16">
      {/* íì´í */}
      <div className="text-center">
        <div className="text-5xl mb-3">âï¸</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-1">MdLaw</h1>
        <p className="text-gray-500 text-sm">
          ë³ì ì¤ë¬´ìë¥¼ ìí ìë£ë²ë ¹ ê²ì AI íìê¸°
        </p>
      </div>

      {/* ê²ìì°½ */}
      <div className="w-full max-w-xl">
        <div className="flex gap-2 shadow-md rounded-xl overflow-hidden border border-gray-200 bg-white">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ì: ì§ë£ê¸°ë¡ ë³´ê´ê¸°ê°, ë³ì¤ í¬ê¸° ê¸°ì¤, ë¹ê¸ì¬ ê³ ì§"
            className="flex-1 px-4 py-3 text-sm outline-none"
          />
          <button
            onClick={() => handleSearch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-medium transition-colors"
          >
            ê²ì
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          ì¤ë¬´ íí ê·¸ëë¡ ìë ¥íì¸ì. ì: &quot;ì°¨í¸ ë³´ê´&quot; â ì§ë£ê¸°ë¡ë¶
          ë³´ì¡´ê¸°ê°ì¼ë¡ ìë ë³í
        </p>
      </div>

      {/* ìì£¼ ì°¾ë ì£¼ì  â ì¶í ë²í¼ ì¶ê° ìì  */}
      <div className="w-full max-w-xl">
        <p className="text-xs text-gray-400 mb-2 font-medium">ìì£¼ ì°¾ë ì£¼ì </p>
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-400">
          ì£¼ì  ë²í¼ì ì¶í ì¶ê° ìì ìëë¤
        </div>
      </div>

      {/* ìµê·¼ ê²ìì´ */}
      {recents.length > 0 && (
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-400 font-medium">ìµê·¼ ê²ìì´</p>
            <button
              onClick={clearRecent}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ì ì²´ ì­ì 
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recents.map((r) => (
              <button
                key={r}
                onClick={() => handleSearch(r)}
                className="bg-white border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
