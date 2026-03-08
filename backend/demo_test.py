import sys
import asyncio
import json
import httpx
import websockets

sys.stdout.reconfigure(encoding='utf-8')

BASE = "http://127.0.0.1:8000"
WS   = "ws://127.0.0.1:8000/ws/DEMO_SESSION"

async def run():
    print("=" * 50)
    print("  MEDICAL-SCRIBE BACKEND LIVE TEST")
    print("=" * 50)

    # --- HEALTH CHECK ---
    async with httpx.AsyncClient() as c:
        r = await c.get(f"{BASE}/api/health", timeout=10)
        h = r.json()
        print("\n[1] HEALTH CHECK")
        print(f"    Status   : {r.status_code} OK")
        print(f"    Server   : {h['status']} v{h['version']}")
        print(f"    Whisper  : {h['whisper']}")
        print(f"    NER      : {h['ner']}")
        print(f"    Groq AI  : {h['insights_groq']}")
        print(f"    HIPAA    : {h['hipaa']}")
        print(f"    Encrypt  : {h['encryption']}")

    # --- TEXT + NER PROCESSING ---
    async with httpx.AsyncClient(timeout=30) as c:
        payload = {
            "text": "Patient has severe chest pain and shortness of breath since morning.",
            "speaker": "Doctor",
            "language": "en"
        }
        r = await c.post(f"{BASE}/api/process-text", json=payload)
        d = r.json()
        print("\n[2] TEXT PROCESSING + NER")
        print(f"    Input    : \"{payload['text'][:55]}...\"")
        print(f"    Speaker  : {d.get('speaker', 'N/A')}")
        print(f"    Entities : {[e['text'] for e in d.get('entities', [])]}")
        print(f"    Body Map : {d.get('body_part_updates', {})}")
        soap = d.get('soap_note', {})
        print(f"    SOAP-S   : {soap.get('subjective','')[:60]}")
        print(f"    SOAP-A   : {soap.get('assessment','')[:60]}")

    # --- WEBSOCKET + AUTO SPEAKER DETECTION ---
    print("\n[3] WEBSOCKET + AUTO SPEAKER DETECTION")
    async with websockets.connect(WS) as ws:
        turns = [
            ("How long have you had this chest pain?",              "Doctor"),
            ("It started this morning after breakfast, very sharp.", "Patient"),
            ("Do you have any shortness of breath or nausea?",      "Doctor"),
            ("Yes, I feel nauseous and my chest is burning badly.",  "Patient"),
        ]
        all_pass = True
        for i, (text, expected) in enumerate(turns, 1):
            await ws.send(json.dumps({
                "type": "text_input",
                "text": text,
                "speaker": "Unknown",
                "language": "en"
            }))
            resp = json.loads(await ws.recv())
            detected = resp.get("speaker", "?")
            passed = detected == expected
            if not passed:
                all_pass = False
            status = "PASS" if passed else "FAIL"
            print(f"    Turn {i} [{status}]  Detected: {detected:<8}  Sentence: \"{text[:40]}\"")

    print()
    print("=" * 50)
    overall = "ALL TESTS PASSED" if all_pass else "SOME TESTS FAILED"
    print(f"  {overall}")
    print("=" * 50)

asyncio.run(run())
