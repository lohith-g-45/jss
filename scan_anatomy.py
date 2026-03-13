"""
Diagnostic: Load FMA7088 alone to verify it's the full body skin,
then print its actual vertex Y/X/Z range for calibration.
"""
import trimesh, numpy as np, os

STL_DIR = r"c:\Users\LOHITH.G\Downloads\BodyParts3D-stl-0.01\stl"

m = trimesh.load(os.path.join(STL_DIR, 'FMA7088.stl'), force='mesh')
v = np.array(m.vertices)
print(f"Vertices: {len(v):,}   Faces: {len(m.faces):,}")
print(f"X: {v[:,0].min():.1f}  to  {v[:,0].max():.1f}")
print(f"Y: {v[:,1].min():.1f}  to  {v[:,1].max():.1f}")
print(f"Z: {v[:,2].min():.1f}  to  {v[:,2].max():.1f}")
print(f"Centroid: X={m.centroid[0]:.1f} Y={m.centroid[1]:.1f} Z={m.centroid[2]:.1f}")

y_min, y_max = v[:,1].min(), v[:,1].max()
span = y_max - y_min
print(f"\nY distribution (body height span = {span:.0f} units):")
for pct in range(0, 100, 10):
    lo = y_min + pct/100*span
    hi = y_min + (pct+10)/100*span
    count = np.sum((v[:,1] >= lo) & (v[:,1] < hi))
    bar = '#' * int(count / len(v) * 200)
    print(f"  {lo:6.1f} to {hi:6.1f}  {count:5d}v  {bar}")


STL_DIR = r"c:\Users\LOHITH.G\Downloads\BodyParts3D-stl-0.01\stl"

results = []
files = sorted([f for f in os.listdir(STL_DIR) if f.endswith('.stl')])
print(f"Found {len(files)} STL files. Scanning...")

y_min_global = float('inf')
y_max_global = float('-inf')

for fname in files:
    fpath = os.path.join(STL_DIR, fname)
    try:
        mesh = trimesh.load(fpath, force='mesh')
        if not hasattr(mesh, 'vertices') or len(mesh.vertices) == 0:
            continue
        centroid = mesh.centroid
        bounds = mesh.bounds  # [[xmin,ymin,zmin],[xmax,ymax,zmax]]
        y_min_global = min(y_min_global, bounds[0][1])
        y_max_global = max(y_max_global, bounds[1][1])
        results.append({
            'file': fname,
            'centroid_y': float(centroid[1]),
            'centroid_x': float(centroid[0]),
            'y_min': float(bounds[0][1]),
            'y_max': float(bounds[1][1]),
            'size_kb': os.path.getsize(fpath) // 1024,
            'vertices': len(mesh.vertices),
        })
    except Exception as e:
        print(f"  SKIP {fname}: {e}")

# Sort by centroid Y (top = head, bottom = feet)
results.sort(key=lambda x: x['centroid_y'], reverse=True)
print(f"\nY range across all meshes: {y_min_global:.1f} to {y_max_global:.1f}")
total_height = y_max_global - y_min_global

print("\nFile | centroid_Y | pct_from_top | size_kb | vertices")
print("-" * 70)
for r in results:
    pct = (y_max_global - r['centroid_y']) / total_height * 100
    print(f"{r['file']:25s} | {r['centroid_y']:8.1f} | top {pct:5.1f}% | {r['size_kb']:6d}KB | {r['vertices']:8d}v")

# Save to JSON
with open(r"d:\Medical-Scribe\anatomy_scan.json", "w") as f:
    json.dump({'y_min': y_min_global, 'y_max': y_max_global, 'files': results}, f, indent=2)
print("\nSaved to d:\\Medical-Scribe\\anatomy_scan.json")
