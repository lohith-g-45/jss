import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { HEALED_COLOR } from '../utils/medicalBodyParser';

// ── Constants ──────────────────────────────────────────────────────────────
const BONE_COLOR   = '#e8dcc8';   // natural bone/ivory
const ORGAN_COLOR  = '#c0736a';   // visceral pinkish-red
const SKIN_EMISSIVE = '#000000';

const SEVERITY_COLORS = {
  1: '#eab308',
  2: '#f97316',
  3: '#ef4444',
  4: '#9333ea',
};

// ── STL model catalogue ────────────────────────────────────────────────────
// Each entry: file (in public/models/), meshId (matches medicalBodyParser IDs),
// position [x,y,z] in scene units, rotation [rx,ry,rz] rad,
// scale (uniform float), baseColor, type ('bone'|'organ'|'skin')
const STL_MODELS = [
  // ── Skin / exterior ──
  { file: 'body_skin.stl',      meshId: 'skin',           position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#d4956a', type: 'skin'  },

  // ── Skull / Head ──
  { file: 'skull.stl',          meshId: 'head',           position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Spine / Back ──
  { file: 'spine_thoracic.stl', meshId: 'torso',          position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'vertebra_lumbar.stl',meshId: 'abdomen',        position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Pelvis / Hip ──
  { file: 'pelvis_left.stl',    meshId: 'left_hip',       position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'pelvis_right.stl',   meshId: 'right_hip',      position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'femur_head_left.stl',meshId: 'pelvis',         position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Thigh (femur) ──
  { file: 'femur_left.stl',     meshId: 'left_thigh',     position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'femur_right.stl',    meshId: 'right_thigh',    position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Shin (tibia) ──
  { file: 'tibia_left.stl',     meshId: 'left_shin',      position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'tibia_right.stl',    meshId: 'right_shin',     position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Shoulder blades (scapula) ──
  { file: 'scapula_left.stl',   meshId: 'left_shoulder',  position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'scapula_right.stl',  meshId: 'right_shoulder', position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Upper arm (humerus) ──
  { file: 'humerus_left.stl',   meshId: 'left_upper_arm', position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'humerus_right.stl',  meshId: 'right_upper_arm',position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Forearm (radius) ──
  { file: 'radius_left.stl',    meshId: 'left_lower_arm', position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },
  { file: 'radius_right.stl',   meshId: 'right_lower_arm',position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: BONE_COLOR, type: 'bone'  },

  // ── Organs ──
  { file: 'heart.stl',          meshId: 'chest',          position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#c0302a', type: 'organ' },
  { file: 'lung_left.stl',      meshId: 'left_lung',      position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#c06060', type: 'organ' },
  { file: 'lung_right.stl',     meshId: 'right_lung',     position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#c06060', type: 'organ' },
  { file: 'liver.stl',          meshId: 'abdomen_organ',  position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#8b3a3a', type: 'organ' },
  { file: 'brain.stl',          meshId: 'brain',          position: [0,    0,    0],   rotation: [-Math.PI/2, 0, 0], scale: 0.000095, baseColor: '#d4a0a0', type: 'organ' },
];

// ── Mesh-ID → approximate world-space centre for glow spheres ─────────────
// These are calibrated for the BodyParts3D coordinate system after applying
// the uniform scale=0.000095 and -90° X rotation (Z-up → Y-up).
// Units: scene units (roughly metres scale).
const GLOW_CENTRES = {
  head:           [0,     1.60,  0.02],
  neck:           [0,     1.37,  0   ],
  torso:          [0,     0.90,  0   ],
  abdomen:        [0,     0.55,  0   ],
  pelvis:         [0,     0.32,  0   ],
  left_shoulder:  [-0.19, 1.22,  0   ],
  right_shoulder: [ 0.19, 1.22,  0   ],
  left_upper_arm: [-0.26, 0.97,  0   ],
  right_upper_arm:[ 0.26, 0.97,  0   ],
  left_elbow:     [-0.28, 0.74,  0   ],
  right_elbow:    [ 0.28, 0.74,  0   ],
  left_lower_arm: [-0.28, 0.55,  0   ],
  right_lower_arm:[ 0.28, 0.55,  0   ],
  left_hand:      [-0.28, 0.32,  0   ],
  right_hand:     [ 0.28, 0.32,  0   ],
  left_hip:       [-0.10, 0.34,  0   ],
  right_hip:      [ 0.10, 0.34,  0   ],
  left_thigh:     [-0.12, 0.05,  0   ],
  right_thigh:    [ 0.12, 0.05,  0   ],
  left_knee:      [-0.12,-0.28,  0   ],
  right_knee:     [ 0.12,-0.28,  0   ],
  left_shin:      [-0.12,-0.54,  0   ],
  right_shin:     [ 0.12,-0.54,  0   ],
  left_ankle:     [-0.12,-0.80,  0   ],
  right_ankle:    [ 0.12,-0.80,  0   ],
  left_foot:      [-0.12,-0.92,  0.06],
  right_foot:     [ 0.12,-0.92,  0.06],
  chest:          [ 0,    0.90, -0.05],
  brain:          [ 0,    1.62,  0   ],
};

const GLOW_RADIUS = {
  head: 0.14, torso: 0.22, abdomen: 0.18, pelvis: 0.18,
  left_shoulder: 0.10, right_shoulder: 0.10,
  left_elbow: 0.09, right_elbow: 0.09,
  left_wrist: 0.07, right_wrist: 0.07,
  left_hip: 0.11, right_hip: 0.11,
  left_knee: 0.11, right_knee: 0.11,
  left_ankle: 0.09, right_ankle: 0.09,
  left_thigh: 0.10, right_thigh: 0.10,
  left_shin: 0.08, right_shin: 0.08,
  left_foot: 0.09, right_foot: 0.09,
  left_upper_arm: 0.09, right_upper_arm: 0.09,
  left_lower_arm: 0.08, right_lower_arm: 0.08,
  chest: 0.15, brain: 0.10,
};

// ── Pulsing glow overlay sphere ────────────────────────────────────────────
function PulsingGlow({ position, radius, color, severity }) {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = 1 + Math.sin(t * 2.8) * 0.07 * Math.min(severity, 3);
    meshRef.current.scale.setScalar(pulse);
    meshRef.current.material.opacity = 0.38 + Math.sin(t * 2.8) * 0.14;
  });
  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[radius, 18, 18]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.4}
        emissive={color}
        emissiveIntensity={1.8}
        depthWrite={false}
      />
    </mesh>
  );
}

// ── Single STL part ────────────────────────────────────────────────────────
function STLPart({ model, isAffected, highlightColor, highlightEmissive, emissiveIntensity, isBefore }) {
  const geometry = useLoader(STLLoader, `/models/${model.file}`);
  const swellFactor = isAffected && isBefore ? (model.type === 'bone' ? 1.18 : 1.1) : 1.0;
  const color   = isAffected ? highlightColor    : model.baseColor;
  const emissive= isAffected ? highlightEmissive : '#000000';
  const eiVal   = isAffected ? emissiveIntensity  : 0;

  return (
    <mesh
      geometry={geometry}
      position={model.position}
      rotation={model.rotation}
      scale={[model.scale * swellFactor, model.scale * swellFactor, model.scale * swellFactor]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={eiVal}
        roughness={model.type === 'skin' ? 0.78 : model.type === 'organ' ? 0.6 : 0.55}
        metalness={model.type === 'bone' ? 0.08 : 0}
        side={model.type === 'skin' ? THREE.FrontSide : THREE.DoubleSide}
      />
    </mesh>
  );
}

// ── Full anatomical body assembled from STL parts ──────────────────────────
function HumanBodyMesh({ affectedMeshes, primaryGlowMeshes, severity, stage }) {
  const isBefore = stage === 'before';
  const severityColor    = SEVERITY_COLORS[severity] || '#ef4444';
  const highlightColor   = isBefore ? severityColor : HEALED_COLOR;
  const highlightEmissive = highlightColor;
  const emissiveIntensity = isBefore ? 0.55 : 0.30;

  return (
    <Center>
      <group>
        {STL_MODELS.map((model) => {
          const isAffected = affectedMeshes.includes(model.meshId);
          return (
            <STLPart
              key={model.file}
              model={model}
              isAffected={isAffected}
              highlightColor={highlightColor}
              highlightEmissive={highlightEmissive}
              emissiveIntensity={emissiveIntensity}
              isBefore={isBefore}
            />
          );
        })}

        {/* ── Pulsing glow overlays on affected regions ── */}
        {primaryGlowMeshes.map((id) => {
          const pos = GLOW_CENTRES[id];
          if (!pos) return null;
          const r = GLOW_RADIUS[id] || 0.12;
          return (
            <PulsingGlow
              key={id}
              position={pos}
              radius={r}
              color={highlightColor}
              severity={severity}
            />
          );
        })}

        {/* ── Ground shadow disc ── */}
        <mesh position={[0, -1.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial color="#c0c0c0" transparent opacity={0.22} />
        </mesh>
      </group>
    </Center>
  );
}

// ── Scene wrapper ──────────────────────────────────────────────────────────
function Scene({ condition, stage }) {
  const { affectedMeshes, primaryGlowMeshes, severityLevel } = condition;
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 3]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 3, -2]} intensity={0.35} color="#b8d4ff" />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#fff5e0" />

      <HumanBodyMesh
        affectedMeshes={affectedMeshes}
        primaryGlowMeshes={primaryGlowMeshes}
        severity={severityLevel}
        stage={stage}
      />

      <OrbitControls
        enablePan={false}
        minDistance={1.5}
        maxDistance={6}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI - 0.2}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  );
}

// ── Loading skeleton ───────────────────────────────────────────────────────
function LoadingBody() {
  return (
    <mesh position={[0, 0, 0]}>
      <capsuleGeometry args={[0.18, 1.4, 8, 16]} />
      <meshStandardMaterial color="#334155" transparent opacity={0.4} wireframe />
    </mesh>
  );
}

// ── Public component ───────────────────────────────────────────────────────
export default function HumanBody3D({ condition, stage = 'before' }) {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '500px' }}>
      <Canvas
        camera={{ position: [0, 0.4, 3.2], fov: 45 }}
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', width: '100%', height: '100%' }}
        shadows
      >
        <Suspense fallback={<LoadingBody />}>
          <Scene condition={condition} stage={stage} />
        </Suspense>
      </Canvas>
    </div>
  );
}
