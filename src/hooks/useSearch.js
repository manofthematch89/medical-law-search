import { useState, useEffect } from "react";
import { searchLawsAction } from "../actions/lawActions";

/**
 * 검색 및 카테고리 필터링 로직을 관리하는 커스텀 훅
 */
export function useSearch(initialQuery = "") {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("전체");

  // 검색 수행
  const performSearch = async (q) => {
    if (!q?.trim()) return;
    setLoading(true);
    setActiveCategory("전체");
    try {
      const data = await searchLawsAction(q);
      setResults(data);
    } catch (err) {
      console.error("Search Action Error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 쿼리가 바뀔 때마다 검색
  useEffect(() => {
    performSearch(initialQuery);
  }, [initialQuery]);

  // 카테고리 목록 추출 (중복 제거 및 정렬)
  const categories = ["전체", ...new Set(results.map(r => r.category).filter(Boolean))];

  // 현재 선택된 카테고리에 따른 필터링 결과
  const filteredResults = activeCategory === "전체" 
    ? results 
    : results.filter(r => r.category === activeCategory);

  return {
    results,
    filteredResults,
    loading,
    categories,
    activeCategory,
    setActiveCategory,
    performSearch
  };
}
