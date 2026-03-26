"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const RECENT_SEARCHES_KEY = "mdlaw_recent";

function getRecent() {
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
  const [recents, setRecents] = useState(getRecent);

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
      {/* 타이틀 */}
      <div className="text-center">
        <div className="text-5xl mb-3">⚖️</div>
        <h1 className="text-2xl font-bold text-blue-700 mb-1">MdLaw</h1>
        <p className="text-gray-500 text-sm">
          병원 실무자를 위한 의료법령 검색 AI 탐색기
        </p>
      </div>

      {/* 검색창 */}
      <div className="w-full max-w-xl">
        <div className="flex gap-2 shadow-md rounded-xl overflow-hidden border border-gray-200 bg-white">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: 진료기록 보관기간, 병실 크기 기준, 비급여 고지"
            className="flex-1 px-4 py-3 text-sm outline-none"
          />
          <button
            onClick={() => handleSearch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-medium transition-colors"
          >
            검색
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          실무 표현 그대로 입력하세요. 예: &quot;차트 보관&quot; → 진료기록부
          보존기간으로 자동 변환
        </p>
      </div>

      {/* 자주 찾는 주제 — 추후 버튼 추가 예정 */}
      <div className="w-full max-w-xl">
        <p className="text-xs text-gray-400 mb-2 font-medium">자주 찾는 주제</p>
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-4 text-center text-sm text-gray-400">
          주제 버튼은 추후 추가 예정입니다
        </div>
      </div>

      {/* 최근 검색어 */}
      {recents.length > 0 && (
        <div className="w-full max-w-xl">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-gray-400 font-medium">최근 검색어</p>
            <button
              onClick={clearRecent}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              전체 삭제
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
