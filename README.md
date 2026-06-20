# AI Voice Assistant

A modern, full-stack AI Voice Assistant application powered by Anthropic's Claude models and offering a dual Text-to-Speech (TTS) engine experience.

## ✨ Features

- **Intelligent Conversations**: Powered by Anthropic's Claude API for deep, contextual, and high-quality responses.
- **Dual TTS Engine**:
  - **ElevenLabs**: High-fidelity, ultra-realistic voice generation (requires API key).
  - **Edge-TTS**: Built-in, keyless, and free voice generation.
- **Modern User Interface**: Built with Vue 3, featuring a responsive design, chat history sidebar, and customizable dark/light themes.
- **User Authentication**: Secure JWT-based login system to sync user settings, API keys, and chat history across multiple devices.
- **Session Management**: Automatically save, retrieve, and pin important chat sessions.
- **Highly Customizable**: Users can configure their preferred chat model (e.g., Haiku vs. Sonnet), response language, voice selection, and translation settings.
- **Database Flexibility**: Supports both SQLite (for local development) and PostgreSQL (for production).

## 🚀 Cloud Deployment

👉 **[在线体验 / Live Demo](在此处替换为云端部署好的链接)**

## 🛠 Tech Stack

- **Backend**: FastAPI, Python 3.10, SQLAlchemy, PyJWT, Edge-TTS
- **Frontend**: Vue 3 
- **Database**: SQLite / PostgreSQL
- **Deployment**: Docker ready

## 💻 Local Development

### 1. Clone the repository
```bash
git clone https://github.com/qianxiaohuaqi-design/ai-voice-assistant.git
cd ai-voice-assistant
```

### 2. Install dependencies
Make sure you have Python 3.10+ installed.
```bash
pip install -r requirements.txt
```

### 3. Setup Frontend
You need to build the Vue 3 frontend project. The backend expects the compiled files to be in `frontend/dist`.
*(Please refer to the `frontend/` directory for `npm install` and `npm run build` instructions)*

### 4. Run the Backend Server
```bash
uvicorn web_app:app --host 127.0.0.1 --port 8000 --reload
```
Access the application at `http://127.0.0.1:8000`.

## 🐳 Docker Deployment

The project includes a `Dockerfile` for easy containerization.

```bash
docker build -t ai-voice-assistant .
docker run -d -p 8000:8000 --name voice_assistant ai-voice-assistant
```

## 🔒 Environment Variables (Optional)

You can configure the following environment variables for deployment:
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@host:port/dbname`). Defaults to local SQLite if not provided.
- `JWT_SECRET`: Secret key for JWT signature.
- `ANTHROPIC_API_KEY`: Global Claude API key (users can also provide their own in the UI).
- `ELEVENLABS_API_KEY`: Global ElevenLabs API key.
- `ANTHROPIC_BASE_URL`: Custom base URL for Anthropic API proxy.

## 📄 License
MIT License
