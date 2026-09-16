#!/usr/bin/env node

import { evaluateReleaseGates } from "./release-gates.mjs";

const productionMode = process.argv.includes("--production");
const result = evaluateReleaseGates();

console.log(JSON.stringify({ mode: productionMode ? "production" : "ci", ...result }, null, 2));

if (productionMode && !result.ready) {
  console.error("Release blocked: configure the external observability providers and obtain explicit release approval.");
  process.exitCode = 1;
}
