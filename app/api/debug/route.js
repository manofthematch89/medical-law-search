import { NextResponse } from "next/server";
export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET() {
  const result = {};

  // 1. Get outgoing IP
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    result.outgoing_ip = d.ip;
  } catch (e) {
    result.outgoing_ip = "error: " + e.message;
  }

  const oc = process.env.LAW_API_OC || "(not set)";
  result.oc_value = oc;
  const lawUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${oc}&target=law&type=JSON&query=%EC%9D%98%EB%A3%8C%EB%B2%95&display=3`;

  // 2. Test WITHOUT Referer
  try {
    const r = await fetch(lawUrl, { headers: { "Accept": "application/json" } });
    const text = await r.text();
    const json = JSON.parse(text);
    result.no_referer = json.result || (json.LawSearch ? "OK count=" + json.LawSearch.totalCnt : text.substring(0, 100));
  } catch (e) {
    result.no_referer_err = e.message;
  }

  // 3. Test WITH Referer
  try {
    const r = await fetch(lawUrl, {
      headers: {
        "Accept": "application/json",
        "Referer": "https://medical-law-search.vercel.app/",
        "Origin": "https://medical-law-search.vercel.app",
        "User-Agent": "Mozilla/5.0 (compatible; MdLaw/1.0)"
      }
    });
    const text = await r.text();
    const json = JSON.parse(text);
    result.with_referer = json.result || (json.LawSearch ? "OK count=" + json.LawSearch.totalCnt : text.substring(0, 100));
  } catch (e) {
    result.with_referer_err = e.message;
  }

  // 4. Test with HTTP (not HTTPS)
  try {
    const httpUrl = lawUrl.replace("https://", "http://");
    const r = await fetch(httpUrl, { headers: { "Accept": "application/json" } });
    const text = await r.text();
    const json = JSON.parse(text);
    result.http_test = json.result || (json.LawSearch ? "OK count=" + json.LawSearch.totalCnt : text.substring(0, 100));
  } catch (e) {
    result.http_test_err = e.message;
  }

  return NextResponse.json(result, { status: 200 });
}
