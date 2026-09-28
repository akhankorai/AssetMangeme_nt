const fs = require('fs');

try {
  let transcript = fs.readFileSync('C:/Users/hp/.gemini/antigravity-ide/brain/dc2cadbe-57a4-4652-b0e0-4764e9f9bba5/.system_generated/logs/transcript_full.jsonl', 'utf8');
  let lines = transcript.split('\n');
  let deletedContent = '';
  let found = false;

  for (let line of lines) {
    if (line.includes('@@ -6833,1111 +6833,6 @@')) {
      let obj = JSON.parse(line);
      let text = obj.content || obj.output || (obj.tool_calls && JSON.stringify(obj.tool_calls));
      if (!text) continue;
      
      let startIdx = text.indexOf('@@ -6833,1111 +6833,6 @@');
      if (startIdx !== -1) {
        let endIdx = text.indexOf('[diff_block_end]', startIdx);
        let block = text.substring(startIdx, endIdx);
        let diffLines = block.split(/\\n|\n/);
        
        let restoredLines = [];
        for (let dl of diffLines) {
           if (dl.startsWith('-')) {
             restoredLines.push(dl.substring(1));
           } else if (dl.startsWith('\\"-')) {
             restoredLines.push(dl.substring(3));
           } else if (dl.startsWith('"-')) {
             restoredLines.push(dl.substring(2));
           }
        }
        
        deletedContent = restoredLines.join('\n');
        found = true;
      }
    }
  }

  if (found) {
    fs.writeFileSync('recover.txt', deletedContent);
    console.log('Saved to recover.txt. Length: ' + deletedContent.length);
  } else {
    console.log('Not found in transcript.');
  }
} catch (e) {
  console.log('Error: ' + e.message);
}
