<template>
  <div class="voice-management-card" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 12px; margin-bottom: 18px;">
    <label class="form-label" style="margin-bottom: 8px;">声音库管理</label>
    
    <!-- List of current voices -->
    <div id="voice-list-container" style="max-height: 180px; overflow-y: auto; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
      <div v-for="v in customVoices" :key="v.id" style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:8px; border-radius:8px;">
        <div style="display:flex; flex-direction:column; gap:2px;">
          <span style="font-weight:600; font-size:0.85rem;">{{ v.name }}</span>
          <span style="font-size:0.75rem; color:var(--text-muted);">{{ v.id }}</span>
        </div>
        <button class="icon-btn" style="color:#ef4444;" @click="deleteVoice(v.id)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Add voice form -->
    <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px;">
      <div style="display: flex; gap: 8px;">
        <input type="text" class="form-input" v-model="newVoiceName" placeholder="声音名称 (例如: Chisaki)" style="flex: 1; padding: 8px 10px; font-size: 0.85rem;" @keyup.enter="addVoice">
        <input type="text" class="form-input" v-model="newVoiceId" placeholder="Voice ID (ElevenLabs ID)" style="flex: 1.2; padding: 8px 10px; font-size: 0.85rem;" @keyup.enter="addVoice">
      </div>
      <button type="button" class="save-btn" @click="addVoice" style="margin-top: 0; padding: 8px 12px; font-size: 0.85rem; border-radius: 8px; width: auto; align-self: flex-end;">添加新声音</button>
    </div>
  </div>
</template>

<script setup>
import { useVoices } from '../composables/useVoices'

const {
  customVoices,
  newVoiceName,
  newVoiceId,
  addVoice,
  deleteVoice
} = useVoices()
</script>