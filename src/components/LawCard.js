import Link from "next/link";

const CATEGORY_COLORS = {
  "의료법 계열": "bg-blue-50 text-blue-700 border-blue-200",
  개인정보보호법: "bg-purple-50 text-purple-700 border-purple-200",
  근로기준법: "bg-green-50 text-green-700 border-green-200",
  "시설/환경": "bg-blue-50 text-blue-700 border-blue-200",
  "인력/면허": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "원무/행정": "bg-gray-50 text-gray-700 border-gray-200",
  "응급/특수": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function LawCard({ law }) {
  const categoryStyle = CATEGORY_COLORS[law.category] || "bg-gray-50 text-gray-700 border-gray-200";

  const preview = law.content.length > 100 ? law.content.slice(0, 100) + "..." : law.content;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
      {/* 상단: 카테고리 + 시행일 */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${categoryStyle}`}>{law.category}</span>
        <span className="text-xs text-gray-400">{law.effectiveDate} 시행</span>
      </div>

      {/* 법령명 + 조문번호 */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm font-semibold text-gray-800">{law.lawName}</span>
        <span className="text-xs text-blue-600 font-medium">{law.article}</span>
      </div>

      {/* 조문 제목 */}
      <p className="text-base font-bold text-gray-900 mb-2">{law.title}</p>

      {/* 요약 */}
      <p className="text-xs text-gray-500 mb-2">{law.summary}</p>

      {/* 본문 미리보기 */}
      <p className="text-sm text-gray-600 leading-relaxed mb-3">{preview}</p>

      {/* 버튼 영역 */}
      <div className="flex gap-2">
        <Link
          href={`/article/${law.id}?src=${encodeURIComponent(law.source)}`}
          className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg font-medium transition-colors"
        >
          상세 보기 + AI 요약
        </Link>
        <a
          href={law.source}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 text-sm rounded-lg transition-colors"
        >
          원문 ↗
        </a>
      </div>
    </div>
  );
}
