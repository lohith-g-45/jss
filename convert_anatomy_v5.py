"""
convert_anatomy_v5.py
Each OBJ → individual decimated mesh with its own PBR material (baseColorFactor).
Trimesh's PBR material export is 100% reliable in GLTF — unlike vertex colors.
Node names: {region}_{index}  →  Three.js strips suffix to get region.
"""

import os, colorsys, random
import numpy as np
import trimesh
import fast_simplification

OBJ_DIR  = r'c:\Users\LOHITH.G\Downloads\BodyParts3D_3.0_obj_99\BodyParts3D_3.0_obj_99'
OUT_FILE = r'd:\Medical-Scribe\ai-medical-scribe\public\models\human_anatomy.glb'

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

# Per-OBJ face budget (higher = more detail)
FACE_BUDGET = 800

# External genitalia and perineal structures — excluded from the model
SKIP_FILES = {
    # Penile / urethral structures
    'FMA19617nsn.obj', 'FMA19618.obj', 'FMA19667.obj', 'FMA18247.obj',
    # Scrotal / testicular / spermatic cord
    'FMA7212.obj', 'FMA7211.obj', 'FMA18256.obj', 'FMA18257.obj',
    'FMA43883.obj', 'FMA43884.obj',
    'FMA22452.obj', 'FMA22454.obj',
    'FMA43886.obj', 'FMA43887.obj',
    'FMA22451.obj', 'FMA22450.obj',
    'FMA22346.obj', 'FMA22347.obj',
    # Perineal / bulbospongiosus / ischiocavernosus
    'FMA70754.obj', 'FMA21930.obj', 'FMA9600.obj',
    'FMA19387.obj', 'FMA19388.obj',
    'FMA45854.obj', 'FMA45855.obj', 'FMA45856.obj',
    'FMA45857.obj', 'FMA45858.obj', 'FMA45859.obj',
    'FMA46442.obj', 'FMA46443.obj', 'FMA46444.obj',
    'FMA14544.obj', 'FMA15900.obj',
    'FMA18885.obj', 'FMA18886.obj',
    'FMA18806.obj', 'FMA18807.obj',
    'FMA18809.obj', 'FMA18810.obj',
    'FMA18887.obj', 'FMA18888.obj',
    'FMA21964.obj', 'FMA21965.obj',
    'FMA7208.obj',  'FMA16202.obj',
    'FMA22326.obj', 'FMA22327.obj',
    'FMA14542.obj', 'FMA16037.obj',
}

Z_MIN = -14.0
SCALE = 1.0 / 200.0

def to_yup(v):
    out = np.empty_like(v, dtype=np.float32)
    out[:, 0] =  v[:, 0] * SCALE
    out[:, 1] = (v[:, 2] - Z_MIN) * SCALE
    out[:, 2] = -v[:, 1] * SCALE
    return out

def assign_region(cx, cz):
    for name, z0, z1, x0, x1 in REGIONS:
        if z0 <= cz <= z1 and x0 <= cx <= x1:
            return name
    return None

def classify_color(filename, cx, cy, cz, bb):
    """Return (r, g, b, roughness, metalness) for this anatomy structure."""
    dims = sorted(bb)
    elongation = dims[2] / max(dims[0], 0.5)
    cross_area  = dims[0] * dims[1]

    seed = sum(ord(c) * (i + 1) for i, c in enumerate(filename))
    rng  = random.Random(seed)

    # ── Vessels / nerves: elongated and thin ──────────────────────────────
    if elongation > 6 and cross_area < 600:
        if seed % 3 == 0:
            # Artery
            h = rng.uniform(0.95, 1.0)
            s = rng.uniform(0.75, 0.95)
            v = rng.uniform(0.50, 0.80)
        else:
            # Vein / lymphatics
            h = rng.uniform(0.60, 0.72)
            s = rng.uniform(0.45, 0.75)
            v = rng.uniform(0.25, 0.52)
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        return r, g, b, 0.55, 0.08

    # ── Head / face: flesh + pinkish ──────────────────────────────────────
    if cz > 1350:
        h = rng.uniform(0.0, 0.07)
        s = rng.uniform(0.25, 0.60)
        v = rng.uniform(0.52, 0.82)
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        return r, g, b, 0.70, 0.03

    # ── Muscles and deep tissue ────────────────────────────────────────────
    # Superficiality — positive cy (anterior) = superficial = lighter/brighter
    # Range cy ~ -239 to +46. Normalize 0=deep, 1=superficial
    superficial = np.clip((cy + 100) / 180, 0, 1)

    h      = rng.uniform(0.0, 0.048)          # red to red-orange
    s      = rng.uniform(0.55, 0.90)
    v_base = rng.uniform(0.30, 0.55)
    v      = v_base + superficial * 0.28      # superficial muscles brighter
    r, g, b = colorsys.hsv_to_rgb(h, s, min(v, 0.92))
    return r, g, b, 0.62, 0.04

# ── Main ──────────────────────────────────────────────────────────────────
files = sorted(f for f in os.listdir(OBJ_DIR) if f.endswith('.obj'))
print(f'Processing {len(files)} OBJ files...')

scene      = trimesh.Scene()
region_idx = {r[0]: 0 for r in REGIONS}
stats      = {'muscle': 0, 'vessel': 0, 'skip': 0, 'unassigned': 0}

for i, f in enumerate(files):
    if i % 200 == 0:
        print(f'  {i}/{len(files)} ...')
    if f in SKIP_FILES:
        stats['skip'] += 1
        continue
    try:
        m = trimesh.load(os.path.join(OBJ_DIR, f), force='mesh')
        if not hasattr(m, 'vertices') or len(m.vertices) < 6:
            stats['skip'] += 1
            continue

        cx, cy, cz = float(m.centroid[0]), float(m.centroid[1]), float(m.centroid[2])
        # Skip external genitalia zone: lower pelvis, anterior, not a large structural mesh
        bb_raw = m.bounding_box.extents
        bb_vol = float(bb_raw[0] * bb_raw[1] * bb_raw[2])
        if 550 < cz < 920 and abs(cx) < 90 and cy < -25 and bb_vol < 5_000_000:
            stats['skip'] += 1
            continue
        reg = assign_region(cx, cz)
        if reg is None:
            stats['unassigned'] += 1
            continue

        v = np.array(m.vertices, dtype=np.float32)
        t = np.array(m.faces,    dtype=np.int32)

        cur = len(t)
        if cur > FACE_BUDGET:
            ratio = min(0.97, 1.0 - FACE_BUDGET / cur)
            try:
                v, t = fast_simplification.simplify(v, t, ratio)
            except Exception:
                pass

        bb = m.bounding_box.extents
        r, g, b, rough, metal = classify_color(f, cx, cy, cz, bb)

        out_v = to_yup(v)
        out_mesh = trimesh.Trimesh(vertices=out_v, faces=t, process=False)
        out_mesh.visual = trimesh.visual.TextureVisuals(
            material=trimesh.visual.material.PBRMaterial(
                baseColorFactor=np.array([r, g, b, 1.0], dtype=np.float64),
                roughnessFactor=rough,
                metallicFactor=metal,
            )
        )

        dims = sorted(bb)
        elongation = dims[2] / max(dims[0], 0.5)
        cross_area  = dims[0] * dims[1]
        is_vessel = elongation > 6 and cross_area < 600

        node_name = f'{reg}_{region_idx[reg]:04d}'
        region_idx[reg] += 1
        scene.add_geometry(out_mesh, geom_name=node_name, node_name=node_name)
        stats['vessel' if is_vessel else 'muscle'] += 1

    except Exception as e:
        stats['skip'] += 1

print(f"\nMeshes: muscles={stats['muscle']}  vessels={stats['vessel']}  "
      f"skipped={stats['skip']}  unassigned={stats['unassigned']}")
print(f'Total nodes: {sum(region_idx.values())}')
print(f'\nExporting → {OUT_FILE}')
scene.export(OUT_FILE, file_type='glb')
mb = os.path.getsize(OUT_FILE) / 1024**2
print(f'Done! {mb:.2f} MB')
