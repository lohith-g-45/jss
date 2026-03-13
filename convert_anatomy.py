"""
Convert BodyParts3D STL → single named-mesh GLB for Three.js.
Uses centroid_y for vertical position AND centroid_x for arm/side detection.
"""
import os, json
import trimesh
import numpy as np

STL_DIR   = r"c:\Users\LOHITH.G\Downloads\BodyParts3D-stl-0.01\stl"
SCAN_JSON = r"d:\Medical-Scribe\anatomy_scan.json"
OUT_DIR   = r"d:\Medical-Scribe\ai-medical-scribe\public\models"
os.makedirs(OUT_DIR, exist_ok=True)

with open(SCAN_JSON) as f:
    scan = json.load(f)

# ─── Region assignment logic ─────────────────────────────────────────────────
# X > ~35: right arm / right side extremity
# X < ~-35: left arm / left side extremity
ARM_X_THRESHOLD = 35

def assign_region(cy, cx):
    ax = abs(cx)
    # ARM: large X offset = arm muscles hanging alongside body
    if ax > ARM_X_THRESHOLD:
        side = 'R' if cx > 0 else 'L'
        return f'arm_{side}'

    # Vertical body regions (for centrally-located meshes)
    if   cy >= 30:               return 'shoulder'
    elif cy >= 10:               return 'chest'
    elif cy >= -8:               return 'abdomen'
    elif cy >= -22:              return 'pelvis'
    elif cy >= -35:              return 'thigh'
    elif cy >= -50:              return 'knee'
    else:                        return 'foot'

# Group
buckets = {}
for item in scan['files']:
    key = assign_region(item['centroid_y'], item['centroid_x'])
    buckets.setdefault(key, []).append(item)

print("Region file counts:")
for k in sorted(buckets.keys()):
    total_kb = sum(i['size_kb'] for i in buckets[k])
    print(f"  {k:15s}: {len(buckets[k]):3d} files, {total_kb:6d} KB total")

# ─── Mesh colors (flesh/muscle tones) ───────────────────────────────────────
COLORS = {
    'shoulder': [170, 78, 78, 255],
    'chest':    [165, 72, 72, 255],
    'abdomen':  [160, 80, 80, 255],
    'pelvis':   [155, 82, 82, 255],
    'thigh':    [150, 75, 75, 255],
    'knee':     [148, 78, 78, 255],
    'foot':     [145, 78, 78, 255],
    'arm_L':    [168, 76, 76, 255],
    'arm_R':    [168, 76, 76, 255],
    'head':     [205, 165, 130, 255],
    'neck':     [195, 140, 110, 255],
}
TARGET_FACES = 3500

def build_mesh(region_key, file_list):
    files_sorted = sorted(file_list, key=lambda x: -x['size_kb'])
    meshes = []
    for fdata in files_sorted[:15]:  # max 15 largest files per region
        fp = os.path.join(STL_DIR, fdata['file'])
        try:
            m = trimesh.load(fp, force='mesh')
            if hasattr(m, 'vertices') and len(m.vertices) > 20:
                meshes.append(m)
        except Exception:
            pass
    if not meshes:
        return None

    combined = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    orig = len(combined.faces)

    # Decimate
    if orig > TARGET_FACES:
        try:
            combined = combined.simplify_quadric_decimation(TARGET_FACES)
        except Exception as e:
            print(f"    decimate warning: {e}")

    # Assign colour
    base = region_key.split('_')[0] if '_' in region_key else region_key
    color = COLORS.get(base, COLORS.get(region_key, [175, 80, 80, 255]))
    combined.visual = trimesh.visual.ColorVisuals(
        mesh=combined,
        face_colors=np.tile(color, (len(combined.faces), 1))
    )
    print(f"  [{region_key}] {orig} → {len(combined.faces)} faces")
    return combined

# ─── Build scene ─────────────────────────────────────────────────────────────
scene = trimesh.Scene()

for rk in sorted(buckets.keys()):
    print(f"\nBuilding {rk}...")
    m = build_mesh(rk, buckets[rk])
    if m:
        scene.add_geometry(m, geom_name=rk)

# ─── Generated head + neck ───────────────────────────────────────────────────
head = trimesh.creation.icosphere(subdivisions=4, radius=10)
head.apply_translation([0, 88, 0])
color_h = COLORS['head']
head.visual = trimesh.visual.ColorVisuals(
    mesh=head, face_colors=np.tile(color_h, (len(head.faces), 1))
)
scene.add_geometry(head, geom_name='head')

neck = trimesh.creation.cylinder(radius=5, height=14, sections=20)
neck.apply_translation([0, 72, 0])
color_n = COLORS['neck']
neck.visual = trimesh.visual.ColorVisuals(
    mesh=neck, face_colors=np.tile(color_n, (len(neck.faces), 1))
)
scene.add_geometry(neck, geom_name='neck')

# ─── Export ───────────────────────────────────────────────────────────────────
out_path = os.path.join(OUT_DIR, 'human_anatomy.glb')
print(f"\nExporting → {out_path}")
scene.export(out_path)
size_mb = os.path.getsize(out_path) / 1e6
print(f"Done!  {size_mb:.2f} MB")
print("\nFinal mesh list:")
total_faces = 0
for name in sorted(scene.geometry.keys()):
    g = scene.geometry[name]
    total_faces += len(g.faces)
    print(f"  {name:15s}: {len(g.faces):6d} faces")
print(f"  {'TOTAL':15s}: {total_faces:6d} faces")
