"""
Medical-Scribe Backend Test Suite
Tests: health check, text processing, WebSocket, and auto speaker detection
"""

import sys
import asyncio
import json
import httpx
import websockets

# Fix Windows encoding for special characters (✅ ❌ emojis)
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/TEST_SESSION"


async def test_health():
    print("\n--- Testing API Health ---")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{BASE_URL}/api/health", timeout=10.0)
            print(f"Status: {response.status_code}")
            print(f"Response: {json.dumps(response.json(), indent=2)}")
            return response.status_code == 200
        except Exception as e:
            print(f"Health check failed! Error: {str(e)}")
            print(f"Is the backend running on {BASE_URL}?")
            return False


async def test_text_processing():
    print("\n--- Testing Direct Text Processing (API) ---")
    payload = {
        "text": "The patient is experiencing severe chest pain and short of breath. Right arm is feeling numb.",
        "speaker": "Doctor",
        "language": "en"
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(f"{BASE_URL}/api/process-text", json=payload)
            data = response.json()
            print(f"Status: {response.status_code}")
            print("NER Entities Found:")
            for ent in data.get('entities', []):
                print(f"  - {ent['text']} ({ent.get('type', 'unknown')})")
            print("\nBody Part Updates:")
            print(json.dumps(data.get('body_part_updates', {}), indent=2))
            return True
        except Exception as e:
            print(f"Text processing failed: {e}")
            return False


async def test_websocket_text():
    print("\n--- Testing WebSocket Interaction (Text Input) ---")
    try:
        async with websockets.connect(WS_URL) as websocket:
            print("Connected to WebSocket.")
            msg = {
                "type": "text_input",
                "text": "Patient has high fever and cough. Possible pneumonia.",
                "speaker": "Doctor",
                "language": "en"
            }
            await websocket.send(json.dumps(msg))
            print("Sent text_input message via WS.")
            response = await websocket.recv()
            data = json.loads(response)
            print(f"Received from WS: {data.get('type')}")
            print(f"Transcript: {data.get('translated_text')}")
            print(f"Entities: {[e['text'] for e in data.get('entities', [])]}")
            return True
    except Exception as e:
        print(f"WebSocket test failed: {e}")
        return False


async def test_conversation():
    print("\n--- Testing Automatic Speaker Recognition (Conversation) ---")
    try:
        async with websockets.connect(WS_URL) as websocket:
            turns = [
                {"text": "Hello, I am Dr. Smith. How can I help you today?", "expected": "Doctor"},
                {"text": "I have a lot of pain in my stomach and it's been burning since morning.", "expected": "Patient"},
                {"text": "When did the pain start exactly?", "expected": "Doctor"},
                {"text": "It started right after breakfast around 8 AM.", "expected": "Patient"}
            ]
            for i, turn in enumerate(turns):
                msg = {
                    "type": "text_input",
                    "text": turn["text"],
                    "speaker": "Unknown",
                    "language": "en"
                }
                await websocket.send(json.dumps(msg))
                response = await websocket.recv()
                data = json.loads(response)
                detected = data.get('speaker')
                status = "✅" if detected == turn["expected"] else "❌"
                print(f"Turn {i+1}: '{turn['text'][:35]}...' -> Detected: {detected} (Expected: {turn['expected']}) {status}")
            return True
    except Exception as e:
        print(f"Conversation test failed: {e}")
        return False


async def main():
    print("Starting Backend Voice Pipeline Test...")

    health_ok = await test_health()
    if not health_ok:
        print("!! Health check failed. Is the backend running?")
        return

    await test_text_processing()
    await test_websocket_text()
    await test_conversation()

    print("\n--- Test Suite Complete ---")


if __name__ == "__main__":
    asyncio.run(main())
