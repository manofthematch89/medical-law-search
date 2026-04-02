"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchLaws } from "../../lib/lawApi";
import LawCard from "../../components/LawCard";

const CATEGORY_ORDER = ["시설/환경", "인력/면허", "원무/행정", "응급/특수", "의료법 계열", "개인정보보호법", "근로기준법", "기타"];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";

  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("전체");

  useEffect(() => {
    if (!queryParam) return;
    setActiveCategory("전체");
    setLoading(true);
    searchLaws(queryParam)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [queryParam]);

  function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
  }

  const filtered =
    activeCategory === "전체"
      ? results
      : results.filter((r) => r.category === activeCategory);

  const derivedCategories = Array.from(
    new Set(results.map((r) => r.category).filter((v) => typeof v === "string" && v.trim()))
  ).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b, "ko");
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="flex flex-col gap-5">
      {/* 검색창 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="법령 검색..."
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-400 bg-white"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          검색
        </button>
        <button
          onClick={() => router.push("/")}
          className="border border-gray-200 text-gray-500 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          홈
        </button>
      </div>

      {/* 결과 요약 */}
      {queryParam && (
        <div className="text-sm text-gray-500">
          &quot;<span className="font-medium text-gray-800">{queryParam}</span>
          &quot; 검색 결과{" "}
          <span className="font-medium text-blue-600">{results.length}건</span>
        </div>
      )}

      {/* 카테고리 탭 */}
      {results.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["전체", ...derivedCategories].map((cat) => {
            const count = cat === "전체" ? results.length : results.filter((r) => r.category === cat).length;
            if (count === 0 && cat !== "전체") return null;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-3 animate-pulse">⚖️</div>
          <p className="text-sm">법령을 검색하는 중...</p>
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && queryParam && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-3">🔍</div>
          <p className="text-sm font-medium text-gray-500 mb-1">
            검색 결과가 없습니다
          </p>
          <p className="text-xs">다른 검색어로 시도해보세요</p>
        </div>
      )}

      {/* 결과 목록 */}
      {!loading && (
        <div className="flex flex-col gap-3">
          {filtered.map((law) => (
            <LawCard key={law.id} law={law} />
          ))}
        </div>
      )}

      {/* 검색어 없을 때 */}
      {!queryParam && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">검색어를 입력해주세요</p>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-400 text-sm">불러오는 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}
