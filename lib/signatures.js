// lib/signatures.js
import fs from "fs";
import path from "path";

export function loadSignatures() {
  const filePath = path.join(process.cwd(), "signatures.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

