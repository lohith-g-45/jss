/**
 * medicalBodyParser.js  — v2 (score-based)
 * Parses SOAP notes / transcripts to extract:
 *  - Affected body part  (frequency scoring, not first-match)
 *  - Severity level 1–4  (frequency scoring, not first-match)
 *  - Treatment type      (frequency scoring)
 *  - Laterality          (context-aware: looks for "left/right + body keyword")
 *  - Mesh IDs + descriptions for the 3D viewer
 */

// ── Body part keyword registry ─────────────────────────────────────────────
const BODY_PART_KEYWORDS = {
  knee:     ['knee', 'kneecap', 'patella', 'acl', 'mcl', 'pcl', 'meniscus', 'patellar', 'cruciate', 'ligament tear'],
  shoulder: ['shoulder', 'rotator cuff', 'rotator', 'clavicle', 'scapula', 'glenohumeral', 'labrum', 'acromioclavicular'],
  elbow:    ['elbow', 'tennis elbow', 'golfer elbow', 'lateral epicondyl', 'medial epicondyl', 'olecranon'],
  wrist:    ['wrist', 'carpal tunnel', 'carpal', 'distal radius', 'distal ulna'],
  hip:      ['hip', 'femoral head', 'acetabulum', 'iliopsoas', 'groin', 'inguinal', 'hip joint'],
  ankle:    ['ankle', 'achilles', 'talus', 'sprained ankle', 'ankle sprain', 'ankle ligament'],
  back:     ['back pain', 'lower back', 'lumbar', 'thoracic', 'vertebra', 'disc herniation', 'herniated disc', 'scoliosis', 'sciatica', 'spinal', 'spine'],
  neck:     ['neck', 'cervical', 'whiplash', 'neck pain', 'cervical disc'],
  head:     ['head', 'skull', 'brain', 'concussion', 'cranial', 'traumatic brain', 'tbi', 'migraine', 'headache'],
  chest:    ['chest', 'rib', 'sternum', 'thorax', 'costochondral', 'chest pain', 'pectoral', 'cardiac', 'heart'],
  abdomen:  ['abdomen', 'abdominal', 'stomach', 'bowel', 'intestine', 'appendix', 'hernia', 'abdominal pain', 'gastric', 'peptic', 'gastritis', 'ibs', 'crohn', 'colitis', 'nausea', 'vomiting'],
  pelvis:   ['pelvis', 'pelvic', 'sacrum', 'sacroiliac', 'coccyx'],
  thigh:    ['thigh', 'quadricep', 'hamstring', 'femur'],
  calf:     ['calf', 'shin splint', 'shin', 'gastrocnemius', 'tibia', 'fibula'],
  foot:     ['foot', 'feet', 'plantar fasciitis', 'plantar', 'heel', 'metatarsal', 'toe'],
  hand:     ['hand', 'finger', 'thumb', 'knuckle', 'metacarpal', 'phalanx'],
};

// 3D mesh IDs per body part
const BODY_PART_TO_MESH = {
  knee:     ['left_knee', 'right_knee', 'left_thigh', 'right_thigh', 'left_shin', 'right_shin'],
  shoulder: ['left_shoulder', 'right_shoulder', 'left_upper_arm', 'right_upper_arm'],
  elbow:    ['left_elbow', 'right_elbow', 'left_upper_arm', 'right_upper_arm', 'left_lower_arm', 'right_lower_arm'],
  wrist:    ['left_wrist', 'right_wrist', 'left_lower_arm', 'right_lower_arm'],
  hip:      ['left_hip', 'right_hip', 'pelvis'],
  ankle:    ['left_ankle', 'right_ankle', 'left_shin', 'right_shin'],
  back:     ['torso', 'abdomen', 'pelvis'],
  neck:     ['neck'],
  head:     ['head', 'brain'],
  chest:    ['chest', 'left_lung', 'right_lung'],
  abdomen:  ['abdomen', 'abdomen_organ'],
  pelvis:   ['pelvis'],
  thigh:    ['left_thigh', 'right_thigh'],
  calf:     ['left_shin', 'right_shin'],
  foot:     ['left_foot', 'right_foot'],
  hand:     ['left_hand', 'right_hand'],
};

// Primary glow joint per body part
const BODY_PART_PRIMARY_JOINT = {
  knee:     ['left_knee', 'right_knee'],
  shoulder: ['left_shoulder', 'right_shoulder'],
  elbow:    ['left_elbow', 'right_elbow'],
  wrist:    ['left_wrist', 'right_wrist'],
  hip:      ['left_hip', 'right_hip'],
  ankle:    ['left_ankle', 'right_ankle'],
  back:     ['torso'],
  neck:     ['neck'],
  head:     ['head'],
  chest:    ['chest'],
  abdomen:  ['abdomen'],
  pelvis:   ['pelvis'],
  thigh:    ['left_thigh', 'right_thigh'],
  calf:     ['left_shin', 'right_shin'],
  foot:     ['left_foot', 'right_foot'],
  hand:     ['left_hand', 'right_hand'],
};

// ── Severity keywords ──────────────────────────────────────────────────────
const SEVERITY_KEYWORDS = {
  4: ['critical', 'life-threatening', 'emergency', 'complete rupture', 'total rupture', 'completely torn', 'grade iii', 'stage 4', 'stage iv', 'complex fracture', 'comminuted fracture', 'rupture'],
  3: ['severe', 'serious', 'significant damage', 'major damage', 'extensive damage', 'partial tear', 'high grade', 'grade ii', 'stage 3', 'substantial injury', 'marked instability'],
  2: ['moderate', 'noticeable', 'considerable', 'stage 2', 'grade 1', 'mild to moderate', 'moderate pain', 'intermittent'],
  1: ['mild', 'minor', 'slight', 'early stage', 'minimal', 'small', 'stage 1', 'grade 0', 'low grade', 'mild pain', 'mild discomfort'],
};

// ── Treatment keywords ─────────────────────────────────────────────────────
const TREATMENT_KEYWORDS = {
  surgery:       ['surgery', 'surgical', 'operation', 'arthroscopy', 'arthroplasty', 'replacement', 'reconstruction', 'repair surgery', 'osteotomy', 'implant', 'procedure'],
  physiotherapy: ['physiotherapy', 'physical therapy', 'rehabilitation', 'rehab', 'exercise therapy', 'strengthening exercises', 'stretching'],
  medication:    ['medication', 'anti-inflammatory', 'nsaid', 'ibuprofen', 'corticosteroid', 'injection', 'analgesic', 'prescribed', 'tablets', 'drugs'],
  rest:          ['rest', 'immobilize', 'immobilization', 'brace', 'splint', 'crutches', 'cast', 'bed rest'],
};

// ── Full display metadata for every body part ──────────────────────────────
const CONDITION_DISPLAY = {
  knee: {
    name: 'Knee Injury', icon: '🦵',
    beforeDesc: (sev) => ({
      1: 'Minor strain or contusion to the knee joint. Mild swelling may be present.',
      2: 'Moderate ligament strain or partial meniscal tear. Noticeable swelling and restricted movement.',
      3: 'Severe ligament damage (ACL/MCL/PCL) or significant meniscal tear. Marked instability and pain.',
      4: 'Complete ligament rupture or complex fracture. Immediate surgical intervention required.',
    })[sev] || `Knee condition — severity ${sev}.`,
    afterDesc: (t) => t === 'surgery'
      ? 'Post-surgical reconstruction shows restored joint stability. Ligaments repaired. Recovery with rehabilitation expected.'
      : 'Knee shows significantly improved stability and reduced inflammation following treatment.',
  },
  shoulder: {
    name: 'Shoulder Injury', icon: '💪',
    beforeDesc: (sev) => ({
      1: 'Mild rotator cuff strain. Minor inflammation with preserved range of motion.',
      2: 'Moderate rotator cuff tear or shoulder impingement. Reduced strength overhead.',
      3: 'Significant rotator cuff damage or glenohumeral instability. Major loss of function.',
      4: 'Complete rotator cuff rupture or severe fracture. Total loss of shoulder function.',
    })[sev] || `Shoulder condition — severity ${sev}.`,
    afterDesc: (t) => t === 'surgery'
      ? 'Rotator cuff surgically repaired. Shoulder stability restored.'
      : 'Shoulder shows improved range of motion and reduced pain following treatment.',
  },
  elbow: {
    name: 'Elbow Injury', icon: '💪',
    beforeDesc: (sev) => ({
      1: 'Mild lateral or medial epicondylitis. Minimal tenderness with grip.',
      2: 'Moderate tendinopathy with partial tendon damage. Pain with lifting and gripping.',
      3: 'Severe tendon damage or ligament injury. Major functional impairment.',
      4: 'Complete tendon rupture or complex joint fracture.',
    })[sev] || `Elbow condition — severity ${sev}.`,
    afterDesc: () => 'Elbow function restored following treatment. Pain resolved.',
  },
  wrist: {
    name: 'Wrist Injury', icon: '🖐️',
    beforeDesc: (sev) => ({
      1: 'Mild wrist sprain. Minor tenderness with light activity.',
      2: 'Moderate wrist sprain or partial ligament tear. Reduced grip strength.',
      3: 'Significant wrist injury with instability. Impaired hand function.',
      4: 'Complete ligament rupture or fracture of the distal radius.',
    })[sev] || `Wrist condition — severity ${sev}.`,
    afterDesc: () => 'Wrist stability and function restored.',
  },
  hip: {
    name: 'Hip Condition', icon: '🦴',
    beforeDesc: (sev) => ({
      1: 'Mild hip flexor strain or early bursitis.',
      2: 'Moderate labral tear or hip impingement. Reduced range of motion.',
      3: 'Significant hip joint damage or advanced arthritis.',
      4: 'Severe femoral head damage or fracture requiring hip replacement.',
    })[sev] || `Hip condition — severity ${sev}.`,
    afterDesc: (t) => t === 'surgery'
      ? 'Hip joint reconstructed or replaced. Restored load-bearing and pain-free movement.'
      : 'Hip shows marked improvement with reduced inflammation.',
  },
  ankle: {
    name: 'Ankle Injury', icon: '🦶',
    beforeDesc: (sev) => ({
      1: 'Mild lateral ankle sprain. Ligament stretched but intact.',
      2: 'Moderate ankle sprain with partial ligament tear. Painful weight-bearing.',
      3: 'Complete lateral ligament rupture. Significant ankle instability.',
      4: 'Complex ankle fracture or complete syndesmotic rupture.',
    })[sev] || `Ankle condition — severity ${sev}.`,
    afterDesc: () => 'Ankle stability and function restored following treatment.',
  },
  back: {
    name: 'Back / Spine Condition', icon: '🦴',
    beforeDesc: (sev) => ({
      1: 'Mild lumbar muscle strain. Discomfort with prolonged sitting or standing.',
      2: 'Moderate disc bulge or mild nerve root irritation. Intermittent radiating pain.',
      3: 'Significant disc herniation compressing nerve roots. Sciatica and motor weakness.',
      4: 'Severe spinal stenosis or spondylolisthesis affecting multiple levels.',
    })[sev] || `Spinal condition — severity ${sev}.`,
    afterDesc: (t) => t === 'surgery'
      ? 'Spinal decompression/fusion completed. Nerve pressure relieved. Alignment improved.'
      : 'Back shows significantly improved posture and reduced pain following treatment.',
  },
  neck: {
    name: 'Neck Injury', icon: '🧠',
    beforeDesc: (sev) => ({
      1: 'Mild cervical muscle strain or whiplash Grade I.',
      2: 'Moderate cervical sprain. Stiffness and headaches present.',
      3: 'Cervical disc herniation with nerve root compression.',
      4: 'Severe cervical instability or cord compression.',
    })[sev] || `Neck condition — severity ${sev}.`,
    afterDesc: () => 'Cervical alignment restored. Nerve compression relieved.',
  },
  head: {
    name: 'Head / Neurological', icon: '🧠',
    beforeDesc: (sev) => ({
      1: 'Mild concussion or tension headaches. No structural damage detected.',
      2: 'Moderate head injury with persistent cognitive symptoms.',
      3: 'Significant traumatic brain injury with neurological deficits.',
      4: 'Severe TBI with critical neurological involvement.',
    })[sev] || `Head condition — severity ${sev}.`,
    afterDesc: () => 'Neurological function stabilised. Cognitive symptoms resolving.',
  },
  chest: {
    name: 'Chest Condition', icon: '❤️',
    beforeDesc: (sev) => ({
      1: 'Mild chest wall pain or costochondritis.',
      2: 'Moderate chest injury or rib fracture. Painful breathing.',
      3: 'Significant thoracic trauma or cardiac involvement.',
      4: 'Critical chest injury requiring emergency intervention.',
    })[sev] || `Chest condition — severity ${sev}.`,
    afterDesc: () => 'Chest function and breathing restored following treatment.',
  },
  abdomen: {
    name: 'Abdominal Condition', icon: '🫃',
    beforeDesc: (sev) => ({
      1: 'Mild abdominal discomfort. Possible gastritis or IBS symptoms.',
      2: 'Moderate abdominal pain. Inflammation or partial obstruction suspected.',
      3: 'Significant abdominal condition. Possible appendicitis, hernia, or bowel disease.',
      4: 'Acute abdomen requiring emergency surgical intervention.',
    })[sev] || `Abdominal condition — severity ${sev}.`,
    afterDesc: (t) => t === 'surgery'
      ? 'Surgical intervention completed. Abdominal condition resolved. Recovery in progress.'
      : 'Abdominal symptoms significantly reduced following medical treatment.',
  },
  pelvis: {
    name: 'Pelvic Condition', icon: '🦴',
    beforeDesc: (sev) => ({
      1: 'Mild pelvic girdle pain or sacroiliac joint strain.',
      2: 'Moderate pelvic instability or sacroiliac dysfunction.',
      3: 'Significant pelvic injury or stress fracture.',
      4: 'Severe pelvic fracture requiring surgical stabilisation.',
    })[sev] || `Pelvic condition — severity ${sev}.`,
    afterDesc: () => 'Pelvic stability and alignment restored.',
  },
  thigh: {
    name: 'Thigh Injury', icon: '🦵',
    beforeDesc: (sev) => ({
      1: 'Mild quadriceps or hamstring strain.',
      2: 'Moderate muscle tear with bruising and reduced strength.',
      3: 'Significant hamstring or quadriceps tear. Major functional impairment.',
      4: 'Complete muscle rupture or femur shaft fracture.',
    })[sev] || `Thigh condition — severity ${sev}.`,
    afterDesc: () => 'Thigh muscle strength and function restored.',
  },
  calf: {
    name: 'Calf / Shin Injury', icon: '🦵',
    beforeDesc: (sev) => ({
      1: 'Mild shin splints or calf tightness.',
      2: 'Moderate calf strain or stress fracture symptoms.',
      3: 'Significant calf muscle tear or tibia/fibula injury.',
      4: 'Complete muscle rupture or bone fracture requiring surgery.',
    })[sev] || `Calf condition — severity ${sev}.`,
    afterDesc: () => 'Calf function and gait restored following treatment.',
  },
  foot: {
    name: 'Foot Condition', icon: '🦶',
    beforeDesc: (sev) => ({
      1: 'Mild plantar fasciitis or foot soreness.',
      2: 'Moderate plantar fasciitis or metatarsal stress fracture.',
      3: 'Significant foot injury with weight-bearing impairment.',
      4: 'Complex foot fracture or complete tendon rupture.',
    })[sev] || `Foot condition — severity ${sev}.`,
    afterDesc: () => 'Foot function and pain-free weight-bearing restored.',
  },
  hand: {
    name: 'Hand / Finger Injury', icon: '🖐️',
    beforeDesc: (sev) => ({
      1: 'Mild finger sprain or hand contusion.',
      2: 'Moderate ligament tear or fracture with splinting required.',
      3: 'Significant tendon injury or complex fracture.',
      4: 'Complete tendon rupture or multi-fragment fracture.',
    })[sev] || `Hand condition — severity ${sev}.`,
    afterDesc: () => 'Hand function and grip strength restored.',
  },
};

// ── Utility ────────────────────────────────────────────────────────────────
function countOccurrences(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = text.match(new RegExp(escaped, 'gi'));
  return matches ? matches.length : 0;
}

// ── Main export ────────────────────────────────────────────────────────────
export function parseBodyCondition(notes = {}, transcript = '') {
  const allText = [
    notes.chiefComplaint || '',
    notes.historyOfPresentIllness || '',
    notes.assessment || '',
    notes.plan || '',
    notes.subjective || '',
    notes.objective || '',
    transcript || '',
  ].join(' ').toLowerCase();

  // ── 1. Body part: frequency scoring ─────────────────────────────────────
  let detectedPart = null;
  let maxPartScore = 0;
  for (const [part, keywords] of Object.entries(BODY_PART_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      score += countOccurrences(allText, kw);
    }
    if (score > maxPartScore) {
      maxPartScore = score;
      detectedPart = part;
    }
  }
  if (!detectedPart || maxPartScore === 0) {
    detectedPart = 'abdomen'; // neutral default
  }

  // ── 2. Severity: frequency scoring ──────────────────────────────────────
  const sevScores = { 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const kw of keywords) {
      sevScores[level] += countOccurrences(allText, kw);
    }
  }
  let severityLevel = 2; // default: moderate
  let maxSevScore = 0;
  for (const level of [4, 3, 2, 1]) {
    if (sevScores[level] > maxSevScore) {
      maxSevScore = sevScores[level];
      severityLevel = Number(level);
    }
  }

  // ── 3. Treatment: frequency scoring ─────────────────────────────────────
  let treatmentType = 'medication';
  let maxTreatScore = 0;
  for (const [type, keywords] of Object.entries(TREATMENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) score += countOccurrences(allText, kw);
    if (score > maxTreatScore) {
      maxTreatScore = score;
      treatmentType = type;
    }
  }

  // ── 4. Laterality: context-aware ────────────────────────────────────────
  // Only flag left/right when the side word appears next to a body-part keyword
  const partKeys = BODY_PART_KEYWORDS[detectedPart] || [];
  let hasLeft = false;
  let hasRight = false;
  for (const kw of partKeys) {
    const root = kw.split(' ')[0];
    if (allText.includes(`left ${kw}`) || allText.includes(`left ${root}`)) hasLeft = true;
    if (allText.includes(`right ${kw}`) || allText.includes(`right ${root}`)) hasRight = true;
  }
  // Explicit bilateral
  if (allText.includes('bilateral') || allText.includes('both sides') || allText.includes('both ')) {
    hasLeft = true;
    hasRight = true;
  }

  // ── 5. Build mesh lists ──────────────────────────────────────────────────
  let affectedMeshes = [...(BODY_PART_TO_MESH[detectedPart] || ['abdomen'])];
  let primaryGlowMeshes = [...(BODY_PART_PRIMARY_JOINT[detectedPart] || ['abdomen'])];

  if (hasLeft && !hasRight) {
    const f = affectedMeshes.filter((m) => !m.startsWith('right_'));
    if (f.length) affectedMeshes = f;
    const g = primaryGlowMeshes.filter((m) => !m.startsWith('right_'));
    if (g.length) primaryGlowMeshes = g;
  } else if (hasRight && !hasLeft) {
    const f = affectedMeshes.filter((m) => !m.startsWith('left_'));
    if (f.length) affectedMeshes = f;
    const g = primaryGlowMeshes.filter((m) => !m.startsWith('left_'));
    if (g.length) primaryGlowMeshes = g;
  }

  const laterality = hasLeft && !hasRight ? 'Left' : hasRight && !hasLeft ? 'Right' : '';
  const display = CONDITION_DISPLAY[detectedPart] || {
    name: detectedPart.charAt(0).toUpperCase() + detectedPart.slice(1) + ' Condition',
    icon: '🏥',
    beforeDesc: () => `Condition affecting the ${detectedPart}.`,
    afterDesc: () => `The ${detectedPart} shows improvement following treatment.`,
  };

  return {
    bodyPart: detectedPart,
    bodyPartName: display.name,
    bodyPartIcon: display.icon,
    severityLevel,
    treatmentType,
    affectedMeshes,
    primaryGlowMeshes,
    beforeDescription: display.beforeDesc(severityLevel),
    afterDescription: display.afterDesc(treatmentType),
    laterality,
  };
}

export const SEVERITY_META = {
  1: { label: 'Mild',     color: '#22c55e', bgColor: 'bg-green-100',  textColor: 'text-green-700',  borderColor: 'border-green-300' },
  2: { label: 'Moderate', color: '#f59e0b', bgColor: 'bg-amber-100',  textColor: 'text-amber-700',  borderColor: 'border-amber-300' },
  3: { label: 'Severe',   color: '#ef4444', bgColor: 'bg-red-100',    textColor: 'text-red-700',    borderColor: 'border-red-300' },
  4: { label: 'Critical', color: '#7c3aed', bgColor: 'bg-purple-100', textColor: 'text-purple-700', borderColor: 'border-purple-300' },
};

export const HEALED_COLOR = '#22c55e';
export const HEALED_GLOW  = '#86efac';
