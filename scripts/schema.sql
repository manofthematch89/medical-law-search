-- ============================================================
-- MdLaw — Supabase 스키마 (Phase 1 기반)
-- ============================================================

-- 1. 한국어 trigram 검색을 위한 pg_trgm 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. laws 테이블 — 법령 메타정보
-- ============================================================
CREATE TABLE IF NOT EXISTS laws (
  law_id         TEXT        PRIMARY KEY,   -- 법제처 법령ID (예: "0001788")
  law_name       TEXT        NOT NULL,      -- 법령명한글 (예: "의료법")
  law_type       TEXT,                      -- 법령구분 (법률 / 대통령령 / 부령 등)
  effective_date TEXT,                     -- 시행일자 (YYYY-MM-DD 포맷으로 변환 저장)
  law_serial_no TEXT,                      -- 법령일련번호 (원문 링크용)
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. articles 테이블 — 조문 본문
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id             TEXT        PRIMARY KEY,          -- "{law_id}_{article_no}" 복합 ID
  law_id         TEXT        NOT NULL
                  REFERENCES laws(law_id) ON DELETE CASCADE,
  article_no    TEXT        NOT NULL,             -- 조문번호 (예: "1", "20의2")
  article_title TEXT        NOT NULL DEFAULT '',  -- 조문제목 (예: "의료인의 종류")
  content        TEXT        NOT NULL DEFAULT '',  -- 조문내용 + 항내용 합산 텍스트
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3-1. (Phase 5) articles 업무 분류용 category 컬럼
-- ============================================================
ALTER TABLE articles ADD COLUMN IF NOT EXISTS category TEXT;

-- ============================================================
-- 4. GIN 인덱스 — trigram 기반 검색 성능
-- ============================================================

-- 조문 본문 검색 인덱스 (핵심)
CREATE INDEX IF NOT EXISTS articles_content_trgm_idx
  ON articles USING GIN (content gin_trgm_ops);

-- 조문 제목 검색 인덱스
CREATE INDEX IF NOT EXISTS articles_title_trgm_idx
  ON articles USING GIN (article_title gin_trgm_ops);

-- category 필터링 속도를 높이기 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);

-- law_id FK 조회 인덱스
CREATE INDEX IF NOT EXISTS articles_law_id_idx
  ON articles (law_id);

-- 법령명 검색 인덱스 (laws 테이블)
CREATE INDEX IF NOT EXISTS laws_name_trgm_idx
  ON laws USING GIN (law_name gin_trgm_ops);

-- ============================================================
-- 5. 검색용 RPC 함수 — 키워드로 조문 + 법령 정보 조인 검색
-- ============================================================
CREATE OR REPLACE FUNCTION search_articles(kw TEXT, lmt INT DEFAULT 20)
RETURNS TABLE (
  id             TEXT,
  law_id         TEXT,
  law_name       TEXT,
  law_type       TEXT,
  effective_date TEXT,
  law_serial_no TEXT,
  article_no    TEXT,
  article_title TEXT,
  content        TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.law_id,
    l.law_name,
    l.law_type,
    l.effective_date,
    l.law_serial_no,
    a.article_no,
    a.article_title,
    a.content
  FROM articles a
  JOIN laws l ON a.law_id = l.law_id
  WHERE
    a.content      ILIKE '%' || kw || '%'
    OR a.article_title ILIKE '%' || kw || '%'
  ORDER BY
    -- 의료법 계열 우선 노출
    CASE
      WHEN l.law_name LIKE '%의료법%'    THEN 1
      WHEN l.law_name LIKE '%응급의료%'  THEN 2
      WHEN l.law_name LIKE '%약사법%'    THEN 3
      WHEN l.law_name LIKE '%개인정보%'  THEN 4
      WHEN l.law_name LIKE '%근로기준%'  THEN 5
      ELSE 6
    END,
    -- 제목에 키워드 포함 시 본문보다 우선
    CASE WHEN a.article_title ILIKE '%' || kw || '%' THEN 0 ELSE 1 END
  LIMIT lmt;
$$;

