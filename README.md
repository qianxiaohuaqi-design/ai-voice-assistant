# AI 语音助手 (AI Voice Assistant)

一款现代化的全栈 AI 语音助手应用，由 Anthropic Claude 大模型提供智能对话能力，并搭载双通道文字转语音 (TTS) 引擎，为您带来极致的语音交互体验。

## ✨ 核心特性

- **智能对话**：接入 Anthropic Claude API，提供具有深度、上下文连贯且高质量的智能回复。
- **双路 TTS 引擎**：
  - **ElevenLabs**：提供超高保真、极其逼真的沉浸式语音生成（需配置 API Key）。
  - **Edge-TTS**：内置免费、免秘钥的高质量微软语音合成。
- **现代用户界面**：基于 Vue 3 构建，响应式设计，自带侧边栏历史会话管理，以及可自定义的深浅色主题。
- **用户认证系统**：采用基于 JWT 的安全登录体系，实现跨设备无缝同步用户配置、API Key 及聊天记录。
- **会话管理功能**：支持自动保存、读取以及置顶重要聊天会话。
- **高度可定制化**：用户可以自由切换聊天模型（如 Haiku 或 Sonnet）、回复语言、TTS 声音、翻译偏好等。
- **灵活的数据库支持**：开发环境默认支持 SQLite 开箱即用，生产环境则可无缝切换至 PostgreSQL。

## 🚀 云端部署

👉 **[在线体验 / Live Demo](https://ai-voice-assistant-7grc.onrender.com)**

## 🛠 技术栈

- **后端**: FastAPI, Python 3.10, SQLAlchemy, PyJWT, Edge-TTS
- **前端**: Vue 3 
- **数据库**: SQLite / PostgreSQL
- **部署发布**: 支持 Docker 容器化

## 💻 本地开发指南

### 1. 克隆代码仓库
```bash
git clone https://github.com/qianxiaohuaqi-design/ai-voice-assistant.git
cd ai-voice-assistant
```

### 2. 安装后端依赖
请确保您的设备上已安装 Python 3.10+。
```bash
pip install -r requirements.txt
```

### 3. 构建前端
您需要构建 Vue 3 前端项目。后端服务会自动读取 `frontend/dist` 目录下的编译产物。
*(进入 `frontend/` 目录执行 `npm install` 与 `npm run build` 以完成构建)*

### 4. 启动后端服务
```bash
uvicorn web_app:app --host 127.0.0.1 --port 8000 --reload
```
服务启动后，可在浏览器中访问 `http://127.0.0.1:8000`。

## 🐳 Docker 部署

项目根目录已提供 `Dockerfile`，支持一键容器化部署。

```bash
docker build -t ai-voice-assistant .
docker run -d -p 8000:8000 --name voice_assistant ai-voice-assistant
```

## 🔒 环境变量配置 (可选)

您可以在部署时配置以下环境变量以启用高级功能：
- `DATABASE_URL`: PostgreSQL 数据库连接字符串（如 `postgresql://user:password@host:port/dbname`）。如不提供，则默认使用本地 SQLite。
- `JWT_SECRET`: 用于 JWT 签名的密钥。
- `ANTHROPIC_API_KEY`: 全局 Claude API Key（用户也可以在 UI 中输入自己的 Key）。
- `ELEVENLABS_API_KEY`: 全局 ElevenLabs API Key。
- `ANTHROPIC_BASE_URL`: 用于配置自定义代理的 Anthropic API 接口地址。

## 📄 开源协议
MIT License
