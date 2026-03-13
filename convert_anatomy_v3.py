"""
convert_anatomy_v3.py  â€” v4 (vertex-colour anatomy)
Each of the 934 OBJ files is decimated individually and assigned a unique
red/muscle colour so that muscle boundaries remain visible in Three.js.
Exports 19 named meshes with vertex colours to GLB.
"""

import os, colorsys, random
import numpy as np
import trimesh
import fast_simplification

OBJ_DIR  = r'c:\Users\LOHITH.G\Downloads\BodyParts3D_3.0_obj_99\BodyParts3D_3.0_obj_99'
OUT_FILE = r'd:\Medical-Scribe\ai-medical-scribe\public\models\human_anatomy.glb'

# â”€â”€ Region definitions (Z = anatomical height mm, X = lateral) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
REGIONS = [
    ('head',          1400, 9999,  -9999,  9999),
    ('neck',          1310, 1440,    -95,    95),
    ('shoulder_L',    1160, 1475,  -9999,   -65),
    ('shoulder_R',    1160, 1475,     65,  9999),
    ('upper_arm_L',    895, 1295,  -9999,  -100),
    ('upper_arm_R',    895, 1295,    100,  9999),
    ('lower_arm_L',    675, 1035,  -9999,  -112),
    ('lower_arm_R',    675, 1035,    112,  9999),
    ('hand_L',         430,  795,  -9999,   -78),
    ('hand_R',         430,  795,     78,  9999),
    ('chest',         1055, 1395,   -132,   132),
    ('abdomen',        875, 1135,   -132,   132),
    ('pelvis',         715,  945,   -135,   135),
    ('upper_leg_L',    495,  835,   -105,    -4),
    ('upper_leg_R',    495,  835,      4,   105),
    ('lower_leg_L',    145,  585,   -125,    -4),
    ('lower_leg_R',    145,  585,      4,   125),
    ('foot_L',         -20,  225,  -9999,    -4),
    ('foot_R',         -20,  225,      4,  9999),
]

# Max faces per individual source OBJ before merge
TARGET_PER_MESH = 600

# Hardcoded from scan (global Z min = feet)
Z_MIN = -14.0
SCALE = 1.0 / 200.0   # 1640 mm body â†’ ~8.2 Three.js units

# â”€â”€ Anatomy colour palette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def anatomy_color(filename):
    """
    Deterministic muscle-red colour for each anatomy file.
    Hue range 0.0-0.05 (red â†’ slightly orange-red).
    """
    seed = sum(ord(c) * (i + 1) for i, c in enumerate(filename))
    rng  = random.Random(seed)
    h = rng.uniform(0.00, 0.05)
    s = rng.uniform(0.55, 0.92)
    v = rng.uniform(0.38, 0.80)
    r, g, b = colorsys.hsv_to_rgb(h, s, v)
    return np.array([int(r*255), int(g*255), int(b*255), 255], dtype=np.uint8)

# â”€â”€ Region lookup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
def assign_region(cx, cz):
    for name, z0, z1, x0, x1 in REGIONS:
        if z0 <= cz <= z1 and x0 <= cx <= x1:
            return name
    return None

# â”€â”€ Coordinate transform: FMA (Z-up, mm) â†’ Three.js (Y-up, normalised) â”€â”€â”€
def to_yup(v):
    out = np.empty_like(v, dtype=np.float32)
    out[:, 0] =  v[:, 0] * SCALE
    out[:, 1] = (v[:, 2] - Z_MIN) * SCALE
    out[:, 2] = -v[:, 1] * SCALE
    return out

# â”€â”€ Load, decimate, colour each OBJ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
files = sorted(f for f in os.listdir(OBJ_DIR) if f.endswith('.obj'))
print(f'Processing {len(files)} OBJ files...')

region_verts  = {r[0]: [] for r in REGIONS}
region_faces  = {r[0]: [] for r in REGIONS}
region_colors = {r[0]: [] for r in REGIONS}
region_offset = {r[0]: 0  for r in REGIONS}
unassigned = 0

for i, f in enumerate(files):
    if i % 200 == 0:
        print(f'  {i}/{len(files)}...')
    try:
        m = trimesh.load(os.path.join(OBJ_DIR, f), force='mesh')
        if not hasattr(m, 'vertices') or len(m.vertices) < 8:
            continue

        cx  = float(m.centroid[0])
        cz  = float(m.centroid[2])
        reg = assign_region(cx, cz)
        if reg is None:
            unassigned += 1
            continue

        v = np.array(m.vertices, dtype=np.float32)
        t = np.array(m.faces,    dtype=np.int32)

        # Decimate
        cur = len(t)
        if cur > TARGET_PER_MESH:
            ratio = min(0.97, 1.0 - TARGET_PER_MESH / cur)
            try:
                v, t = fast_simplification.simplify(v, t, ratio)
            except:
                pass

        # Anatomy colour: uniform RGBA for every vertex in this mesh
        col = anatomy_color(f)
        colors = np.tile(col, (len(v), 1))   # (N, 4) uint8

        # Accumulate into region bucket (offset faces by current vertex count)
        t_off = t + region_offset[reg]
        region_verts[reg].append(v)
        region_faces[reg].append(t_off)
        region_colors[reg].append(colors)
        region_offset[reg] += len(v)

    except Exception as e:
        pass

print(f'\nUnassigned: {unassigned}')

# â”€â”€ Build scene â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
print('\nBuilding scene...')
scene = trimesh.Scene()

for rname, *_ in REGIONS:
    vs = region_verts[rname]
    if not vs:
        print(f'  WARN: {rname} empty')
        continue

    all_v  = to_yup(np.vstack(vs))
    all_f  = np.vstack(region_faces[rname])
    all_c  = np.vstack(region_colors[rname])

    mesh = trimesh.Trimesh(vertices=all_v, faces=all_f, process=False)
    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=all_c)

    scene.add_geometry(mesh, geom_name=rname, node_name=rname)
    print(f'  {rname:18s}: {len(all_f):7,} faces  {len(all_v):7,} verts')

print(f'\nExporting â†’ {OUT_FILE}')
scene.export(OUT_FILE, file_type='glb')
mb = os.path.getsize(OUT_FILE) / 1024**2
print(f'Done!  {mb:.2f} MB')

