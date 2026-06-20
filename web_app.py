import os
import base64
import requests
import uvicorn
import re
import uuid
import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import SessionLocal, init_db, User, ChatSession, hash_password, verify_password

# Initialize Database Schema
init_db()

# DB Session Dependency Injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", "super-secret-voice-assistant-token")
JWT_ALGORITHM = "HS256"

def create_jwt_token(username: str) -> str:
    payload = {
        "sub": username,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_user_from_token(token: str, db: Session) -> Optional[User]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get("sub")
        if not username:
            return None
        return db.query(User).filter(User.username == username).first()
    except Exception:
        return None

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
    tts_enabled: Optional[bool] = True
    tts_mode: Optional[str] = "elevenlabs"
    edge_voice: Optional[str] = "zh-CN-XiaoxiaoNeural"


# Ensure the dist directory exists for the frontend files
os.makedirs("frontend/dist", exist_ok=True)

# Optionally mount the Vue static frontend assets
if os.path.isdir("frontend/dist/assets"):
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

# Mount the older static files to the /old path
app.mount("/old", StaticFiles(directory="static", html=True), name="old_static")

@app.get("/")
def serve_index():
    if os.path.isfile("frontend/dist/index.html"):
        with open("frontend/dist/index.html", "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    else:
        # Fallback to the old version
        return RedirectResponse(url="/old/")

@app.get("/api/config")
def get_config_endpoint():
    """Returns whether the server has API keys configured in environment variables."""
    return {
        "has_anthropic_key": bool(os.environ.get("ANTHROPIC_API_KEY")),
        "has_elevenlabs_key": bool(os.environ.get("ELEVENLABS_API_KEY")),
        "default_anthropic_base": os.environ.get("ANTHROPIC_BASE_URL", "")
    }

# New schemas for authentication & sync
class UserAuthPayload(BaseModel):
    username: str
    password: str

class SessionSyncItem(BaseModel):
    id: str
    title: str
    messages: str  # JSON array as string
    is_pinned: Optional[bool] = False

class SyncPayload(BaseModel):
    anthropic_key: Optional[str] = None
    anthropic_base: Optional[str] = None
    elevenlabs_key: Optional[str] = None
    voice_id: Optional[str] = None
    chat_model: Optional[str] = None
    response_language: Optional[str] = None
    elevenlabs_model: Optional[str] = None
    translate_enabled: Optional[bool] = False
    translate_target: Optional[str] = None
    ui_theme: Optional[str] = None
    is_muted: Optional[bool] = False
    tts_mode: Optional[str] = "elevenlabs"
    edge_voice: Optional[str] = "zh-CN-XiaoxiaoNeural"
    custom_voices: Optional[str] = "[]"
    sessions: List[SessionSyncItem] = []

@app.post("/api/register")
def register_user(req: UserAuthPayload, db: Session = Depends(get_db)):
    username = req.username.strip()
    password = req.password
    if not username or not password:
        raise HTTPException(status_code=400, detail="用户名和密码不能为空")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="密码长度必须至少为6位")
        
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        raise HTTPException(status_code=400, detail="该用户名已被注册")
        
    new_user = User(
        username=username,
        password_hash=hash_password(password)
    )
    db.add(new_user)
    db.commit()
    
    token = create_jwt_token(username)
    return {"status": "success", "token": token}

@app.post("/api/login")
def login_user(req: UserAuthPayload, db: Session = Depends(get_db)):
    username = req.username.strip()
    password = req.password
    
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(user.password_hash, password):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
        
    token = create_jwt_token(username)
    return {"status": "success", "token": token}

@app.get("/api/user/sync")
def sync_load(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.updated_at.desc()).all()
    sessions_data = []
    for s in sessions:
        sessions_data.append({
            "id": s.id,
            "title": s.title,
            "messages": s.messages,
            "is_pinned": s.is_pinned
        })
        
    return {
        "anthropic_key": user.anthropic_key or "",
        "anthropic_base": user.anthropic_base or "",
        "elevenlabs_key": user.elevenlabs_key or "",
        "voice_id": user.voice_id or "x7tNCivOKFAydss7fglA",
        "chat_model": user.chat_model or "deepseek-chat",
        "response_language": user.response_language or "auto",
        "elevenlabs_model": user.elevenlabs_model or "eleven_multilingual_v2",
        "translate_enabled": user.translate_enabled or False,
        "translate_target": user.translate_target or "Chinese",
        "ui_theme": user.ui_theme or "dark",
        "is_muted": user.is_muted or False,
        "tts_mode": user.tts_mode or "elevenlabs",
        "edge_voice": user.edge_voice or "zh-CN-XiaoxiaoNeural",
        "custom_voices": user.custom_voices or "[]",
        "sessions": sessions_data
    }

@app.post("/api/user/sync")
def sync_save(req: SyncPayload, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    # Update settings
    user.anthropic_key = req.anthropic_key
    user.anthropic_base = req.anthropic_base
    user.elevenlabs_key = req.elevenlabs_key
    user.voice_id = req.voice_id
    user.chat_model = req.chat_model
    user.response_language = req.response_language
    user.elevenlabs_model = req.elevenlabs_model
    user.translate_enabled = req.translate_enabled
    user.translate_target = req.translate_target
    user.ui_theme = req.ui_theme
    user.is_muted = req.is_muted
    user.tts_mode = req.tts_mode or "elevenlabs"
    user.edge_voice = req.edge_voice or "zh-CN-XiaoxiaoNeural"
    user.custom_voices = req.custom_voices or "[]"
    
    # Update sessions (insert/update/delete)
    existing_sessions = db.query(ChatSession).filter(ChatSession.user_id == user.id).all()
    existing_session_ids = {s.id for s in existing_sessions}
    
    incoming_ids = set()
    for s_item in req.sessions:
        incoming_ids.add(s_item.id)
        if s_item.id in existing_session_ids:
            db_sess = db.query(ChatSession).filter(ChatSession.id == s_item.id, ChatSession.user_id == user.id).first()
            if db_sess:
                db_sess.title = s_item.title
                db_sess.messages = s_item.messages
                db_sess.is_pinned = s_item.is_pinned
                db_sess.updated_at = datetime.utcnow()
        else:
            new_sess = ChatSession(
                id=s_item.id,
                user_id=user.id,
                title=s_item.title,
                messages=s_item.messages,
                is_pinned=s_item.is_pinned
            )
            db.add(new_sess)
            
    for s_db in existing_sessions:
        if s_db.id not in incoming_ids:
            db.delete(s_db)
            
    db.commit()
    return {"status": "success"}

@app.get("/api/models")
async def get_models(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    user = get_user_from_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    anthropic_key = user.anthropic_key or os.environ.get("ANTHROPIC_API_KEY")
    anthropic_base = user.anthropic_base or os.environ.get("ANTHROPIC_BASE_URL") or ""
    anthropic_base = anthropic_base.rstrip("/")

    if not anthropic_key:
        return {"data": [{"id": "deepseek-chat"}, {"id": "claude-3-5-sonnet-20241022"}]}

    try:
        if not anthropic_base:
            return {"data": [{"id": "deepseek-chat"}, {"id": "deepseek-reasoner"}, {"id": "claude-3-5-sonnet-20241022"}, {"id": "claude-3-5-haiku-20241022"}, {"id": "gpt-4o"}, {"id": "grok-beta"}]}
        elif "api.deepseek.com" in anthropic_base:
            return {"data": [{"id": "deepseek-chat"}, {"id": "deepseek-reasoner"}]}
        elif "api.anthropic.com" in anthropic_base:
            return {"data": [{"id": "claude-3-5-sonnet-20241022"}, {"id": "claude-3-5-haiku-20241022"}]}
        elif "api.openai.com" in anthropic_base:
            return {"data": [{"id": "gpt-4o"}, {"id": "gpt-4o-mini"}]}
        
        headers = {"Authorization": f"Bearer {anthropic_key}", "Content-Type": "application/json"}
        resp = requests.get(f"{anthropic_base}/v1/models", headers=headers, timeout=5)
        if resp.ok:
            return resp.json()
        else:
            return {"data": [{"id": "deepseek-chat"}, {"id": "deepseek-reasoner"}, {"id": "claude-3-5-sonnet-20241022"}, {"id": "gpt-4o"}]}
    except Exception:
        return {"data": [{"id": "deepseek-chat"}, {"id": "deepseek-reasoner"}, {"id": "claude-3-5-sonnet-20241022"}, {"id": "gpt-4o"}]}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Orchestrates the API calls with Dual-Mode Routing:
    - Native Anthropic protocol if using official endpoints.
    - OpenAI-compatible protocol if using custom proxies (like OhMyGPT or API2D).
    """
    user = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        user = get_user_from_token(token, db)
        
    if not user:
        raise HTTPException(status_code=401, detail="请先登录您的账号！")

    # 1. Resolve API Keys (request body > user settings > environment variables)
    anthropic_key = request.anthropic_key or user.anthropic_key or os.environ.get("ANTHROPIC_API_KEY")
    elevenlabs_key = request.elevenlabs_key or user.elevenlabs_key or os.environ.get("ELEVENLABS_API_KEY")
    voice_id = request.voice_id or user.voice_id or os.environ.get("VOICE_ID") or "x7tNCivOKFAydss7fglA"
    
    # Resolve Model (request body > user settings > default Haiku)
    model = request.model or user.chat_model or "deepseek-chat"
    
    # Resolve ElevenLabs Model (request body > user settings > default)
    elevenlabs_model = request.elevenlabs_model or user.elevenlabs_model or "eleven_multilingual_v2"
    
    # Resolve Anthropic Base URL (request body > user settings > environment variable)
    anthropic_base = request.anthropic_base or user.anthropic_base or os.environ.get("ANTHROPIC_BASE_URL") or ""
    anthropic_base = anthropic_base.rstrip("/")
    if not anthropic_base:
        if model.startswith("claude-"):
            anthropic_base = "https://api.anthropic.com"
        elif model.startswith("deepseek-"):
            anthropic_base = "https://api.deepseek.com"
        elif model.startswith("gpt-") or model.startswith("o1-") or model.startswith("o3-"):
            anthropic_base = "https://api.openai.com"
        elif model.startswith("grok-"):
            anthropic_base = "https://api.x.ai"
        elif model.startswith("gemini-"):
            anthropic_base = "https://generativelanguage.googleapis.com/v1beta/openai"
        else:
            anthropic_base = "https://api.anthropic.com"

    # Resolve TTS enabled state
    tts_enabled = request.tts_enabled if request.tts_enabled is not None else True
    tts_mode = request.tts_mode or user.tts_mode or "elevenlabs"
    edge_voice = request.edge_voice or user.edge_voice or "zh-CN-XiaoxiaoNeural"

    if not anthropic_key:
        raise HTTPException(status_code=400, detail="检测到未配置 AI 大模型 API Key。请先点击左下角【系统设置】进行配置。")
    if tts_enabled and tts_mode == "elevenlabs" and not elevenlabs_key:
        raise HTTPException(status_code=400, detail="检测到目前为 ElevenLabs 模式但未配置语音 Key。请先点击左下角【系统设置】进行配置，或切换为 Edge-TTS 免费模式。")



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
    system_instruction = "You are a helpful AI voice assistant."
    
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
            system_instruction += f"\nIMPORTANT: Even though you must respond in {request.response_language}, you are REQUIRED to provide a {target_lang_name} translation for every single sentence. This translation block DOES NOT violate the 'ONLY in {request.response_language}' rule. Format strictly: Append the translation inside a '<translation>' block directly after EACH sentence.\nExample: Hello, how are you? <translation>你好，你怎么样？</translation>\nIf your output sentence is ALREADY in {target_lang_name}, DO NOT output a <translation> tag for it."
    else:
        if translate_enabled:
            system_instruction += f"\nIMPORTANT: You must translate every single sentence of your response into {target_lang_name}.\nFormat strictly: Append the translation inside a '<translation>' block directly after EACH sentence.\nExample: Hello, how are you? <translation>你好，你怎么样？</translation>\nIf your output sentence is ALREADY in {target_lang_name}, DO NOT output a <translation> tag for it."

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

    # 3. Call TTS API (ElevenLabs or Edge-TTS)
    audio_data_uri = None
    tts_error = None

    if tts_enabled:
        if tts_mode == "edge":
            try:
                import edge_tts
                communicate = edge_tts.Communicate(clean_tts_text, edge_voice)
                audio_bytes = b""
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio":
                        audio_bytes += chunk["data"]
                if audio_bytes:
                    os.makedirs("static/audio", exist_ok=True)
                    audio_filename = f"{uuid.uuid4().hex}.mp3"
                    with open(f"static/audio/{audio_filename}", "wb") as f:
                        f.write(audio_bytes)
                    audio_data_uri = f"/old/audio/{audio_filename}"
                else:
                    tts_error = "Edge-TTS generated empty audio output."
            except Exception as e:
                tts_error = f"Failed to generate audio via Edge-TTS: {str(e)}"
                print(f"Edge-TTS Error: {tts_error}")
        elif elevenlabs_key:
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
                    os.makedirs("static/audio", exist_ok=True)
                    audio_filename = f"{uuid.uuid4().hex}.mp3"
                    with open(f"static/audio/{audio_filename}", "wb") as f:
                        f.write(tts_response.content)
                    audio_data_uri = f"/old/audio/{audio_filename}"
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
