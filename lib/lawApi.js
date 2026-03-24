// ============================================================
// lawApi.js — 법령 API 모듈
//
// Phase 1: 더미 데이터 반환 (아래 USE_DUMMY = true)
// Phase 2: 법제처 Open API 실제 연동 (USE_DUMMY = false 로 변경)
//
// ※ 이 파일만 수정하면 전체 앱의 데이터 소스가 교체됩니다.
//    컴포넌트 코드를 건드릴 필요 없음.
// ============================================================

import { dummyLaws, keywordMap } from "./dummyData";

const USE_DUMMY = true; // Phase 2에서 false 로 변경
const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

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

  // 의료법 계열 우선 정렬
  results.sort((a, b) => a.priority - b.priority);

  return Promise.resolve(results);
}

function getDummyById(id) {
  const law = dummyLaws.find((l) => l.id === id);
  return Promise.resolve(law || null);
}

// ─── 실제 API 구현 (Phase 2) ────────────────────────────────

async function searchRealApi(query) {
  const keyword = convertKeyword(query);
  const url = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(keyword)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("법제처 API 호출 실패");

  const data = await res.json();
  // TODO: 실제 응답 구조에 맞게 파싱 (Phase 2에서 작성)
  return data;
}

async function getRealApiById(id) {
  const url = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_OC}&target=law&type=JSON&ID=${id}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("법제처 API 호출 실패");

  const data = await res.json();
  // TODO: 실제 응답 구조에 맞게 파싱 (Phase 2에서 작성)
  return data;
}
