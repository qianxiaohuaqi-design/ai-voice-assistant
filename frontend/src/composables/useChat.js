import { ref } from 'vue'

const isOrbMode = ref(false)
const sessions = ref([])
const activeSessionId = ref(null)
const chatHistory = ref([])

export function useChat() {
  const saveSessions = () => {
    const activeSession = sessions.value.find(s => s.id === activeSessionId.value)
    if (activeSession) {
      activeSession.messages = [...chatHistory.value]
    }
    localStorage.setItem('chat_sessions', JSON.stringify(sessions.value))
    localStorage.setItem('active_session_id', activeSessionId.value)
    // Note: in a full implementation, we trigger syncSaveToServer here
  }

  const createNewSession = () => {
    if (activeSessionId.value) {
      const currentActive = sessions.value.find(s => s.id === activeSessionId.value)
      if (currentActive) {
        currentActive.messages = [...chatHistory.value]
      }
    }

    const newId = 'session_' + Date.now()
    const newSession = {
      id: newId,
      title: '新对话',
      messages: []
    }
    
    sessions.value.unshift(newSession)
    activeSessionId.value = newId
    chatHistory.value = []
    saveSessions()
  }

  const selectSession = (id) => {
    if (id === activeSessionId.value) return
    
    // Save current
    const currentActive = sessions.value.find(s => s.id === activeSessionId.value)
    if (currentActive) {
      currentActive.messages = [...chatHistory.value]
    }
    
    // Load new
    activeSessionId.value = id
    const newSession = sessions.value.find(s => s.id === id)
    if (newSession) {
      chatHistory.value = [...(newSession.messages || [])]
    }
    saveSessions()
  }

  const deleteSession = (id) => {
    sessions.value = sessions.value.filter(s => s.id !== id)
    if (sessions.value.length === 0) {
      createNewSession()
    } else if (activeSessionId.value === id) {
      selectSession(sessions.value[0].id)
    } else {
      saveSessions()
    }
  }

  const renameSession = (id, newTitle) => {
    const session = sessions.value.find(s => s.id === id)
    if (session) {
      session.title = newTitle
      saveSessions()
    }
  }

  const sendMessage = async (text, settings, authToken) => {
    if (!text.trim()) return

    chatHistory.value.push({ role: 'user', content: text, id: 'user-' + Date.now() })
    const aiMessageId = 'ai-msg-' + Date.now()
    chatHistory.value.push({ role: 'assistant', content: 'Thinking...', id: aiMessageId })
    saveSessions()

    const {
      anthropicKey, anthropicBase, chatModel, ttsMode, elevenlabsKey,
      voiceId, responseLanguage, elevenlabsModel, translateEnable,
      translateTarget, edgeVoice, isMuted
    } = settings

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: text,
          history: chatHistory.value.slice(0, -1).slice(-10).map(msg => ({role: msg.role, content: msg.content})),
          model: chatModel,
          anthropic_key: anthropicKey,
          anthropic_base: anthropicBase,
          elevenlabs_key: elevenlabsKey,
          voice_id: voiceId,
          response_language: responseLanguage,
          elevenlabs_model: elevenlabsModel,
          translate_enabled: translateEnable,
          translate_target: translateTarget,
          tts_enabled: !isMuted,
          tts_mode: ttsMode,
          edge_voice: edgeVoice
        })
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.detail || '接口请求失败')
      }

      const data = await response.json()
      
      const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
      if (msgIndex !== -1) {
        chatHistory.value[msgIndex].content = data.text
        chatHistory.value[msgIndex].audio = data.audio // Save audio data if any
      }
      
      saveSessions()
      
      return data // Returns { text, audio, error }
    } catch (err) {
      console.error(err)
      const msgIndex = chatHistory.value.findIndex(m => m.id === aiMessageId)
      if (msgIndex !== -1) {
        chatHistory.value[msgIndex].content = `❌ **错误**：${err.message || '请求处理失败。'}`
      }
      saveSessions()
      throw err
    }
  }

  return {
    isOrbMode,
    sessions,
    activeSessionId,
    chatHistory,
    createNewSession,
    selectSession,
    deleteSession,
    renameSession,
    saveSessions,
    sendMessage
  }
}
