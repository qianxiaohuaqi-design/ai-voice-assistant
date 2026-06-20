<template>
  <div class="chat-container">
    <div id="chat-window" class="chat-window" ref="chatWindowRef">
      <div v-if="chatHistory.length === 0" class="message-row ai">
        <div class="bubble">
          <p>👋 你好！我是你的专属智能语音助手。</p>
          <p>在开始前，请点击左下角侧边栏的 <strong>“系统设置”</strong> 按钮配置您的 API Key。点击右上角的喇叭图标，可以一键开启或关闭 <strong>“纯文字模式”</strong> 节省语音额度哦！</p>
        </div>
      </div>
      
      <div v-for="msg in chatHistory" :key="msg.id" :class="['message-row', msg.role === 'assistant' ? 'ai' : 'user']" :id="msg.id">
        <div class="bubble" v-html="formatMessage(msg.content, msg.role)"></div>
        <!-- Audio play button if msg.audio exists (to be implemented) -->
        <div v-if="msg.role === 'assistant' && msg.audio" class="audio-controls" style="margin-top: 8px;">
          <button class="icon-btn" @click="playAudio(msg.audio)" title="播放语音">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div class="input-area">
      <div class="input-container">
        <textarea 
          id="chat-input" 
          class="chat-input" 
          v-model="inputText" 
          @keydown.enter.exact.prevent="sendMsg" 
          placeholder="输入消息，或点击麦克风说话..." 
          rows="1" 
          ref="inputRef"
          @input="autoResize"
        ></textarea>
        
        <div class="input-actions-row" style="display:flex; justify-content:space-between; width:100%; align-items:center; margin-top:8px;">
          <div class="actions-left">
            <select class="form-input" v-model="settings.chatModel.value" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.88rem; padding: 4px 8px; border-radius: 8px;">
              <optgroup label="DeepSeek 系列">
                <option value="deepseek-chat">DeepSeek Chat</option>
                <option value="deepseek-reasoner">DeepSeek Reasoner</option>
              </optgroup>
              <optgroup label="OpenAI GPT 系列">
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="o3-mini">o3-mini</option>
                <option value="gpt-4o">GPT-4o</option>
              </optgroup>
              <optgroup label="AI 大模型系列">
                <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              </optgroup>
              <optgroup label="Google Gemini 系列">
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </optgroup>
              <optgroup label="xAI Grok 系列">
                <option value="grok-4.20-0309-non-reasoning">Grok 4.2 Fast</option>
                <option value="grok-4.20-0309-reasoning">Grok 4.2 Reasoning</option>
              </optgroup>
            </select>
          </div>
          <div class="actions-right" style="display:flex; gap:8px;">
            <button class="icon-btn" id="mic-btn" @click="toggleMic" :class="{ recording: isRecording }" title="语音输入">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
              </svg>
            </button>
            <button class="icon-btn send-btn" id="send-btn" @click="sendMsg" :class="{ 'stop-state': isGenerating }" :title="isGenerating ? '终止' : '发送'">
              <svg v-if="!isGenerating" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import { useChat } from '../composables/useChat'
import { useSettings } from '../composables/useSettings'
import { useAuth } from '../composables/useAuth'

const { chatHistory, sendMessage } = useChat()
const settings = useSettings()
const { token } = useAuth()

const inputText = ref('')
const isRecording = ref(false)
const isGenerating = ref(false)
const inputRef = ref(null)
const chatWindowRef = ref(null)

// Audio elements
const currentAudio = new Audio()

const autoResize = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = inputRef.value.scrollHeight + 'px'
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatWindowRef.value) {
      chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
    }
  })
}

watch(() => chatHistory.value.length, scrollToBottom)

const sendMsg = async () => {
  if (isGenerating.value) {
    // Implement abort logic here
    return
  }
  
  if (!inputText.value.trim()) return

  const text = inputText.value
  inputText.value = ''
  autoResize()
  isGenerating.value = true
  
  try {
    const data = await sendMessage(text, settings, token.value)
    if (data && data.audio && !settings.isMuted.value) {
      playAudio(data.audio)
    }
  } catch (err) {
    console.error(err)
  } finally {
    isGenerating.value = false
    scrollToBottom()
  }
}

const playAudio = (base64Audio) => {
  currentAudio.src = 'data:audio/mp3;base64,' + base64Audio
  currentAudio.play()
}

// Markdown formatting logic
const formatMessage = (text, role) => {
  if (role === 'user') return escapeHTML(text).replace(/\n/g, '<br>')
  if (text === 'Thinking...') return '<em class="thinking-message">思考中...</em>'
  
  const markedApi = window.marked
  const parseMarkdown = markedApi && (markedApi.parse || markedApi.marked)
  
  if (!parseMarkdown || !window.DOMPurify) {
    return escapeHTML(text).replace(/\n/g, '<br>')
  }
  
  // Set options securely
  markedApi.setOptions({
    gfm: true,
    breaks: true
  })
  
  // Translate tags logic
  const translations = []
  const translationPrefix = `TRANSLATIONPLACEHOLDER${Date.now()}X`
  let processed = text.replace(/<translation>(.*?)<\/translation>/gs, (_, translation) => {
    const placeholder = `${translationPrefix}${translations.length}Y`
    translations.push({
      placeholder,
      html: `<span class="translation-line">${escapeHTML(translation)}</span>`
    })
    return placeholder
  })
  
  const html = parseMarkdown(processed)
  let sanitized = window.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'a', 'span', 'h1', 'h2', 'h3', 'h4',
      'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['href', 'title', 'class']
  })
  
  translations.forEach(({ placeholder, html }) => {
    sanitized = sanitized.replaceAll(placeholder, html)
  })
  
  return sanitized
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  )
}

// Web Speech API Voice-to-Text Input
let recognition = null
const toggleMic = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('此浏览器不支持 Web Speech API，无法进行语音转文字输入');
    return;
  }
  
  if (!recognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      isRecording.value = true;
    };
    recognition.onerror = (e) => {
      console.error(e);
      isRecording.value = false;
    };
    recognition.onend = () => {
      isRecording.value = false;
    };
    recognition.onresult = (e) => {
      inputText.value = e.results[0][0].transcript;
      autoResize();
    };
  }
  
  if (isRecording.value) {
    recognition.stop();
  } else {
    recognition.start();
  }
}

onMounted(() => {
  scrollToBottom()
})
</script>
