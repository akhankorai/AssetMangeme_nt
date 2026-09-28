const fs = require('fs');
let r = fs.readFileSync('recover.txt', 'utf16le');
if (r.includes('@@ -6833,1111 +6833,6 @@')) {
  let startIdx = r.indexOf('@@ -6833,1111 +6833,6 @@');
  let endIdx = r.indexOf('[diff_block_end]', startIdx);
  let block = r.substring(startIdx, endIdx !== -1 ? endIdx : undefined);
  let diffLines = block.split(/\n|\r\n|\r/);
  let restoredLines = [];
  for (let dl of diffLines) {
    if (dl.match(/^>?\s*-/)) {
      restoredLines.push(dl.replace(/^>?\s*-/, '').replace(/\\r/g, '').replace(/\\n/g, ''));
    } else if (dl.includes('\\"-')) {
      restoredLines.push(dl.substring(dl.indexOf('\\"-') + 3).replace(/\\r/g, '').replace(/\\n/g, ''));
    }
  }
  let deletedContent = restoredLines.join('\n').replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  // It seems the first few lines get merged. Let's just restore from our file if needed.
  let styles = fs.readFileSync('styles.css', 'utf8');
  let fixed = styles.replace('/* Fix Input Fields Visibility and Focus States */', '/* Fix Input Fields Visibility and Focus States */\n' + deletedContent);
  fs.writeFileSync('styles.css', fixed);
  console.log('Recovered! Length:', deletedContent.length);
} else {
  console.log('Not found in txt');
}
