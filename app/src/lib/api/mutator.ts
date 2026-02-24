export const mutator = async ({ path, query, body, headers, method }: any) => {
  const url = path + (query ? `?${new URLSearchParams(query).toString()}` : "");
  const fetchOptions: RequestInit = {
    method: method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body && typeof body !== "undefined" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
  };

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const headerObj: Record<string, string> = {};
  try {
    res.headers.forEach((value: string, key: string) => {
      headerObj[key] = value;
    });
  } catch {
    // ignore
  }

  return { data, status: res.status, headers: headerObj };
};

export default mutator;
