import fs from 'fs';
import parser from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

const code = fs.readFileSync('./src/App.backup.jsx', 'utf-8');
const ast = parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });

let variablesToExport = new Set();
let appBodyStart = 0;
let returnStart = 0;

traverse(ast, {
  FunctionDeclaration(path) {
    if (path.node.id && path.node.id.name === 'App') {
      appBodyStart = path.node.body.start + 1; // After {
      
      const body = path.node.body.body; 
      
      for (const stmt of body) {
        if (stmt.type === 'ReturnStatement') {
            returnStart = stmt.start;
            break; // STOP at the first top-level return!
        } else if (stmt.type === 'IfStatement' && stmt.consequent.type === 'BlockStatement') {
            // Check if it's the `if (!authInitialized) return <div...`
            const hasReturn = stmt.consequent.body.some(b => b.type === 'ReturnStatement');
            if (hasReturn) {
                returnStart = stmt.start;
                break; // STOP before early returns!
            }
        }
        
        if (stmt.type === 'VariableDeclaration') {
          stmt.declarations.forEach(decl => {
             if (decl.id.type === 'Identifier') {
                variablesToExport.add(decl.id.name);
             } else if (decl.id.type === 'ArrayPattern') {
                decl.id.elements.forEach(el => {
                   if (el && el.type === 'Identifier') variablesToExport.add(el.name);
                });
             } else if (decl.id.type === 'ObjectPattern') {
                decl.id.properties.forEach(prop => {
                   if (prop.value && prop.value.type === 'Identifier') variablesToExport.add(prop.value.name);
                });
             }
          });
        } else if (stmt.type === 'FunctionDeclaration') {
          if (stmt.id && stmt.id.name) variablesToExport.add(stmt.id.name);
        }
      }
    }
  }
});

const variablesList = Array.from(variablesToExport).join(',\n    ');
console.log("Variables found: ", variablesToExport.size);

// Extract the logic block
const logicBlock = code.substring(appBodyStart, returnStart);

// Read imports from App.jsx to put in useAppManager.js
const imports = code.match(/^import .* from .*;$/gm).join('\n');

const useAppManagerCode = `${imports}

export function useAppManager() {
${logicBlock}

  return {
    ${variablesList}
  };
}
`;

fs.writeFileSync('./src/hooks/useAppManager.js', useAppManagerCode);

// Now rewrite App.jsx
const topOfApp = code.substring(0, appBodyStart);
const bottomOfApp = code.substring(returnStart);

const newAppCode = `import { useAppManager } from './hooks/useAppManager';
${topOfApp}
  const {
    ${variablesList}
  } = useAppManager();

  ${bottomOfApp}`;

fs.writeFileSync('./src/App.jsx', newAppCode);

console.log("Refactoring complete.");
