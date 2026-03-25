// ============================================================
// lawApi.js — 법령 API 모듈
//
// Phase 1: 더미 데이터 반환 (USE_DUMMY = true)
// Phase 2: 법제처 Open API 실제 연동 (USE_DUMMY = false) ✅ 현재
//
// ※ 이 파일만 수정하면 전체 앱의 데이터 소스가 교체됩니다.
// 컴포넌트 코드를 건드릴 필요 없음.
// ============================================================

import { dummyLaws, keywordMap } from "./dummyData";

const USE_DUMMY = false; // Phase 2: 실제 API 사용

// 실무 표현 → 법령 키워드 자동 변환
function convertKeyword(query) {
  const trimmed = query.trim();
  return keywordMap[trimmed] || trimmed;
}

// 법령 검색 — 키워드로 관련 법령 목록 반환
export async function searchLaws(query) {
  if (USE_DUMMY) {
    return searchDummy(query);
  }
  return searchRealApi(query);
}

// 특정 법령 상세 조회 — ID로 조문 전체 내용 반환
export async function getLawById(id) {
  if (USE_DUMMY) {
    return getDummyById(id);
  }
  return getRealApiById(id);
}

// ─── DUMMY 구현 ────────────────────────────────────────────

function searchDummy(query) {
  const keyword = convertKeyword(query).toLowerCase();
  const results = dummyLaws.filter(
    (law) =>
      law.title.toLowerCase().includes(keyword) ||
      law.summary.toLowerCase().includes(keyword) ||
      law.content.toLowerCase().includes(keyword) ||
      law.lawName.toLowerCase().includes(keyword)
  );
  results.sort((a, b) => a.priority - b.priority);
  return Promise.resolve(results);
}

function getDummyById(id) {
  const law = dummyLaws.find((l) => l.id === id);
  return Promise.resolve(law || null);
}

// ─── 실제 API 구현 (Phase 2) ────────────────────────────────
// Next.js API Route를 통해 서버사이드에서 법제처 API 호출
// (브라우저에서 직접 law.go.kr 호출 시 CORS 오류 발생하므로 프록시 사용)

async function searchRealApi(query) {
  const keyword = convertKeyword(query);
  const res = await fetch(`/api/search?query=${encodeURIComponent(keyword)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "검색 API 호출 실패");
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function getRealApiById(id) {
  const res = await fetch(`/api/article?id=${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "조문 API 호출 실패");
  }
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data;
}
