/**
 * Must be imported before any module that reads `process.env` for the backend.
 * `tsx server.ts` does not load `.env*` automatically; Next's `loadEnvConfig` matches `next dev`.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
