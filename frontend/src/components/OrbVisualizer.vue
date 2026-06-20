<template>
  <div class="orb-wrapper" id="orb-wrapper" style="display: flex;">
    <!-- HUD Corner Brackets -->
    <div class="hud-corner top-left" style="display: block;"></div>
    <div class="hud-corner top-right" style="display: block;"></div>
    <div class="hud-corner bottom-left" style="display: block;"></div>
    <div class="hud-corner bottom-right" style="display: block;"></div>

    <!-- Monospace Technical Status Bar -->
    <div class="orb-tech-header" id="orb-tech-header">
      <div class="tech-header-left">
        <div>ai model · <span id="tech-model-val">{{ settings.chatModel.value }}</span></div>
        <div>voice model · <span id="tech-voice-model-val">{{ voiceModelDisplay }}</span></div>
      </div>
    </div>

    <!-- Orbiting rings container -->
    <div class="orb-visualizer-container">
      <div class="orb-ring ring-1" id="orb-ring-1"></div>
      <div class="orb-ring ring-2" id="orb-ring-2"></div>
      <div class="orb-ring ring-3" id="orb-ring-3"></div>
      <div class="orb-ring ring-4" id="orb-ring-4"></div>
      
      <!-- Voice Orb Container -->
      <div class="voice-orb-container" id="voice-orb-container" :class="{ 'speaking': isSpeaking }">
        <!-- The Central Voice Orb -->
        <div class="voice-orb" id="voice-orb">
          <div class="voice-orb-noise"></div>
          <div class="orb-inner-core"></div>
          <div class="orb-particle orb-p1"></div>
          <div class="orb-particle orb-p2"></div>
        </div>
      </div>
    </div>
    
    <div class="orb-subtitle-container" :style="{ fontSize: settings.orbFontSize.value + 'px' }">
      <p id="orb-subtitle" v-html="subtitleHtml"></p>
    </div>

    <div class="orb-tech-footer">
      <span class="status-dot" :class="statusClass"></span>
      <span>{{ currentStatus }}</span>
      <span class="separator" v-show="currentStatus === 'thinking'">·</span>
      <span v-show="currentStatus === 'thinking'">thinking time: {{ thinkingTime }}s</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useChat } from '../composables/useChat'

const settings = useSettings()
const { isOrbMode } = useChat()

const isSpeaking = ref(false)
const currentStatus = ref('idle')
const thinkingTime = ref('00')
const subtitleHtml = ref('')

let thinkInterval = null

const voiceModelDisplay = computed(() => {
  if (settings.ttsMode.value === 'edge') {
    return `edge-tts (${settings.edgeVoice.value.split('-').pop()})`
  }
  return settings.elevenlabsModel.value
})

const statusClass = computed(() => {
  return {
    'speaking': currentStatus.value === 'speaking',
    'recording': currentStatus.value === 'recording',
    'thinking': currentStatus.value === 'thinking'
  }
})

// TODO: Listen to global events for speaking, thinking, recording state from ChatArea
// In a real implementation, we'd extract these to a store or global ref

</script>

<style scoped>
/* Scoped styles are kept minimal, relying on global CSS for orb animation */
</style>