import { useState, useEffect } from "react";
import { getLawDetailAction } from "../actions/lawActions";

/**
 * 법령 상세 정보 및 AI 요약 상태를 관리하는 커스텀 훅
 */
export function useLawDetail(id) {
  const [law, setLaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchDetail() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLawDetailAction(id);
        if (data) {
          setLaw(data);
        } else {
          setError("조문을 찾을 수 없습니다.");
        }
      } catch (err) {
        console.error("Fetch Detail Error:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id]);

  return { law, loading, error };
}
