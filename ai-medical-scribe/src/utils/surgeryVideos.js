const BASE_SURGERY_KEYWORDS = [
  'surgery',
  'operation',
  'operative',
  'procedure',
  'surgical',
  'incision',
  'laparoscopy',
  'arthroplasty',
  'bypass',
  'transplant',
  'cabg',
  'open heart',
  'angioplasty',
  'valve replacement',
];

const HEART_KEYWORDS = [
  'heart',
  'cardiac',
  'coronary',
  'cabg',
  'bypass',
  'myocardial',
  'angina',
  'valve',
  'aortic',
  'mitral',
  'stent',
  'angioplasty',
  'arrhythmia',
  'ecg',
  'echo',
  'chest pain',
  'shortness of breath',
  'palpitation',
];

const DETAIL_HINT_KEYWORDS = [
  'pain',
  'breath',
  'ecg',
  'echo',
  'angiogram',
  'block',
  'stenosis',
  'ischemia',
  'troponin',
  'palpitation',
  'fatigue',
  'dizziness',
  'bp',
  'pressure',
  'artery',
  'coronary',
  'valve',
  'bypass',
];

const normalizeLine = (line) => line.replace(/^\s*(doctor|patient)\s*:\s*/i, '').trim();

export const detectSurgeryContext = (notes, transcript = '') => {
  const textBlocks = [
    notes?.assessment,
    notes?.plan,
    notes?.chiefComplaint,
    notes?.historyOfPresentIllness,
    transcript,
  ].filter(Boolean);

  const allText = [
    ...textBlocks,
  ].join(' ').toLowerCase();

  const hasBaseSurgerySignal = BASE_SURGERY_KEYWORDS.some((k) => allText.includes(k));
  const hasHeartSignal = HEART_KEYWORDS.some((k) => allText.includes(k));

  const rawLines = textBlocks
    .flatMap((b) => String(b).split(/[\n\.]/g))
    .map(normalizeLine)
    .filter(Boolean);

  const detailLines = Array.from(new Set(
    rawLines.filter((line) => {
      const l = line.toLowerCase();
      const hasHeart = HEART_KEYWORDS.some((k) => l.includes(k));
      const hasHint = DETAIL_HINT_KEYWORDS.some((k) => l.includes(k));
      return hasHeart || hasHint;
    })
  )).slice(0, 6);

  if (!(hasBaseSurgerySignal && hasHeartSignal)) {
    return {
      hasSurgery: false,
      topicLabel: '',
      detailLines: [],
    };
  }

  return {
    hasSurgery: true,
    topicLabel: 'Heart Surgery',
    detailLines,
  };
};
