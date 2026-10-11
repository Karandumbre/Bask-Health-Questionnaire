import { describe, expect, it } from "vitest";
import { createPatientRequest } from "../../helpers/patient-request";

describe("patient integration request helpers", () => {
  it.each(["get", "post", "put"] as const)(
    "%s constructs the method with origin, host, and cookies",
    (method) => {
      const request = createPatientRequest[method]("/api/patient/session", {
        cookieHeader: "synthetic_session=synthetic_token",
      });
      expect(request.method).toBe(method.toUpperCase());
      expect(request.url).toBe("http://localhost:3000/api/patient/session");
      expect(request.headers.get("origin")).toBe("http://localhost:3000");
      expect(request.headers.get("host")).toBe("localhost:3000");
      expect(request.cookies.get("synthetic_session")?.value).toBe(
        "synthetic_token",
      );
      expect(request.headers.has("content-type")).toBe(false);
      expect(request.body).toBeNull();
    },
  );
  it.each(["post", "put"] as const)(
    "%s preserves JSON request bodies",
    async (method) => {
      const body = { expectedSessionRevision: 2, answers: {} };
      const request = createPatientRequest[method]("/api/patient/session", {
        body,
      });
      expect(request.headers.get("content-type")).toBe("application/json");
      expect(await request.json()).toEqual(body);
    },
  );
  it("constructs a bodyless POST without options", () => {
    const request = createPatientRequest.post("/api/patient/session");
    expect(request.method).toBe("POST");
    expect(request.body).toBeNull();
    expect(request.headers.has("cookie")).toBe(false);
  });
});
