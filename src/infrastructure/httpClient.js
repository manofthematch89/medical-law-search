/**
 * 어떤 외부 서비스와도 통신할 수 있는 순수한 HTTP 클라이언트입니다.
 */
export const httpClient = {
  async get(url, headers = {}) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    });

    if (!res.ok) {
      throw new Error(`HTTP GET 호출 실패: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  },

  async post(url, body, headers = {}) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`HTTP POST 호출 실패: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  }
};
