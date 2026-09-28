import json
import re

with open('recover.txt', 'r', encoding='utf-16le') as f:
    text = f.read()

# Extract JSON from the line
# The line format might be Path:Line:JSON
try:
    idx = text.index('{')
    json_text = text[idx:]
    data = json.loads(json_text)
    content = data.get('content', '')
    
    start_str = '@@ -6833,1111 +6833,6 @@'
    if start_str in content:
        start_idx = content.index(start_str)
        end_idx = content.find('[diff_block_end]', start_idx)
        if end_idx == -1: end_idx = len(content)
        
        diff = content[start_idx:end_idx]
        lines = diff.split('\n')
        restored = []
        for line in lines:
            if line.startswith('-'):
                restored.append(line[1:])
        
        final_css = '\n'.join(restored)
        with open('styles.css', 'r', encoding='utf-8') as sf:
            styles = sf.read()
            
        fixed = styles.replace('/* Fix Input Fields Visibility and Focus States */', '/* Fix Input Fields Visibility and Focus States */\n' + final_css)
        with open('styles.css', 'w', encoding='utf-8') as sf:
            sf.write(fixed)
            
        print(f"Recovered {len(final_css)} chars!")
    else:
        print("Diff block not found in content")
except Exception as e:
    print("Error:", e)
