"""
Re-generate human_anatomy.glb with proper fast_simplification decimation.
fast_simplification.simplify() takes target_reduction (0.0-1.0, fraction to REMOVE).
"""
import os, json
import trimesh
import numpy as np

STL_DIR   = r"c:\Users\LOHITH.G\Downloads\BodyParts3D-stl-0.01\stl"
SCAN_JSON = r"d:\Medical-Scribe\anatomy_scan.json"
OUT_DIR   = r"d:\Medical-Scribe\ai-medical-scribe\public\models"

with open(SCAN_JSON) as f:
    scan = json.load(f)

ARM_X_THRESHOLD = 35

def assign_region(cy, cx):
    if abs(cx) > ARM_X_THRESHOLD:
        return 'arm_R' if cx > 0 else 'arm_L'
    if   cy >= 30:  return 'shoulder'
    elif cy >= 10:  return 'chest'
    elif cy >= -8:  return 'abdomen'
    elif cy >= -22: return 'pelvis'
    elif cy >= -35: return 'thigh'
    elif cy >= -50: return 'knee'
    else:           return 'foot'

buckets = {}
for item in scan['files']:
    key = assign_region(item['centroid_y'], item['centroid_x'])
    buckets.setdefault(key, []).append(item)

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

# Target faces AFTER decimation per region
TARGET = {
    'shoulder': 2000,
    'chest':    3000,
    'abdomen':  3000,
    'pelvis':   3000,
    'thigh':    3000,
    'knee':     2000,
    'foot':     1500,
    'arm_L':    2000,
    'arm_R':    2000,
}

def decimate(mesh, target_faces):
    """Decimate to target face count using fast_simplification."""
    orig = len(mesh.faces)
    if orig <= target_faces:
        return mesh
    reduction = 1.0 - (target_faces / orig)
    reduction = min(0.97, max(0.01, reduction))
    try:
        import fast_simplification
        pts = np.array(mesh.vertices, dtype=np.float64)
        tris = np.array(mesh.faces, dtype=np.int32)  # shape (N, 3) — 2D!
        pts_out, faces_out = fast_simplification.simplify(pts, tris, target_reduction=reduction)
        result = trimesh.Trimesh(vertices=pts_out, faces=faces_out, process=False)
        print(f"    decimated {orig} → {len(result.faces)}", end='')
        return result
    except Exception as e:
        print(f"    decimate failed ({e}), keeping {orig}", end='')
        return mesh

scene = trimesh.Scene()

for rk in sorted(buckets.keys()):
    file_list = sorted(buckets[rk], key=lambda x: -x['size_kb'])[:12]
    meshes = []
    for fdata in file_list:
        fp = os.path.join(STL_DIR, fdata['file'])
        try:
            m = trimesh.load(fp, force='mesh')
            if hasattr(m, 'vertices') and len(m.vertices) > 20:
                meshes.append(m)
        except Exception:
            pass
    if not meshes:
        continue

    combined = trimesh.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    print(f"[{rk:12s}] {len(combined.faces):7d} faces →", end=' ')

    target = TARGET.get(rk, 2000)
    combined = decimate(combined, target)

    base = rk.split('_')[0]
    color = COLORS.get(rk, COLORS.get(base, [175, 80, 80, 255]))
    combined.visual = trimesh.visual.ColorVisuals(
        mesh=combined,
        face_colors=np.tile(color, (len(combined.faces), 1))
    )
    print(f" → {len(combined.faces)} final")
    scene.add_geometry(combined, geom_name=rk)

# Synthetic head + neck
head = trimesh.creation.icosphere(subdivisions=3, radius=10)
head.apply_translation([0, 88, 0])
head.visual = trimesh.visual.ColorVisuals(mesh=head, face_colors=np.tile(COLORS['head'], (len(head.faces), 1)))
scene.add_geometry(head, geom_name='head')

neck = trimesh.creation.cylinder(radius=5, height=14, sections=16)
neck.apply_translation([0, 72, 0])
neck.visual = trimesh.visual.ColorVisuals(mesh=neck, face_colors=np.tile(COLORS['neck'], (len(neck.faces), 1)))
scene.add_geometry(neck, geom_name='neck')

out = os.path.join(OUT_DIR, 'human_anatomy.glb')
print(f"\nExporting → {out}")
scene.export(out)
mb = os.path.getsize(out) / 1e6
total = sum(len(g.faces) for g in scene.geometry.values())
print(f"Done!  {mb:.2f} MB,  {total:,} total faces")
