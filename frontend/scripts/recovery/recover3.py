import json

try:
    with open('C:/Users/hp/.gemini/antigravity-ide/brain/dc2cadbe-57a4-4652-b0e0-4764e9f9bba5/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in lines:
        if '@@ -6833,1111 +6833,6 @@' in line and '[diff_block_start]' in line and 'multi_replace_file_content tool to' in line:
            obj = json.loads(line)
            content = obj.get('content', '')
            if not content: continue
            
            start_str = '@@ -6833,1111 +6833,6 @@'
            start_idx = content.index(start_str)
            end_idx = content.find('[diff_block_end]', start_idx)
            if end_idx == -1: end_idx = len(content)
            
            diff = content[start_idx:end_idx]
            dlines = diff.split('\n')
            restored = []
            for dl in dlines:
                if dl.startswith('-'):
                    restored.append(dl[1:])
            
            final_css = '\n'.join(restored).replace('\r', '')
            
            with open('styles.css', 'r', encoding='utf-8') as sf:
                styles = sf.read()
                
            if 'Fix Input Fields Visibility' in styles:
                fixed = styles.replace('/* Fix Input Fields Visibility and Focus States */', '/* Fix Input Fields Visibility and Focus States */\n' + final_css)
            else:
                fixed = styles + '\n/* Fix Input Fields Visibility and Focus States */\n' + final_css
                
            with open('styles.css', 'w', encoding='utf-8') as sf:
                sf.write(fixed)
                
            print(f"Recovered {len(final_css)} chars!")
            break
except Exception as e:
    print("Error:", e)
