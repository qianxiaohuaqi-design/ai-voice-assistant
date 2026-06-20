<script setup>
import { onMounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import ChatArea from './components/ChatArea.vue'
import SettingsModal from './components/SettingsModal.vue'
import AuthModal from './components/AuthModal.vue'
import OrbVisualizer from './components/OrbVisualizer.vue'
import { useAuth } from './composables/useAuth'
import { useChat } from './composables/useChat'
import { useSettings } from './composables/useSettings'

const { checkLoginStatus, isAuthModalOpen } = useAuth()
const { isOrbMode } = useChat()
const { isMuted, saveSettings } = useSettings()

const toggleMute = () => {
  isMuted.value = !isMuted.value
  saveSettings()
}

onMounted(() => {
  checkLoginStatus()
})
</script>

<template>
  <div class="app-container" :class="{ 'light-theme': false }">
    <Sidebar />

    <div class="main-content">
      <header>
        <div class="brand">
          <button class="icon-btn" id="sidebar-toggle-btn" style="display: none; margin-right: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div class="brand-icon"></div>
          <div class="brand-title">AI语音助手</div>
        </div>
        
        <div class="header-actions">
          <button class="icon-btn" title="切换对话/星云模式" @click="isOrbMode = !isOrbMode">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"></path>
            </svg>
          </button>

          <button class="icon-btn" :class="{ muted: isMuted }" :title="isMuted ? '语音播报已关闭' : '语音播报模式'" @click="toggleMute">
            <svg v-if="!isMuted" id="speaker-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
          </button>
        </div>
      </header>

      <ChatArea v-if="!isOrbMode" />
      <OrbVisualizer v-else />
    </div>

    <!-- Modals -->
    <AuthModal v-if="isAuthModalOpen" />
    <SettingsModal />
  </div>
</template>

<style scoped>
/* App specific styles can go here if needed */
</style>
