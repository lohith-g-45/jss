/**
 * biodigitalMap.js
 *
 * Maps body parts detected from SOAP notes → BioDigital Human content IDs.
 *
 * HOW TO GET REAL CONTENT IDs:
 * ──────────────────────────────
 * 1.  Go to  https://human.biodigital.com/library
 * 2.  Search for the anatomy/condition (e.g. "knee", "ACL tear", "lumbar herniation")
 * 3.  Open the content → click "Share / Embed"
 * 4.  Copy the value after  ?id=  in the embed URL
 * 5.  Paste it in the map below
 *
 * HOW TO GET YOUR DEVELOPER KEY (dk):
 * ──────────────────────────────────
 * 1.  Register at  https://developer.biodigital.com
 * 2.  Create an app (free), add your domain: localhost:5173
 * 3.  Copy the "Client ID" — use it as  VITE_BIODIGITAL_CLIENT_ID  in .env
 *
 * The dk key enables:
 *  • Programmatic camera focus on the affected anatomy
 *  • Colour highlighting of specific structures
 *  • Show/hide anatomy layers
 *  • Severity overlay
 */

// ── Confirmed working model ────────────────────────────────────────────────
// Full human muscular anatomy model (verified from share link):
// https://human.biodigital.com/view?id=73Xp
// All body parts use this same full-body model; the SDK highlights the
// relevant anatomy region when a developer key (dk) is present.
export const DEFAULT_MODEL_ID = '73Xp';

// ── Content IDs + anatomy objects ─────────────────────────────────────────
// id       → BioDigital model ID embedded in the iframe
// objects  → mesh names inside that model for SDK colour-highlighting
// cameraFocus → object the camera flies to (requires dk)
export const BIODIGITAL_CONTENT = {
  knee: {
    id: DEFAULT_MODEL_ID,
    objects: ['Anterior_Cruciate_Ligament_L', 'Anterior_Cruciate_Ligament_R',
              'Medial_Meniscus_L', 'Medial_Meniscus_R',
              'Knee_Joint_L', 'Knee_Joint_R'],
    cameraFocus: 'Knee_Joint_L',
  },
  shoulder: {
    id: DEFAULT_MODEL_ID,
    objects: ['Supraspinatus_L', 'Supraspinatus_R',
              'Infraspinatus_L', 'Infraspinatus_R',
              'Deltoid_L', 'Deltoid_R'],
    cameraFocus: 'Shoulder_Joint_L',
  },
  elbow: {
    id: DEFAULT_MODEL_ID,
    objects: ['Biceps_Brachii_L', 'Biceps_Brachii_R',
              'Triceps_Brachii_L', 'Triceps_Brachii_R'],
    cameraFocus: 'Elbow_Joint_L',
  },
  wrist: {
    id: DEFAULT_MODEL_ID,
    objects: ['Flexor_Carpi_Radialis_L', 'Flexor_Carpi_Radialis_R',
              'Extensor_Carpi_Radialis_L', 'Extensor_Carpi_Radialis_R'],
    cameraFocus: 'Wrist_Joint_L',
  },
  hip: {
    id: DEFAULT_MODEL_ID,
    objects: ['Gluteus_Maximus_L', 'Gluteus_Maximus_R',
              'Gluteus_Medius_L', 'Gluteus_Medius_R'],
    cameraFocus: 'Hip_Joint_L',
  },
  ankle: {
    id: DEFAULT_MODEL_ID,
    objects: ['Tibialis_Anterior_L', 'Tibialis_Anterior_R',
              'Soleus_L', 'Soleus_R'],
    cameraFocus: 'Ankle_Joint_L',
  },
  back: {
    id: DEFAULT_MODEL_ID,
    objects: ['Erector_Spinae_L', 'Erector_Spinae_R',
              'Latissimus_Dorsi_L', 'Latissimus_Dorsi_R'],
    cameraFocus: 'Lumbar_Vertebrae',
  },
  neck: {
    id: DEFAULT_MODEL_ID,
    objects: ['Sternocleidomastoid_L', 'Sternocleidomastoid_R',
              'Trapezius_L', 'Trapezius_R'],
    cameraFocus: 'Cervical_Vertebrae',
  },
  head: {
    id: DEFAULT_MODEL_ID,
    objects: ['Frontal_Bone', 'Temporalis_L', 'Temporalis_R',
              'Masseter_L', 'Masseter_R'],
    cameraFocus: 'Skull',
  },
  chest: {
    id: DEFAULT_MODEL_ID,
    objects: ['Pectoralis_Major_L', 'Pectoralis_Major_R',
              'Pectoralis_Minor_L', 'Pectoralis_Minor_R', 'Rib_Cage'],
    cameraFocus: 'Sternum',
  },
  abdomen: {
    id: DEFAULT_MODEL_ID,
    objects: ['Rectus_Abdominis_L', 'Rectus_Abdominis_R',
              'External_Oblique_L', 'External_Oblique_R'],
    cameraFocus: 'Rectus_Abdominis_L',
  },
  pelvis: {
    id: DEFAULT_MODEL_ID,
    objects: ['Iliacus_L', 'Iliacus_R', 'Psoas_Major_L', 'Psoas_Major_R'],
    cameraFocus: 'Pelvis',
  },
  thigh: {
    id: DEFAULT_MODEL_ID,
    objects: ['Rectus_Femoris_L', 'Rectus_Femoris_R',
              'Biceps_Femoris_L', 'Biceps_Femoris_R',
              'Vastus_Lateralis_L', 'Vastus_Lateralis_R'],
    cameraFocus: 'Rectus_Femoris_L',
  },
  calf: {
    id: DEFAULT_MODEL_ID,
    objects: ['Gastrocnemius_L', 'Gastrocnemius_R',
              'Soleus_L', 'Soleus_R'],
    cameraFocus: 'Gastrocnemius_L',
  },
  foot: {
    id: DEFAULT_MODEL_ID,
    objects: ['Extensor_Digitorum_Brevis_L', 'Extensor_Digitorum_Brevis_R',
              'Flexor_Digitorum_Brevis_L', 'Flexor_Digitorum_Brevis_R'],
    cameraFocus: 'Calcaneus_L',
  },
  hand: {
    id: DEFAULT_MODEL_ID,
    objects: ['Flexor_Digitorum_Superficialis_L', 'Flexor_Digitorum_Superficialis_R',
              'Extensor_Digitorum_L', 'Extensor_Digitorum_R'],
    cameraFocus: 'Metacarpals_L',
  },
};

// Severity → highlight colour passed to BioDigital API
export const SEVERITY_HIGHLIGHT = {
  1: [0.13, 0.77, 0.37, 0.7],   // green  rgba-normalised 0-1
  2: [0.96, 0.62, 0.04, 0.75],  // amber
  3: [0.94, 0.27, 0.27, 0.8],   // red
  4: [0.58, 0.20, 0.92, 0.85],  // purple
};

// Healed colour for "after" stage
export const HEALED_HIGHLIGHT = [0.13, 0.77, 0.37, 0.6];
