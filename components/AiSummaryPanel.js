"use client";

import { useState } from "react";

const SUMMARY_TYPES = [
  { key: "short", label: "핵심 3줄 요약" },
  { key: "simple", label: "원무과 기준 쉬운 설명" },
  { key: "compare", label: "관련 조문 비교" },
];

// Phase 1 더미 요약 텍스트
const DUMMY_SUMMARIES = {
  short: [
    "① 병실 면적은 환자 1인당 6.3㎡ 이상이어야 합니다.",
    "② 병상과 병상 사이 간격은 최소 1.5m 이상 유지해야 합니다.",
    "③ 중환자실·격리실 등 특수 목적 병실은 별도 기준을 적용할 수 있습니다.",
  ],
  simple: [
    "병실에 침대를 놓을 때는 환자 한 명당 약 6.3㎡(약 1.9평) 이상의 공간이 필요합니다.",
    "침대와 침대 사이는 1.5m 이상 떨어져 있어야 합니다.",
    "단, 중환자실이나 격리실처럼 특별한 용도의 병실은 다른 기준을 따를 수 있습니다.",
  ],
  compare: [
    "▸ 의료법 시행규칙 별표 4: 일반 병실 기준 (1인당 6.3㎡)",
    "▸ 의료법 시행규칙 별표 4 제2호: 중환자실 별도 기준 명시",
    "▸ 의료법 제36조: 의료기관 시설·장비 기준 일반 규정",
  ],
};

const DISCLAIMER =
  "본 내용은 법령 조문 기반 참고 정보입니다. 구체적인 법적 판단은 관련 원문 및 법률 전문가 확인이 필요합니다.";

export default function AiSummaryPanel({ law, onClose }) {
  const [activeType, setActiveType] = useState("short");

  const lines = DUMMY_SUMMARIES[activeType];

  return (
    <div className="bg-white border border-blue-200 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">🤖</span>
          <span className="text-white text-sm font-semibold">AI 요약</span>
          <span className="bg-blue-500 text-blue-100 text-xs px-2 py-0.5 rounded-full">
            Phase 1 더미
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-blue-200 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* 요약 유형 선택 */}
      <div className="flex border-b border-gray-100">
        {SUMMARY_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeType === t.key
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 요약 내용 */}
      <div className="px-5 py-4">
        <ul className="flex flex-col gap-2">
          {lines.map((line, i) => (
            <li key={i} className="text-sm text-gray-700 leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* 출처 재확인 */}
      <div className="px-5 pb-3 flex items-center gap-3 text-xs text-gray-500">
        <span>
          {law.lawName} {law.article} · {law.effectiveDate} 시행
        </span>
        <a
          href={law.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline ml-auto"
        >
          원문 ↗
        </a>
      </div>

      {/* 면책 문구 — 숨기기 불가 */}
      <div className="bg-amber-50 border-t border-amber-200 px-5 py-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          ⚠️ {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
