const fs = require('fs');
let r = fs.readFileSync('C:/Users/hp/.gemini/antigravity-ide/brain/dc2cadbe-57a4-4652-b0e0-4764e9f9bba5/.system_generated/logs/transcript_full.jsonl', 'utf8');
let targetStr = '@@ -6833,1111 +6833,6 @@';
let startIdx = r.lastIndexOf(targetStr);
if (startIdx !== -1) {
  let endIdx = r.indexOf('[diff_block_end]', startIdx);
  let block = r.substring(startIdx, endIdx);
  let diffLines = block.split(/\n/);
  let restoredLines = [];
  for (let dl of diffLines) {
    if (dl.startsWith('\\"-')) {
      restoredLines.push(dl.substring(3));
    } else if (dl.startsWith('"-')) {
      restoredLines.push(dl.substring(2));
    } else if (dl.startsWith('-')) {
      restoredLines.push(dl.substring(1));
    }
  }
  let deletedContent = restoredLines.join('\n').replace(/\\r/g, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
  
  let styles = fs.readFileSync('styles.css', 'utf8');
  if (styles.includes('Fix Input Fields Visibility')) {
     let fixed = styles.replace('/* Fix Input Fields Visibility and Focus States */', '/* Fix Input Fields Visibility and Focus States */\n' + deletedContent);
     fs.writeFileSync('styles.css', fixed);
     console.log('Recovered! Length:', deletedContent.length);
  } else {
     let fixed = styles + '\n/* Fix Input Fields Visibility and Focus States */\n' + deletedContent;
     fs.writeFileSync('styles.css', fixed);
     console.log('Appended! Length:', deletedContent.length);
  }
} else {
  console.log('Not found in transcript.');
}
