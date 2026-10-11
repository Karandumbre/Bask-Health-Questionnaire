import { NextRequest } from "next/server";

function withMethod(method: "GET" | "POST" | "PUT") {
  return (
    url: string,
    options: {
      body?: unknown;
      cookieHeader?: string;
    } = {},
  ) => {
    const { body, cookieHeader } = options;
    const headers = new Headers();
    headers.set("origin", "http://localhost:3000");
    headers.set("host", "localhost:3000");
    if (body) {
      headers.set("content-type", "application/json");
    }
    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    return new NextRequest(new URL(url, "http://localhost:3000"), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  };
}

export const createPatientRequest = {
  get: withMethod("GET"),
  post: withMethod("POST"),
  put: withMethod("PUT"),
};
