"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSearch } from "../../hooks/useSearch";
import LawCard from "../../components/LawCard";
import SearchInputBar from "../../components/search/SearchInputBar";
import CategoryTabs from "../../components/search/CategoryTabs";

/**
 * 검색 결과 콘텐츠 영역
 * (useSearch 훅과 서브 컴포넌트들을 조립하여 페이지를 구성합니다.)
 */
function SearchContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  
  // 모든 비즈니스 로직은 useSearch 훅에 캡슐화되어 있습니다.
  const { 
    results, 
    filteredResults, 
    loading, 
    categories, 
    activeCategory, 
    setActiveCategory 
  } = useSearch(queryParam);

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      {/* 1. 상단 검색바 섹션 */}
      <section className="flex flex-col gap-4">
        <SearchInputBar initialValue={queryParam} />
        {queryParam && !loading && (
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">
              &quot;<span className="text-slate-900">{queryParam}</span>&quot; 검색 결과
            </h2>
            <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
              총 {results.length}건
            </span>
          </div>
        )}
      </section>

      {/* 2. 필터 섹션 */}
      {results.length > 0 && (
        <CategoryTabs 
          categories={categories} 
          activeCategory={activeCategory} 
          onSelect={setActiveCategory}
          results={results}
        />
      )}

      {/* 3. 본문 결과 섹션 */}
      <section className="min-h-[400px]">
        {/* 로딩 상태 */}
        {loading && (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 glass-card rounded-2xl shimmer opacity-50" />
            ))}
          </div>
        )}

        {/* 검색 결과 없음 */}
        {!loading && queryParam && filteredResults.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-2xl">🔍</div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">검색 결과가 없습니다</h3>
            <p className="text-sm text-slate-400">다른 키워드로 검색하거나 필터를 변경해보세요.</p>
          </div>
        )}

        {/* 결과 리스트 */}
        {!loading && (
          <div className="grid gap-4">
            {filteredResults.map((law) => (
              <LawCard key={law.id} law={law} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400 font-medium">탐색 준비 중...</div>}>
      <SearchContent />
    </Suspense>
  );
}
