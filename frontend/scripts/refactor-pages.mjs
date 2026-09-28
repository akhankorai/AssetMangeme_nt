import fs from 'fs';
import path from 'path';

const pagesDir = 'c:/omega/Asset Management/Asset Management/Asset Management/frontend/src/pages';
const appJsxPath = 'c:/omega/Asset Management/Asset Management/Asset Management/frontend/src/App.jsx';

const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.jsx'));

let appJsxContent = fs.readFileSync(appJsxPath, 'utf8');

files.forEach(file => {
    const componentName = path.basename(file, '.jsx');
    const folderPath = path.join(pagesDir, componentName);
    
    // Create folder
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    }
    
    // Move file
    const oldPath = path.join(pagesDir, file);
    const newPath = path.join(folderPath, file);
    fs.renameSync(oldPath, newPath);
    
    // Update App.jsx import
    const oldImport = `import ${componentName} from "./pages/${componentName}";`;
    const newImport = `import ${componentName} from "./pages/${componentName}/${componentName}";`;
    appJsxContent = appJsxContent.replace(oldImport, newImport);
});

fs.writeFileSync(appJsxPath, appJsxContent);
console.log("Moved files and updated App.jsx");
