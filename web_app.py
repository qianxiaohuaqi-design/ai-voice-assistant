import os
import base64
import requests
import uvicorn
import re
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Optional

# Initialize FastAPI App
app = FastAPI(title="Claude Voice Chat Assistant")

# Request Model Schema
class ChatMessage(BaseModel):
    role: str      # "user" or "assistant"
    content: str   # message text

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    model: Optional[str] = None  # Dynamically choose model (Haiku or Sonnet)
    anthropic_key: Optional[str] = None
    elevenlabs_key: Optional[str] = None
    voice_id: Optional[str] = None
    anthropic_base: Optional[str] = None
    response_language: Optional[str] = None
    elevenlabs_model: Optional[str] = None
    translate_enabled: Optional[bool] = False
    translate_target: Optional[str] = "Chinese"


# Ensure the static directory exists for the frontend files
os.makedirs("static", exist_ok=True)

# Mount static files to serve the HTML/CSS/JS frontend
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def get_index():
    """Serves the main landing page from the static directory."""
    index_path = os.path.join("static", "index.html")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(
        content="<h1>Server is running, but static/index.html is missing.</h1>", 
        status_code=404
    )

@app.get("/api/config")
def get_config_endpoint():
    """Returns whether the server has API keys configured in environment variables."""
    return {
        "has_anthropic_key": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "has_elevenlabs_key": bool(os.environ.get("ELEVENLABS_API_KEY")),
        "default_anthropic_base": os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
    }

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Orchestrates the API calls with Dual-Mode Routing:
    - Native Anthropic protocol if using official endpoints.
    - OpenAI-compatible protocol if using custom proxies (like OhMyGPT or API2D).
    """
    # 1. Resolve API Keys (request body > environment variables)
    anthropic_key = request.anthropic_key or os.environ.get("ANTHROPIC_API_KEY")
    elevenlabs_key = request.elevenlabs_key or os.environ.get("ELEVENLABS_API_KEY")
    voice_id = request.voice_id or os.environ.get("VOICE_ID") or "x7tNCivOKFAydss7fglA"
    
    # Resolve Model (request body > default Haiku)
    model = request.model or "claude-3-5-haiku-20241022"
    
    # Resolve ElevenLabs Model
    elevenlabs_model = request.elevenlabs_model or "eleven_multilingual_v2"
    
    # Resolve Anthropic Base URL (request body > environment variable > default official URL)
    anthropic_base = request.anthropic_base or os.environ.get("ANTHROPIC_BASE_URL") or "https://api.anthropic.com"
    anthropic_base = anthropic_base.rstrip("/")

    if not anthropic_key:
        raise HTTPException(status_code=400, detail="Missing Anthropic API Key. Please provide it in settings.")
    if not elevenlabs_key:
        raise HTTPException(status_code=400, detail="Missing ElevenLabs API Key. Please provide it in settings.")



    is_ohmygpt = any(domain in anthropic_base for domain in ["ohmygpt", "ohmycdn", "opapi.win", "hash070.com"])
    is_claude = model.startswith("claude-")
    
    use_native_anthropic = False
    final_base = anthropic_base
    
    if "api.anthropic.com" in anthropic_base:
        use_native_anthropic = True
    elif is_ohmygpt and is_claude:
        # OhMyGPT requires cc-omg endpoint with Native Anthropic protocol for Claude models
        from urllib.parse import urlparse
        parsed = urlparse(anthropic_base)
        final_base = f"{parsed.scheme}://{parsed.netloc}/api/v1/ai/openai/cc-omg"
        use_native_anthropic = True
    elif "cc-omg" in anthropic_base:
        use_native_anthropic = True
    
    # Build the voice assistant system instruction
    system_instruction = "You are a helpful voice assistant. Keep your responses concise (no more than 3 sentences) as they will be read out loud."
    
    translate_enabled = request.translate_enabled or False
    translate_target = request.translate_target or "Chinese"
    
    lang_map = {
        "Chinese": "Simplified Chinese",
        "English": "English",
        "Japanese": "Japanese",
        "Korean": "Korean",
        "French": "French",
        "German": "German",
        "Spanish": "Spanish",
        "Italian": "Italian",
        "Russian": "Russian"
    }
    target_lang_name = lang_map.get(translate_target, "Simplified Chinese")
    
    if request.response_language and request.response_language != "auto":
        system_instruction += f" You MUST respond ONLY in {request.response_language}."
        if translate_enabled:
            system_instruction += f" Additionally, you MUST translate each sentence of your response into {target_lang_name}. Format your response strictly by appending the translation inside a '<translation>...</translation>' block directly after each sentence in {request.response_language}. Example: Sentence in {request.response_language} <translation>Translation in {target_lang_name}</translation> (If a sentence is already in {target_lang_name}, do NOT output a <translation> tag for it.)"
    else:
        if translate_enabled:
            system_instruction += f" Additionally, you MUST translate each sentence of your response into {target_lang_name}. Format your response strictly by appending the translation inside a '<translation>...</translation>' block directly after each sentence. Example: Sentence in spoken language <translation>Translation in {target_lang_name}</translation> (If a sentence is already in {target_lang_name}, do NOT output a <translation> tag for it.)"

    # Format messages payload
    messages_payload = []
    for msg in request.history:
        messages_payload.append({
            "role": msg.role,
            "content": msg.content
        })
    messages_payload.append({
        "role": "user",
        "content": request.message
    })

    reply_text = None

    if use_native_anthropic:
        # MODE A: Native Anthropic Protocol
        claude_url = f"{final_base}/v1/messages"
        claude_headers = {
            "x-api-key": anthropic_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        claude_payload = {
            "model": model,
            "max_tokens": 1024,
            "messages": messages_payload,
            "system": system_instruction
        }
        try:
            response = requests.post(claude_url, json=claude_payload, headers=claude_headers, timeout=30)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Anthropic API Error ({response.status_code}): {response.text}"
                )
            reply_text = response.json()["content"][0]["text"]
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Failed to connect to Anthropic API: {str(e)}")
    else:
        # MODE B: OpenAI-Compatible Proxy Protocol (highly stable for OhMyGPT / API2D)
        # Ensure the path points to v1/chat/completions
        base_url = final_base
        if not base_url.endswith("/v1"):
            base_url = f"{base_url}/v1"
        
        # Prepend OpenAI system instruction
        messages_payload.insert(0, {
            "role": "system",
            "content": system_instruction
        })
        
        proxy_url = f"{base_url}/chat/completions"
        proxy_headers = {
            "Authorization": f"Bearer {anthropic_key}",
            "Content-Type": "application/json"
        }
        proxy_payload = {
            "model": model,
            "messages": messages_payload,
            "max_tokens": 1024
        }
        try:
            response = requests.post(proxy_url, json=proxy_payload, headers=proxy_headers, timeout=30)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Proxy API Error ({response.status_code}): {response.text}"
                )
            reply_text = response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(status_code=500, detail=f"Failed to connect to Proxy API: {str(e)}")

    # Clean text for TTS synthesis (strip <translation>...</translation> blocks)
    clean_tts_text = re.sub(r'<translation>.*?</translation>', '', reply_text, flags=re.DOTALL | re.IGNORECASE)
    clean_tts_text = re.sub(r'\s+', ' ', clean_tts_text).strip()

    # 3. Call ElevenLabs TTS API (Graceful degradation if this fails)
    audio_data_uri = None
    tts_error = None

    tts_url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    tts_headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": elevenlabs_key
    }
    tts_payload = {
        "text": clean_tts_text,
        "model_id": elevenlabs_model,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }

    try:
        tts_response = requests.post(tts_url, json=tts_payload, headers=tts_headers, timeout=20)
        if tts_response.status_code == 200:
            # Convert bytes to Base64 data URI
            audio_base64 = base64.b64encode(tts_response.content).decode("utf-8")
            audio_data_uri = f"data:audio/mpeg;base64,{audio_base64}"
        else:
            tts_error = f"ElevenLabs API Error ({tts_response.status_code}): {tts_response.text}"
            print(f"TTS Error: {tts_error}")
    except Exception as e:
        tts_error = f"Failed to connect to ElevenLabs API: {str(e)}"
        print(f"TTS Error connection exception: {tts_error}")

    return {
        "text": reply_text,
        "audio": audio_data_uri,
        "error": tts_error
    }

if __name__ == "__main__":
    print("Starting FastAPI Voice Server...")
    uvicorn.run("web_app:app", host="0.0.0.0", port=8000, reload=True)
