/**
 * BioDigitalViewer.jsx
 *
 * Embeds BioDigital Human 3D viewer (model 73Xp — full muscular anatomy)
 * via iframe. Works in basic viewing mode without a developer key.
 *
 * To unlock anatomy colour-highlighting, camera focus & SDK controls:
 *   1. Register free at https://developer.biodigital.com
 *   2. Create an app → add domain: localhost:5173
 *   3. Copy Client ID → add to .env:
 *        VITE_BIODIGITAL_CLIENT_ID=dk_xxxxx
 *   4. Restart dev server
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { BIODIGITAL_CONTENT, DEFAULT_MODEL_ID, SEVERITY_HIGHLIGHT, HEALED_HIGHLIGHT } from '../utils/biodigitalMap';

const DK = import.meta.env.VITE_BIODIGITAL_CLIENT_ID || '';
const BHJS_SDK_URL = 'https://developer.biodigital.com/builds/api/2/human-api.min.js';
const BIODIGITAL_BASE = 'https://human.biodigital.com/viewer/';

function buildViewerURL(bodyPart, dk) {
  const content = BIODIGITAL_CONTENT[bodyPart] || BIODIGITAL_CONTENT.knee;
  const modelId = content.id || DEFAULT_MODEL_ID;
  const params = new URLSearchParams({
    id: modelId,
    'ui-panel': 'false',
    'ui-nav': 'false',
    'ui-tools': 'false',
    lang: 'en',
  });
  if (dk) params.set('dk', dk);
  return `${BIODIGITAL_BASE}?${params.toString()}`;
}

// Dynamically load the BioDigital BHJS SDK script once
let sdkLoaded = false;
function loadBHJS() {
  if (sdkLoaded || document.querySelector(`script[src="${BHJS_SDK_URL}"]`)) {
    sdkLoaded = true;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = BHJS_SDK_URL;
    s.onload = () => { sdkLoaded = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function BioDigitalViewer({ condition, stage = 'before' }) {
  const iframeRef = useRef(null);
  const humanRef = useRef(null);
  // 'loading' | 'ready' | 'error' | 'no-sdk' (visible but SDK unavailable)
  const [viewerState, setViewerState] = useState('loading');

  const { bodyPart, severityLevel } = condition;
  const content = BIODIGITAL_CONTENT[bodyPart] || BIODIGITAL_CONTENT.knee;
  const isAfter = stage === 'after';
  const highlightColor = isAfter ? HEALED_HIGHLIGHT : (SEVERITY_HIGHLIGHT[severityLevel] || SEVERITY_HIGHLIGHT[2]);

  // Build URL — no key: view-only; key present: full SDK mode
  const viewerURL = buildViewerURL(bodyPart, DK);

  // ── Highlight objects via BHJS SDK (only when DK present) ─────────────
  const highlightAnatomy = () => {
    const human = humanRef.current;
    if (!human) return;

    human.send('scene.restore');

    const objectIds = content.objects || [];
    objectIds.forEach((id) => {
      human.send('object.override', {
        objectId: id,
        properties: {
          colorDiffuse: { r: highlightColor[0], g: highlightColor[1], b: highlightColor[2] },
          colorSpecular: { r: highlightColor[0], g: highlightColor[1], b: highlightColor[2] },
          opacity: highlightColor[3],
        },
      });
    });

    if (content.cameraFocus) {
      human.send('camera.fly.to.object', {
        objectId: content.cameraFocus,
        duration: 1.5,
      });
    }
  };

  useEffect(() => {
    let human = null;

    if (!DK) {
      // No developer key — model still loads in iframe; SDK features unavailable
      // We mark as 'no-sdk' once the iframe fires onLoad
      return;
    }

    loadBHJS()
      .then(() => {
        if (!iframeRef.current || !window.HumanAPI) return;

        human = new window.HumanAPI(iframeRef.current);
        humanRef.current = human;

        human.on('human.ready', () => {
          setViewerState('ready');
          highlightAnatomy();
        });

        human.on('human.error', () => setViewerState('error'));
      })
      .catch(() => setViewerState('error'));

    return () => {
      if (human) {
        try { human.send('scene.restore'); } catch (_) {}
      }
      humanRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-highlight when stage or severity changes
  useEffect(() => {
    if (viewerState === 'ready') highlightAnatomy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, severityLevel, viewerState]);

  return (
    <div className="relative w-full h-full bg-slate-900" style={{ minHeight: '500px' }}>
      {/* BioDigital iframe — loads regardless of whether DK is present */}
      <iframe
        ref={iframeRef}
        id="biodigital-human"
        title="BioDigital Human 3D Viewer"
        src={viewerURL}
        onLoad={() => {
          if (!DK && viewerState === 'loading') setViewerState('no-sdk');
        }}
        frameBorder="0"
        allowFullScreen
        className="w-full h-full border-0"
        style={{ minHeight: '500px' }}
      />

      {/* Loading overlay */}
      {viewerState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-3">
          <Loader2 size={36} className="animate-spin text-blue-400" />
          <p className="text-slate-300 text-sm">Loading BioDigital Human 3D model…</p>
        </div>
      )}

      {/* Error overlay */}
      {viewerState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 gap-3 p-8">
          <AlertCircle size={36} className="text-red-400" />
          <p className="text-white font-semibold">Could not load BioDigital viewer</p>
          <p className="text-slate-400 text-sm text-center">
            Check that your developer key is valid and your domain is allowlisted at{' '}
            <span className="text-blue-400">developer.biodigital.com</span>
          </p>
        </div>
      )}

      {/* Ready badge — full SDK mode */}
      {viewerState === 'ready' && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-900/70 text-green-300 text-xs px-2.5 py-1 rounded-full border border-green-700/40 pointer-events-none">
          <CheckCircle size={12} />
          BioDigital Human — Full Mode
        </div>
      )}

      {/* View-only banner — no developer key */}
      {viewerState === 'no-sdk' && (
        <div className="absolute bottom-4 left-4 right-4 flex items-start gap-2 bg-amber-950/90 border border-amber-700/50 text-amber-200 text-xs px-3 py-2.5 rounded-lg pointer-events-none">
          <Info size={14} className="shrink-0 mt-0.5 text-amber-400" />
          <span>
            <span className="font-semibold">View-only mode</span> — anatomy colour-highlighting &amp; camera focus
            require a free BioDigital developer key.{' '}
            <span className="text-amber-300">Add <code className="bg-amber-900/60 px-1 rounded">VITE_BIODIGITAL_CLIENT_ID</code> to your .env to unlock full features.</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Setup screen when no API key configured ────────────────────────────────

