import fs from 'fs';
import path from 'path';

const pagesDir = 'c:/omega/Asset Management/Asset Management/Asset Management/frontend/src/pages';
const folders = fs.readdirSync(pagesDir).filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());

folders.forEach(folder => {
    const file = path.join(pagesDir, folder, `${folder}.jsx`);
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        
        // We need to replace imports that start with "../" to "../../"
        // And those that start with "../../" to "../../../"
        // The safest way is to do it using regex for import statements
        
        content = content.replace(/from\s+['"](\.\.\/.*?)['"]/g, (match, p1) => {
            return `from "../${p1}"`;
        });
        
        fs.writeFileSync(file, content);
    }
});

console.log("Fixed relative imports in page files");
