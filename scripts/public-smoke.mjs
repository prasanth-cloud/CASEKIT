#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.CASEKIT_E2E_PORT ?? 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const server = spawn(command, ["exec", "next", "start", "-p", String(port)], {
  env: { ...process.env, PORT: String(port) },
  stdio: "inherit",
});

async function request(path, init = {}) {
  return fetch(`${baseUrl}${path}`, { redirect: "manual", ...init });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await request("/login");
      if (response.status < 500) return;
    } catch {
      // The server may still be starting.
    }
    await delay(1000);
  }
  throw new Error("The production server did not become ready.");
}

try {
  await waitForServer();

  const login = await request("/login");
  const loginHtml = await login.text();
  assert.equal(login.status, 200);
  assert.match(loginHtml, /<main>/);
  assert.match(loginHtml, /<h1[^>]*>Sign in<\/h1>/);
  assert.match(loginHtml, /name="email"/);
  assert.match(loginHtml, /name="password"/);
  assert.match(loginHtml, /type="submit"/);

  const protectedRoute = await request("/cases");
  assert.ok([307, 308].includes(protectedRoute.status), `Expected an auth redirect, received ${protectedRoute.status}.`);
  assert.match(protectedRoute.headers.get("location") ?? "", /\/login\?next=%2Fcases/);

  const manifest = await request("/manifest.webmanifest");
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get("content-type") ?? "", /application\/manifest\+json/);

  const robots = await request("/robots.txt");
  assert.equal(robots.status, 200);

  console.log("Public production smoke passed: login, protected redirect, manifest, and robots surfaces.");
} finally {
  server.kill("SIGTERM");
  await delay(100);
}
