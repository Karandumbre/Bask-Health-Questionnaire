import type { Database } from "./index";

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
