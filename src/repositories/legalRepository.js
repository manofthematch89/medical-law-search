import { httpClient } from "../infrastructure/httpClient";

const LAW_GOV_BASE_URL = "https://www.law.go.kr/DRF";

/**
 * 대외 기관 법령 정보 저장소
 */
export const legalRepository = {
  /**
   * 공식 기관으로부터 특정 법령의 상세 정보를 조회합니다.
   */
  async getLawDetail(lawId) {
    const OC = process.env.LAW_API_OC || "1234";
    const params = new URLSearchParams({
      OC,
      target: "law",
      type: "JSON",
      ID: lawId
    }).toString();

    const url = `${LAW_GOV_BASE_URL}/lawService.do?${params}`;
    
    const headers = { 
      "Referer": "https://medical-law-search.vercel.app/" 
    };

    const data = await httpClient.get(url, headers);
    return data.Law || data.법령;
  }
};
