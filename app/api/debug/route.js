import { NextResponse } from "next/server";
export const runtime = "edge";
export const preferredRegion = "icn1";

const H = {
  "Accept": "application/json",
  "Referer": "https://medical-law-search.vercel.app/",
  "Origin": "https://medical-law-search.vercel.app",
};

export async function GET() {
  const oc = process.env.LAW_API_OC || "";
  const base = "https://www.law.go.kr/DRF";
  const result = {};

  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    result.outgoing_ip = d.ip;
  } catch(e) { result.outgoing_ip = "error"; }

  // 의료법 검색 — 법령ID 목록 확인
  try {
    const r = await fetch(`${base}/lawSearch.do?OC=${oc}&target=law&type=JSON&query=%EC%9D%98%EB%A3%8C%EB%B2%95&display=15`, { headers: H });
    const d = await r.json();
    const laws = Array.isArray(d?.LawSearch?.law) ? d.LawSearch.law : [d?.LawSearch?.law].filter(Boolean);
    result.law_total = d?.LawSearch?.totalCnt;
    result.laws = laws.map(l => ({ id: l["법령ID"], name: String(l["법령명"] || l["법령명한글"] || "") }));
  } catch(e) { result.law_error = e.message; }

  return NextResponse.json(result);
}
