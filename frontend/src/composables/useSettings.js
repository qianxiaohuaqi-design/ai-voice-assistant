import { ref, onMounted } from 'vue'

const isSettingsModalOpen = ref(false)

export function useSettings() {
  const anthropicKey = ref('')
  const anthropicBase = ref('https://api.anthropic.com')
  const chatModel = ref('deepseek-chat')
  const responseLanguage = ref('auto')
  const elevenlabsKey = ref('')
  const voiceId = ref('x7tNCivOKFAydss7fglA')
  const elevenlabsModel = ref('eleven_multilingual_v2')
  const translateEnable = ref(false)
  const translateTarget = ref('en')
  const ttsMode = ref('elevenlabs')
  const edgeVoice = ref('zh-CN-XiaoxiaoNeural')
  const orbFontSize = ref(18)

  const loadSettings = () => {
    anthropicKey.value = localStorage.getItem('anthropic_key') || ''
    anthropicBase.value = localStorage.getItem('anthropic_base') || 'https://api.anthropic.com'
    chatModel.value = localStorage.getItem('chat_model') || 'deepseek-chat'
    responseLanguage.value = localStorage.getItem('response_language') || 'auto'
    elevenlabsKey.value = localStorage.getItem('elevenlabs_key') || ''
    voiceId.value = localStorage.getItem('voice_id') || 'x7tNCivOKFAydss7fglA'
    elevenlabsModel.value = localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2'
    translateEnable.value = localStorage.getItem('translate_enable') === 'true'
    translateTarget.value = localStorage.getItem('translate_target') || 'en'
    ttsMode.value = localStorage.getItem('tts_mode') || 'elevenlabs'
    edgeVoice.value = localStorage.getItem('edge_voice') || 'zh-CN-XiaoxiaoNeural'
    orbFontSize.value = parseInt(localStorage.getItem('orb_font_size')) || 18
  }

  const saveSettings = () => {
    localStorage.setItem('anthropic_key', anthropicKey.value)
    localStorage.setItem('anthropic_base', anthropicBase.value)
    localStorage.setItem('chat_model', chatModel.value)
    localStorage.setItem('response_language', responseLanguage.value)
    localStorage.setItem('elevenlabs_key', elevenlabsKey.value)
    localStorage.setItem('voice_id', voiceId.value)
    localStorage.setItem('elevenlabs_model', elevenlabsModel.value)
    localStorage.setItem('translate_enable', translateEnable.value)
    localStorage.setItem('translate_target', translateTarget.value)
    localStorage.setItem('tts_mode', ttsMode.value)
    localStorage.setItem('edge_voice', edgeVoice.value)
    localStorage.setItem('orb_font_size', orbFontSize.value)
    // NOTE: Call syncSaveToServer here if logged in
  }

  onMounted(() => {
    loadSettings()
  })

  return {
    isSettingsModalOpen,
    anthropicKey,
    anthropicBase,
    chatModel,
    responseLanguage,
    elevenlabsKey,
    voiceId,
    elevenlabsModel,
    translateEnable,
    translateTarget,
    ttsMode,
    edgeVoice,
    orbFontSize,
    loadSettings,
    saveSettings
  }
}
