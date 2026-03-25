import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "의료법";

  const info = {
    oc: LAW_API_OC ? "SET(" + LAW_API_OC.length + "chars)" : "EMPTY",
    query: q,
  };

  try {
    const url = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(q)}&display=3&page=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch(e) {}
    return NextResponse.json({
      ...info,
      status: res.status,
      ok: res.ok,
      rawSlice: text.slice(0, 500),
      parsed: parsed ? JSON.stringify(parsed).slice(0, 800) : null,
    });
  } catch (err) {
    return NextResponse.json({ ...info, error: err.message }, { status: 500 });
  }
}
