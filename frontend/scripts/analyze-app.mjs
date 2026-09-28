/**
 * Script to analyze App.jsx JSX structure
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, "src");
const appFile = join(srcDir, "App.jsx");
const lines = readFileSync(appFile, "utf-8").split("\n");

// Find return statement
let returnStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("if (!isAuthenticated) {")) {
    console.log("Auth gate starts at line:", i + 1);
  }
  if (lines[i] === "  return (") {
    console.log("Main return starts at line:", i + 1);
    returnStart = i;
  }
  if (lines[i].includes("<aside className=\"sidebar\">")) {
    console.log("Sidebar starts at line:", i + 1);
  }
  if (lines[i].includes("<header className=\"topbar\">")) {
    console.log("Header starts at line:", i + 1);
  }
  if (lines[i].includes("<main className=\"main\">")) {
    console.log("Main content starts at line:", i + 1);
  }
  if (lines[i].includes("className=\"modal\"") || lines[i].includes("className=\"modal ")) {
    console.log("Modal found at line:", i + 1);
  }
}
