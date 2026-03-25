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

  // 2. Get IP info
  try {
    const r = await fetch(`https://ipapi.co/${result.outgoing_ip}/json/`);
    const d = await r.json();
    result.ip_country = d.country_name;
    result.ip_region = d.region;
    result.ip_org = d.org;
  } catch (e) {
    result.ip_info_error = e.message;
  }

  // 3. Test law.go.kr API directly
  const oc = process.env.LAW_API_OC || "(not set)";
  result.oc_value = oc;
  try {
    const lawUrl = `https://www.law.go.kr/DRF/lawSearch.do?OC=${oc}&target=law&type=JSON&query=%EC%9D%98%EB%A3%8C%EB%B2%95&display=3`;
    result.law_url = lawUrl;
    const r = await fetch(lawUrl, { headers: { "Accept": "application/json" } });
    result.law_status = r.status;
    const text = await r.text();
    result.law_raw = text.substring(0, 500);
    try {
      const json = JSON.parse(text);
      result.law_json_keys = Object.keys(json);
      if (json.result) result.law_verification = json.result;
      if (json.LawSearch) result.law_count = json.LawSearch.totalCnt;
    } catch (e) {
      result.law_parse_error = e.message;
    }
  } catch (e) {
    result.law_error = e.message;
  }

  return NextResponse.json(result, { status: 200 });
}
