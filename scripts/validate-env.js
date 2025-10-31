#!/usr/bin/env node
const required = [
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_ASSEMBLYAI_WORKER",
];

const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");

if (missing.length === 0) {
  console.log("env: OK");
  process.exit(0);
}

const isCI = String(process.env.CI || "").toLowerCase() === "true";
const failOnMissing = String(process.env.FAIL_ON_ENV_MISSING || "").toLowerCase() === "true";

const message = `Missing required env vars: ${missing.join(", ")}`;

if (isCI || failOnMissing) {
  console.error(message);
  process.exit(1);
} else {
  console.warn(message);
  process.exit(0);
}
