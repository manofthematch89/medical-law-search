import { supabase } from "../infrastructure/supabase";

/**
 * 법령 조문 데이터 저장소
 */
export const articleRepository = {
  /**
   * 입력한 내용과 의미적으로 유사한 조문들을 찾습니다.
   */
  async searchArticlesByVector(embedding, threshold, count) {
    const { data, error } = await supabase.rpc("match_articles", {
      query_embedding: embedding,
      match_threshold: threshold,
      match_count: count,
    });
    if (error) throw error;
    return data;
  },

  /**
   * 특정 단어가 포함된 조문들을 검색합니다.
   */
  async searchArticlesByText(keyword, limit = 50) {
    const { data, error } = await supabase.rpc("search_articles", {
      kw: keyword,
      lmt: limit,
    });
    if (error) throw error;
    return data;
  },

  /**
   * 지정된 조문들의 업무 분류 정보를 가져옵니다.
   */
  async getArticleCategories(ids) {
    if (!ids || ids.length === 0) return [];
    const { data, error } = await supabase
      .from("articles")
      .select("id, category")
      .in("id", ids);
    if (error) throw error;
    return data;
  }
};
