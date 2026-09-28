import json

try:
    with open('C:/Users/hp/.gemini/antigravity-ide/brain/dc2cadbe-57a4-4652-b0e0-4764e9f9bba5/.system_generated/logs/transcript_full.jsonl', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for line in reversed(lines):
        if '@@ -6833,1111 +6833,6 @@' in line:
            obj = json.loads(line)
            # Find the tool response content
            content = obj.get('content', '')
            if not content:
                content = str(obj.get('tool_calls', ''))
                if not content:
                    content = obj.get('output', '')
            
            start_str = '@@ -6833,1111 +6833,6 @@'
            if start_str in content:
                start_idx = content.index(start_str)
                end_idx = content.find('[diff_block_end]', start_idx)
                if end_idx == -1: end_idx = len(content)
                
                diff = content[start_idx:end_idx]
                dlines = diff.split('\n')
                print("First 10 lines of diff block:")
                for dl in dlines[:10]:
                    print(repr(dl))
                break
except Exception as e:
    print("Error:", e)
