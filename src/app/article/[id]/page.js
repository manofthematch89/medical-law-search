"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useLawDetail } from "../../../hooks/useLawDetail";
import AiSummaryPanel from "../../../components/AiSummaryPanel";

/**
 * 조문 상세 조회 페이지
 */
export default function ArticlePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fallbackSrc = searchParams.get("src"); // 이전 카드에서 넘어온 원문 링크 활용

  const { law, loading, error } = useLawDetail(id);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-4 w-24 bg-slate-200 rounded" />
        <div className="h-10 w-3/4 bg-slate-200 rounded" />
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error || !law) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-xl font-bold text-slate-800 mb-2">데이터를 찾을 수 없습니다.</h3>
        <p className="text-slate-400 mb-6">{error || "해당 조문 정보가 존재하지 않습니다."}</p>
        <button onClick={() => router.back()} className="btn-premium">뒤로 가기</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up pb-20">
      {/* 1. 상단 네비게이션 및 헤더 */}
      <header className="flex flex-col gap-3">
        <button 
          onClick={() => router.back()}
          className="w-fit flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
          뒤로 가기
        </button>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wider">
              {law.lawName}
            </span>
            <span className="text-xs font-medium text-slate-400">
              {law.effectiveDate} 시행
            </span>
          </div>
          <h2 className="text-3xl font-outfit font-black text-slate-900 tracking-tight">
            {law.article} <span className="text-slate-400 font-medium ml-1">|</span> {law.title}
          </h2>
        </div>
      </header>

      {/* 2. AI 지능형 분석 패널 (가장 먼저 노출) */}
      <section className="sticky top-24 z-10">
        <AiSummaryPanel lawTitle={`${law.lawName} ${law.article}`} lawContent={law.content} />
      </section>

      {/* 3. 조문 원문 카드 */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">조문 원문</h3>
          <a 
            href={law.source || fallbackSrc} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-slate-400 hover:text-blue-600 flex items-center gap-1"
          >
            법제처에서 보기 ↗
          </a>
        </div>
        <div className="glass-card rounded-[32px] p-8 sm:p-10">
          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-700 leading-relaxed font-serif whitespace-pre-wrap">
              {law.content}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
