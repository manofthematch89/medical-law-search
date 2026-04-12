import { useState, useEffect } from "react";
import { getAiSummaryAction } from "../actions/lawActions";

/**
 * 조문 분석 데이터를 가져오고 상태를 관리하는 커스텀 훅
 */
export function useAiSummary(lawTitle, lawContent) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!lawTitle || !lawContent) return;

    async function fetchSummary() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAiSummaryAction(lawTitle, lawContent);
        setSummary(data);
      } catch (err) {
        console.error("AI Summary Error:", err);
        setError("분석 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [lawTitle, lawContent]);

  return { summary, loading, error };
}
