import fs from 'fs';

const filePath = 'c:/omega/Asset Management/Asset Management/Asset Management/frontend/src/hooks/useAppManager.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace imports starting with "./" to "../"
content = content.replace(/from "\.\//g, 'from "../');

fs.writeFileSync(filePath, content);
console.log("Fixed quotes in useAppManager.js");
