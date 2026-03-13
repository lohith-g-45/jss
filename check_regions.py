import json
with open(r'd:\Medical-Scribe\anatomy_scan.json') as f:
    scan = json.load(f)

print('Lower body files (Y < -15):')
for item in sorted(scan['files'], key=lambda x: x['centroid_y']):
    if item['centroid_y'] < -15:
        name = item['file']
        cy = item['centroid_y']
        cx = item['centroid_x']
        kb = item['size_kb']
        print(f'  {name:25s} Y={cy:7.1f}  X={cx:7.1f}  {kb}KB')
