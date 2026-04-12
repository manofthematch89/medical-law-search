"use client";

import { useAiSummary } from "../hooks/useAiSummary";

const DISCLAIMER = "본 내용은 법령 조문을 기반으로 한 AI 분석 정보이며, 실제 법적 상담을 대체할 수 없습니다.";

export default function AiSummaryPanel({ lawTitle, lawContent }) {
  const { summary, loading, error } = useAiSummary(lawTitle, lawContent);

  return (
    <div className="glass-card rounded-[32px] overflow-hidden border-blue-200/40 animate-fade-in-up">
      {/* 장식용 상단 바 */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
      
      <div className="p-8 sm:p-10">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.047a1 1 0 01.894.447l6 12c.297.594.297 1.284 0 1.878l-6 12a1 1 0 01-1.788 0l-6-12a1.001 1.001 0 010-1.878l6-12a1 1 0 01.894-.447zM6.415 14.12l4.885-9.77 4.885 9.77H6.415z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-outfit font-black text-slate-900 leading-tight">AI 실무 인사이트</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Powered by Gemini 1.5</p>
            </div>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-600 animate-pulse">
              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              딥러닝 분석 중
            </div>
          )}
        </header>

        {loading ? (
          <div className="space-y-6">
            <div className="h-6 w-3/4 bg-slate-100 rounded-lg shimmer" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-50 rounded shimmer" />
              <div className="h-4 bg-slate-50 rounded shimmer w-5/6" />
            </div>
          </div>
        ) : error ? (
          <div className="py-10 text-center text-slate-400">
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {/* 한 줄 요약 섹션 */}
            <div className="relative">
              <div className="absolute -left-6 top-0 bottom-0 w-1 bg-indigo-600/20 rounded-full" />
              <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-3">One-Line Summary</h4>
              <p className="text-xl font-outfit font-bold text-slate-900 leading-snug">
                {summary?.oneLine}
              </p>
            </div>

            {/* 핵심 포인트 그리드 */}
            <div className="grid sm:grid-cols-3 gap-6">
              {summary?.keyPoints?.map((point, i) => (
                <div key={i} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-2xl border border-slate-100/50 hover:bg-white transition-all hover:shadow-xl hover:shadow-slate-200/50">
                  <span className="text-indigo-600 font-black font-outfit text-xl opacity-20">0{i + 1}</span>
                  <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>

            {/* 실무자 시사점 (강점 강조) */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-900/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[60px] -translate-y-1/2 translate-x-1/2" />
              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-4">Strategic Implication</h4>
              <p className="text-base font-medium leading-relaxed opacity-95">
                &quot;{summary?.implications}&quot;
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 푸터 면책 공지 */}
      <footer className="bg-slate-50/80 px-8 py-5 border-t border-slate-100 flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic">
          {DISCLAIMER}
        </p>
      </footer>
    </div>
  );
}
