import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET() {
  const results = {};

  // 1. 발신 IP 확인 (ipify)
  try {
    const r = await fetch("https://api.ipify.org?format=json");
    const d = await r.json();
    results.outgoing_ip = d.ip;
  } catch(e) { results.outgoing_ip = "ERR: " + e.message; }

  // 2. 발신 IP 확인 (ifconfig.me)
  try {
    const r = await fetch("https://ifconfig.me/ip");
    results.outgoing_ip2 = await r.text();
  } catch(e) { results.outgoing_ip2 = "ERR: " + e.message; }

  // 3. 발신 IP 국가 확인
  try {
    const r = await fetch("https://ipapi.co/" + (results.outgoing_ip || "") + "/json/");
    const d = await r.json();
    results.ip_country = d.country_name;
    results.ip_region = d.region;
    results.ip_org = d.org;
  } catch(e) { results.ip_info = "ERR: " + e.message; }

  return NextResponse.json(results);
}
