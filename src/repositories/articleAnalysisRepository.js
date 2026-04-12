import { geminiClient } from "../infrastructure/geminiClient";

/**
 * 법령 조문 분석 및 인사이트 저장소
 */
export const articleAnalysisRepository = {
  /**
   * 검색 시 정확도를 높이기 위해 검색어의 의미 데이터를 추출합니다.
   */
  async getSearchVector(text) {
    return await geminiClient.getEmbedding(text);
  },

  /**
   * 조문 내용을 심층 분석하여 실무 요약과 시사점을 도출합니다.
   */
  async analyzeArticle(lawTitle, lawContent) {
    const prompt = `법령 조문 요약 전문가로서 다음 조문을 분석해줘.
법령: ${lawTitle}
내용: ${lawContent}

다음 형식의 JSON으로만 응답해:
{
  "oneLine": "한 줄 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", "핵심 포인트 3"],
  "implications": "이 조문이 의료기관 실무에 주는 시사점"
}`;

    const textResponse = await geminiClient.generateText(prompt);
    const cleanJson = textResponse.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  }
};
