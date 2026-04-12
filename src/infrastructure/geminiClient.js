import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const EMBEDDING_MODEL_NAME = "gemini-embedding-001";
const ANALYSIS_MODEL_NAME = "gemini-1.5-flash";

const genAI = API_KEY ? new GoogleGenAI(API_KEY) : null;

/**
 * Gemini AI 인프라 클라이언트
 * 실제 모델 호출과 관련된 기술적인 저수준 로직을 담당합니다.
 */
export const geminiClient = {
  /**
   * 텍스트를 벡터로 변환 (Embedding)
   */
  async getEmbedding(text) {
    if (!genAI) return null;
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL_NAME });
    const result = await model.embedContent(text);
    return result?.embedding?.values || null;
  },

  /**
   * 프롬프트를 통해 콘텐츠 생성
   */
  async generateText(prompt) {
    if (!genAI) throw new Error("Gemini AI 클라이언트가 초기화되지 않았습니다.");
    const model = genAI.getGenerativeModel({ model: ANALYSIS_MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }
};
