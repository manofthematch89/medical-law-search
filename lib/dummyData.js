// ============================================================
// 더미 데이터 — Phase 1 전용
// Phase 2에서 법제처 API 연동 후 이 파일은 더 이상 사용하지 않음
// 필드명은 실제 API 응답 구조와 동일하게 유지할 것
// ============================================================

export const dummyLaws = [
  {
    id: "med-001",
    lawName: "의료법 시행규칙",
    article: "별표 4",
    title: "의료기관의 시설규격",
    summary: "병실 면적 및 병상 간격 관련 기준",
    effectiveDate: "2025-01-01",
    category: "의료법 계열",
    content:
      "병실의 면적은 입원환자 1인당 6.3제곱미터 이상이어야 하며, 병상과 병상 사이의 간격은 1.5미터 이상이어야 한다. 다만, 신생아실·격리실·회복실·중환자실 및 이와 유사한 특수 목적의 병실은 그 시설의 이용목적에 따라 달리 정할 수 있다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&eventGubun=060101&query=%EC%9D%98%EB%A3%8C%EB%B2%95+%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99",
    priority: 1,
  },
  {
    id: "med-002",
    lawName: "의료법",
    article: "제22조",
    title: "진료기록부 등",
    summary: "진료기록부 작성 및 보존 의무",
    effectiveDate: "2024-08-07",
    category: "의료법 계열",
    content:
      "의료인은 각각 진료기록부, 조산기록부, 간호기록부, 그 밖의 진료에 관한 기록을 갖추어 두고 환자의 주된 증상, 진단 및 치료 내용 등 보건복지부령으로 정하는 의료행위에 관한 사항과 의견을 상세히 기록하고 서명하여야 한다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EC%9D%98%EB%A3%8C%EB%B2%95",
    priority: 1,
  },
  {
    id: "med-003",
    lawName: "의료법 시행규칙",
    article: "제15조",
    title: "진료기록부 등의 보존",
    summary: "진료기록 종류별 보존 기간 기준",
    effectiveDate: "2024-08-07",
    category: "의료법 계열",
    content:
      "의료인이나 의료기관 개설자는 진료기록부를 10년간 보존하여야 하며, 조산기록부·간호기록부는 5년간, 검사소견기록은 5년간, 방사선사진 및 그 소견서는 5년간 보존하여야 한다. 다만, 계속적인 진료를 위하여 필요한 경우에는 1회에 한정하여 연장 보존할 수 있다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EC%9D%98%EB%A3%8C%EB%B2%95+%EC%8B%9C%ED%96%89%EA%B7%9C%EC%B9%99",
    priority: 1,
  },
  {
    id: "med-004",
    lawName: "의료법",
    article: "제45조의2",
    title: "비급여 진료비용의 고지",
    summary: "비급여 항목 고지 의무 및 방법",
    effectiveDate: "2024-01-01",
    category: "의료법 계열",
    content:
      "의료기관 개설자는 비급여 대상의 진료비용을 환자 또는 환자의 보호자가 쉽게 볼 수 있는 장소에 게시하고, 인터넷 홈페이지를 운영하는 경우 그 홈페이지에도 게시하여야 한다. 게시 항목은 항목별 가격, 가격의 산출기준 등을 포함하여야 한다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EC%9D%98%EB%A3%8C%EB%B2%95",
    priority: 1,
  },
  {
    id: "med-005",
    lawName: "의료법",
    article: "제24조의2",
    title: "의료행위에 대한 설명",
    summary: "수술·시술 전 환자 설명 및 동의 의무",
    effectiveDate: "2024-08-07",
    category: "의료법 계열",
    content:
      "의사·치과의사 또는 한의사는 사람의 생명 또는 신체에 중대한 위해를 발생하게 할 우려가 있는 수술, 수혈, 전신마취를 하는 경우 환자에게 설명하고 서면으로 동의를 받아야 한다. 다만, 환자의 의식이 없거나 응급환자인 경우 등 대통령령으로 정하는 경우에는 환자의 친족 또는 법정대리인에게 설명하고 동의를 받아야 한다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EC%9D%98%EB%A3%8C%EB%B2%95",
    priority: 1,
  },
  {
    id: "priv-001",
    lawName: "개인정보 보호법",
    article: "제35조",
    title: "개인정보의 열람",
    summary: "환자 본인의 개인정보(진료기록 포함) 열람 요청 권리",
    effectiveDate: "2023-09-15",
    category: "개인정보보호법",
    content:
      "정보주체는 개인정보처리자가 처리하는 자신의 개인정보에 대한 열람을 해당 개인정보처리자에게 요구할 수 있다. 개인정보처리자는 열람 요구를 받은 날부터 10일 이내에 정보주체가 해당 개인정보를 열람할 수 있도록 하여야 한다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4+%EB%B3%B4%ED%98%B8%EB%B2%95",
    priority: 2,
  },
  {
    id: "labor-001",
    lawName: "근로기준법",
    article: "제50조",
    title: "근로시간",
    summary: "1주 및 1일 법정 근로시간 기준",
    effectiveDate: "2021-01-01",
    category: "근로기준법",
    content:
      "1주간의 근로시간은 휴게시간을 제외하고 40시간을 초과할 수 없다. 1일의 근로시간은 휴게시간을 제외하고 8시간을 초과할 수 없다. 다만, 당사자 간에 합의하면 1주간에 12시간을 한도로 제50조의 근로시간을 연장할 수 있다.",
    source: "https://www.law.go.kr/lsSc.do?section=&menuId=1&subMenuId=15&tabMenuId=81&query=%EA%B7%BC%EB%A1%9C%EA%B8%B0%EC%A4%80%EB%B2%95",
    priority: 3,
  },
];

// 검색어 → 법령 키워드 변환 사전 (Phase 2에서 고도화)
export const keywordMap = {
  "차트 보관": "진료기록부 보존기간",
  "차트 보존": "진료기록부 보존기간",
  "병실 크기": "의료기관 시설규격",
  "병실 면적": "의료기관 시설규격",
  "비급여 고지": "비급여 진료비용 고지",
  "비급여 게시": "비급여 진료비용 고지",
  "개인정보 열람": "개인정보 열람 요청",
  "근무시간": "근로시간",
  "설명 동의": "의료행위 설명",
  "수술 동의": "의료행위 설명",
};
