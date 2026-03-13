"""
convert_anatomy_v4.py — High-detail anatomy with gradient vertex shading
- Classifies each mesh as VESSEL (elongated) or MUSCLE/TISSUE (compact)
- Vessels: arteries = bright red, veins = blue-purple (gradient length-wise)
- Muscles: gradient per vertex (lighter exposed surface, darker valley)
- 19 named GLB regions with preserved individual anatomy boundaries
"""

import os, colorsys, random
import numpy as np
import trimesh
import fast_simplification

OBJ_DIR  = r'c:\Users\LOHITH.G\Downloads\BodyParts3D_3.0_obj_99\BodyParts3D_3.0_obj_99'
OUT_FILE = r'd:\Medical-Scribe\ai-medical-scribe\public\models\human_anatomy.glb'

# ── Region definitions ─────────────────────────────────────────────────────
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

# Face budgets per region (larger for most visible parts)
FACE_BUDGET = {
    'head': 1200, 'neck': 900, 'chest': 1200, 'abdomen': 900,
    'shoulder_L': 900, 'shoulder_R': 900,
    'upper_arm_L': 800, 'upper_arm_R': 800,
    'lower_arm_L': 700, 'lower_arm_R': 700,
    'hand_L': 500, 'hand_R': 500,
    'pelvis': 800,
    'upper_leg_L': 1000, 'upper_leg_R': 1000,
    'lower_leg_L': 800, 'lower_leg_R': 800,
    'foot_L': 500, 'foot_R': 500,
}

Z_MIN = -14.0
SCALE = 1.0 / 200.0  # → 8.2 Three.js units tall

# ── Coordinate transform: FMA Z-up mm → Three.js Y-up ─────────────────────
def to_yup(v):
    out = np.empty_like(v, dtype=np.float32)
    out[:, 0] =  v[:, 0] * SCALE
    out[:, 1] = (v[:, 2] - Z_MIN) * SCALE
    out[:, 2] = -v[:, 1] * SCALE
    return out

# ── Region lookup ──────────────────────────────────────────────────────────
def assign_region(cx, cz):
    for name, z0, z1, x0, x1 in REGIONS:
        if z0 <= cz <= z1 and x0 <= cx <= x1:
            return name
    return None

# ── Mesh type classifier ───────────────────────────────────────────────────
def classify(filename, mesh):
    """
    Returns (h, s, v_dark, v_light, is_vessel)
    Elongated thin meshes → blood vessel/nerve
    Compact meshes → muscle/tissue with gradient shading
    """
    bb = mesh.bounding_box.extents
    dims = sorted(bb)
    elongation = dims[2] / max(dims[0], 0.5)
    cross_area  = dims[0] * dims[1]   # cross-section area (mm²)

    seed = sum(ord(c) * (i + 1) for i, c in enumerate(filename))
    rng  = random.Random(seed)

    # ── Blood vessels / nerves ─────────────────────────────────────────────
    if elongation > 6 and cross_area < 600:
        if seed % 3 == 0:
            # Artery: bright warm red
            h      = rng.uniform(0.97, 1.0)
            s      = rng.uniform(0.78, 0.95)
            v_dark = rng.uniform(0.45, 0.65)
            v_light= v_dark + 0.25
        else:
            # Vein / lymphatic: blue-purple
            h      = rng.uniform(0.62, 0.73)
            s      = rng.uniform(0.48, 0.78)
            v_dark = rng.uniform(0.22, 0.48)
            v_light= v_dark + 0.18
        return h, s, v_dark, v_light, True   # uniform for vessels (already thin)

    # ── Muscle / tissue / organ ────────────────────────────────────────────
    # Head-area structures: slightly pinkish flesh tone
    cx, cy, cz = mesh.centroid
    if cz > 1350:
        h      = rng.uniform(0.0, 0.06)
        s      = rng.uniform(0.30, 0.68)
        v_dark = rng.uniform(0.42, 0.58)
        v_light= v_dark + rng.uniform(0.22, 0.35)
    else:
        # Core muscles: deep red, varying
        h      = rng.uniform(0.0, 0.045)
        s      = rng.uniform(0.55, 0.92)
        v_dark = rng.uniform(0.28, 0.52)
        v_light= v_dark + rng.uniform(0.28, 0.45)

    return h, s, v_dark, v_light, False

# ── Fast vectorised vertex gradient coloring ──────────────────────────────
def gradient_vertex_colors(vertices, faces, h, s, v_dark, v_light):
    """
    Computes per-vertex colour via surface normal→centroid dot-product
    (exposure: 1 = peak facing outward, 0 = valley facing inward).
    Linear interpolation dark→light between valley and peak.
    """
    n = len(vertices)
    if n < 6:
        r, g, b = colorsys.hsv_to_rgb(h, s, (v_dark + v_light) * 0.5)
        return np.tile(np.array([int(r*255), int(g*255), int(b*255), 255], dtype=np.uint8), (n, 1))

    try:
        tmp = trimesh.Trimesh(vertices=vertices.copy(), faces=faces.copy(), process=False)
        centroid = tmp.centroid
        dirs = vertices - centroid
        lens = np.linalg.norm(dirs, axis=1, keepdims=True)
        np.maximum(lens, 1e-8, out=lens)
        dirs_n = dirs / lens

        vnorms = tmp.vertex_normals  # (N, 3)
        exposure = np.einsum('ij,ij->i', dirs_n, vnorms)

        e_min, e_max = exposure.min(), exposure.max()
        if e_max > e_min:
            t = (exposure - e_min) / (e_max - e_min)
        else:
            t = np.full(n, 0.5)

    except Exception:
        t = np.full(n, 0.5)

    # Precompute dark and light RGB once
    rd, gd, bd = colorsys.hsv_to_rgb(h, s,            np.clip(v_dark,  0, 1))
    rl, gl, bl = colorsys.hsv_to_rgb(h, s * 0.80, np.clip(v_light, 0, 1))
    dark  = np.array([rd, gd, bd], dtype=np.float32)
    light = np.array([rl, gl, bl], dtype=np.float32)

    t_col = t.reshape(-1, 1).astype(np.float32)
    rgb = dark + t_col * (light - dark)          # (N, 3) float 0-1
    np.clip(rgb, 0, 1, out=rgb)

    rgba = np.ones((n, 4), dtype=np.uint8) * 255
    rgba[:, :3] = (rgb * 255).astype(np.uint8)
    return rgba

# ── Flat RGBA for vessels ──────────────────────────────────────────────────
def flat_vertex_colors(n, h, s, v):
    r, g, b = colorsys.hsv_to_rgb(h, s, np.clip(v, 0, 1))
    return np.tile(np.array([int(r*255), int(g*255), int(b*255), 255], dtype=np.uint8), (n, 1))

# ── Main loop ──────────────────────────────────────────────────────────────
files = sorted(f for f in os.listdir(OBJ_DIR) if f.endswith('.obj'))
print(f'Processing {len(files)} OBJ files...')

# Per-region accumulators
region_verts  = {r[0]: [] for r in REGIONS}
region_faces  = {r[0]: [] for r in REGIONS}
region_colors = {r[0]: [] for r in REGIONS}
region_offset = {r[0]: 0  for r in REGIONS}
unassigned = 0

stat = {'muscle': 0, 'artery': 0, 'vein': 0, 'skip': 0}

for i, f in enumerate(files):
    if i % 200 == 0:
        print(f'  {i}/{len(files)} ...')
    try:
        m = trimesh.load(os.path.join(OBJ_DIR, f), force='mesh')
        if not hasattr(m, 'vertices') or len(m.vertices) < 6:
            stat['skip'] += 1
            continue

        cx = float(m.centroid[0])
        cz = float(m.centroid[2])
        reg = assign_region(cx, cz)
        if reg is None:
            unassigned += 1
            continue

        v = np.array(m.vertices, dtype=np.float32)
        t = np.array(m.faces,    dtype=np.int32)

        # Decimate to region budget
        budget = FACE_BUDGET.get(reg, 700)
        cur = len(t)
        if cur > budget:
            ratio = min(0.97, 1.0 - budget / cur)
            try:
                v, t = fast_simplification.simplify(v, t, ratio)
            except Exception:
                pass

        h_c, s_c, v_dark, v_light, is_vessel = classify(f, trimesh.Trimesh(vertices=v, faces=t, process=False))

        if is_vessel:
            mid_v = (v_dark + v_light) * 0.5
            colors = flat_vertex_colors(len(v), h_c, s_c, mid_v)
            stat['artery' if h_c > 0.9 else 'vein'] += 1
        else:
            colors = gradient_vertex_colors(v, t, h_c, s_c, v_dark, v_light)
            stat['muscle'] += 1

        t_off = t + region_offset[reg]
        region_verts[reg].append(v)
        region_faces[reg].append(t_off)
        region_colors[reg].append(colors)
        region_offset[reg] += len(v)

    except Exception:
        stat['skip'] += 1

print(f'\nClassification: muscles={stat["muscle"]}  arteries={stat["artery"]}  veins={stat["vein"]}  skip={stat["skip"]}  unassigned={unassigned}')

# ── Build & export scene ───────────────────────────────────────────────────
print('\nBuilding scene...')
scene = trimesh.Scene()

total_faces = 0
for rname, *_ in REGIONS:
    vs = region_verts[rname]
    if not vs:
        print(f'  WARN: {rname} empty')
        continue

    all_v = to_yup(np.vstack(vs))
    all_f = np.vstack(region_faces[rname])
    all_c = np.vstack(region_colors[rname])
    total_faces += len(all_f)

    mesh = trimesh.Trimesh(vertices=all_v, faces=all_f, process=False)
    mesh.visual = trimesh.visual.ColorVisuals(mesh=mesh, vertex_colors=all_c)
    scene.add_geometry(mesh, geom_name=rname, node_name=rname)
    print(f'  {rname:18s}: {len(all_f):7,} faces  {len(all_v):7,} verts')

print(f'\nTotal faces: {total_faces:,}')
print(f'Exporting → {OUT_FILE}')
scene.export(OUT_FILE, file_type='glb')
mb = os.path.getsize(OUT_FILE) / 1024**2
print(f'Done! {mb:.2f} MB')
