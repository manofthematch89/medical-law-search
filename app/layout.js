import "./globals.css";

export const metadata = {
  title: "MdLaw — 의료법령 검색 AI 탐색기",
  description: "병원 실무자를 위한 의료법령 검색 도구",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* 상단 헤더 */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <span className="text-blue-600 text-xl">⚖️</span>
              <span className="font-bold text-blue-700 text-lg tracking-tight">
                MdLaw
              </span>
            </a>
            <span className="text-gray-400 text-sm hidden sm:block">
              의료법령 검색 AI 탐색기
            </span>
          </div>
        </header>

        {/* 본문 */}
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>

        {/* 하단 푸터 */}
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-3xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
            본 서비스는 법령 조문 기반 참고 정보를 제공합니다. 법적 판단은 원문
            및 전문가 확인이 필요합니다.
          </div>
        </footer>
      </body>
    </html>
  );
}
