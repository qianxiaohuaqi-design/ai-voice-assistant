<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <button class="new-chat-btn" @click="createNewSession">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        新建对话
      </button>
    </div>
    <div class="sessions-list">
      <div 
        v-for="s in sessions" 
        :key="s.id" 
        class="session-item" 
        :class="{ active: s.id === activeSessionId }"
        @click="selectSession(s.id)"
      >
        <div class="session-title-wrapper">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="session-title" v-if="editingId !== s.id">{{ s.title }}</span>
          <input 
            v-else
            type="text" 
            v-model="editTitle" 
            @blur="saveEdit(s.id)"
            @keyup.enter="saveEdit(s.id)"
            style="background:transparent; border:none; color:inherit; outline:none; font-family:inherit; font-size:inherit; width: 100%;"
            autofocus
            @click.stop
          />
        </div>
        <div class="session-actions" v-if="editingId !== s.id">
          <button class="session-action-btn session-rename-btn" title="重命名对话" style="margin-right: 4px;" @click.stop="startEdit(s)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="session-action-btn session-delete-btn" title="删除对话" @click.stop="deleteSession(s.id)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="sidebar-footer">
      <button class="sidebar-action-btn" title="模型资费与功能指南" @click="openGuide">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        使用指南
      </button>
      <button class="sidebar-action-btn" title="系统设置" @click="isSettingsModalOpen = true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        系统设置
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue'
import { useChat } from '../composables/useChat'
import { useSettings } from '../composables/useSettings'

const { sessions, activeSessionId, createNewSession, selectSession, deleteSession, renameSession } = useChat()
const { isSettingsModalOpen, isHelpModalOpen } = useSettings()

const openGuide = () => {
  isHelpModalOpen.value = true
}

const editingId = ref(null)
const editTitle = ref('')

const startEdit = (session) => {
  editingId.value = session.id
  editTitle.value = session.title
}

const saveEdit = (id) => {
  if (editingId.value) {
    renameSession(id, editTitle.value.trim() || '新对话')
    editingId.value = null
  }
}
</script>
