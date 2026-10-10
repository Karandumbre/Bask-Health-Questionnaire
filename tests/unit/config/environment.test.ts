import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getDatabaseConfig,
  getPublicSupabaseConfig,
  getRuntimeConfig,
  readEnvironment,
  ENVIRONMENT_DEFAULTS,
  ENVIRONMENT_NAMES,
  ENVIRONMENT_KEYS,
  ENVIRONMENT_VALUES,
} from "../../../config/environment.mjs";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("central environment configuration", () => {
  it("reads runtime overrides lazily and falls back to the pooled database URL", () => {
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.DATABASE_URL],
      "postgres://test/first",
    );
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.DIRECT_DATABASE_URL],
      ENVIRONMENT_DEFAULTS.EMPTY,
    );
    expect(getDatabaseConfig().directUrl).toBe("postgres://test/first");
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.DIRECT_DATABASE_URL],
      "postgres://test/direct",
    );
    expect(getDatabaseConfig().directUrl).toBe("postgres://test/direct");
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.NODE_ENV],
      ENVIRONMENT_VALUES.PRODUCTION,
    );
    expect(getRuntimeConfig().isProduction).toBe(true);
  });
  it("supports public key migration without returning private configuration", () => {
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.PUBLIC_SUPABASE_URL],
      "https://test.example",
    );
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.PUBLIC_SUPABASE_KEY],
      ENVIRONMENT_DEFAULTS.EMPTY,
    );
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.PUBLIC_SUPABASE_ANON_KEY],
      "legacy-public-key",
    );
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.SESSION_PEPPER],
      "private-value",
    );
    expect(getPublicSupabaseConfig()).toEqual({
      url: "https://test.example",
      key: "legacy-public-key",
    });
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.PUBLIC_SUPABASE_KEY],
      "new-public-key",
    );
    expect(getPublicSupabaseConfig()?.key).toBe("new-public-key");
    vi.stubEnv(
      ENVIRONMENT_NAMES[ENVIRONMENT_KEYS.PUBLIC_SUPABASE_URL],
      ENVIRONMENT_DEFAULTS.EMPTY,
    );
    expect(getPublicSupabaseConfig()).toBeNull();
  });
  it("rejects private environment reads in a browser runtime", () => {
    vi.stubGlobal("window", {});
    expect(() => readEnvironment(ENVIRONMENT_KEYS.SESSION_PEPPER)).toThrow(
      "server runtime",
    );
  });
});
