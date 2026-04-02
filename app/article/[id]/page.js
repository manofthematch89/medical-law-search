"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { getLawById } from "../../../lib/lawApi";
import AiSummaryPanel from "../../../components/AiSummaryPanel";

export default function ArticlePage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const srcFromSearch = searchParams.get("src");
  const [law, setLaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAi, setShowAi] = useState(false);

  useEffect(() => {
    if (!id) return;
    getLawById(id)
      .then(setLaw)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-3xl mb-3 animate-pulse">⚖️</div>
        <p className="text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (!law) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-sm font-medium text-gray-500 mb-2">
          조문을 찾을 수 없습니다
        </p>
        <button
          onClick={() => router.back()}
          className="text-blue-600 text-sm hover:underline"
        >
          ← 뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      {/* 뒤로가기 */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1 w-fit"
      >
        ← 검색 결과로
      </button>

      {/* 출처 정보 (필수 표시) */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-500 font-medium mb-2">📋 출처 정보</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <span className="text-gray-500">법령명</span>{" "}
            <span className="font-semibold text-gray-800">{law.lawName}</span>
          </span>
          <span>
            <span className="text-gray-500">조문</span>{" "}
            <span className="font-semibold text-blue-700">{law.article}</span>
          </span>
          <span>
            <span className="text-gray-500">시행일</span>{" "}
            <span className="font-semibold text-gray-800">
              {law.effectiveDate}
            </span>
          </span>
        </div>
        <a
          href={srcFromSearch || law.source}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 text-xs bg-white border border-blue-300 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
        >
          법제처 원문 보기 ↗
        </a>
      </div>

      {/* 조문 제목 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{law.title}</h1>
        <p className="text-sm text-gray-500">{law.summary}</p>
      </div>

      {/* 조문 전문 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <p className="text-xs text-gray-400 font-medium mb-3">조문 원문</p>
        <p className="text-sm text-gray-800 leading-7 whitespace-pre-wrap">
          {law.content}
        </p>
      </div>

      {/* AI 요약 버튼 */}
      {!showAi && (
        <button
          onClick={() => setShowAi(true)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium text-sm transition-colors"
        >
          🤖 AI 요약 보기
        </button>
      )}

      {/* AI 요약 패널 */}
      {showAi && (
        <AiSummaryPanel law={{...law, source: srcFromSearch || law.source}} onClose={() => setShowAi(false)} />
      )}
    </div>
  );
}
