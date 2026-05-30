import json
import sys

path = r'E:\codex\front-end\assets\json\Notification.json'

try:
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    assets = data.get('assets', [])
    comp_0 = next((a for a in assets if a.get('id') == 'comp_0'), None)
    if comp_0:
        for l in comp_0.get('layers', []):
            if l.get('ty') == 5:
                l['nm'] = 'DYNAMIC_TEXT'
                l['t']['d']['k'][0]['s']['t'] = ' '

    if 'chars' not in data:
        data['chars'] = []

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    print("Fixed JSON cleanly")

except Exception as e:
    print(f"Error: {e}")
