import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";

export async function GET(request) {
  const q = "의료법";
  const results = {};

  // 테스트 1: 기본 호출 (https)
  try {
    const url1 = `https://www.law.go.kr/DRF/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(q)}&display=3`;
    const r1 = await fetch(url1, { headers: { Accept: "application/json" } });
    const t1 = await r1.text();
    results.test1_https_basic = t1.slice(0, 200);
  } catch(e) { results.test1_https_basic = "ERR: " + e.message; }

  // 테스트 2: Referer 헤더 추가
  try {
    const url2 = `https://www.law.go.kr/DRF/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(q)}&display=3`;
    const r2 = await fetch(url2, {
      headers: {
        Accept: "application/json",
        Referer: "https://medical-law-search.vercel.app/",
        "User-Agent": "Mozilla/5.0 (compatible; MedLaw/1.0)",
      }
    });
    const t2 = await r2.text();
    results.test2_with_referer = t2.slice(0, 200);
  } catch(e) { results.test2_with_referer = "ERR: " + e.message; }

  // 테스트 3: http (not https)
  try {
    const url3 = `http://www.law.go.kr/DRF/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(q)}&display=3`;
    const r3 = await fetch(url3, { headers: { Accept: "application/json" } });
    const t3 = await r3.text();
    results.test3_http = t3.slice(0, 200);
  } catch(e) { results.test3_http = "ERR: " + e.message; }

  // 테스트 4: OC 없이 (확인용)
  try {
    const url4 = `https://www.law.go.kr/DRF/lawSearch.do?OC=test&target=law&type=JSON&query=${encodeURIComponent(q)}&display=1`;
    const r4 = await fetch(url4, { headers: { Accept: "application/json" } });
    const t4 = await r4.text();
    results.test4_oc_test = t4.slice(0, 200);
  } catch(e) { results.test4_oc_test = "ERR: " + e.message; }

  return NextResponse.json({ oc_length: LAW_API_OC.length, oc_value: LAW_API_OC, results });
}
