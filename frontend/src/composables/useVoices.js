import { ref, onMounted } from 'vue'

export function useVoices() {
  const customVoices = ref([])
  const newVoiceName = ref('')
  const newVoiceId = ref('')

  const loadCustomVoices = () => {
    try {
      const stored = localStorage.getItem('custom_voices')
      if (stored) {
        customVoices.value = JSON.parse(stored)
      }
    } catch (err) {
      console.error(err)
      customVoices.value = []
    }
  }

  const saveCustomVoices = () => {
    localStorage.setItem('custom_voices', JSON.stringify(customVoices.value))
    // Trigger syncSaveToServer if needed
  }

  const addVoice = () => {
    const name = newVoiceName.value.trim()
    const id = newVoiceId.value.trim()
    if (!name || !id) return
    
    // Check duplicate
    if (customVoices.value.some(v => v.id === id || v.name === name)) {
      alert('名称或 Voice ID 已存在')
      return
    }

    customVoices.value.push({ name, id })
    saveCustomVoices()
    newVoiceName.value = ''
    newVoiceId.value = ''
  }

  const deleteVoice = (id) => {
    customVoices.value = customVoices.value.filter(v => v.id !== id)
    saveCustomVoices()
  }

  onMounted(() => {
    loadCustomVoices()
  })

  return {
    customVoices,
    newVoiceName,
    newVoiceId,
    addVoice,
    deleteVoice,
    loadCustomVoices
  }
}
