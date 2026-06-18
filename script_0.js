
    // Globals
    let chatHistory = [];
    let isMuted = false;
    let currentAudio = null;
    let recognition = null;
    let isRecording = false;
    let voicesList = [];
    let currentTheme = 'dark';
    let currentViewMode = 'chat';
    
    // Sessions Globals
    let sessions = [];
    let activeSessionId = null;
    
    // Web Audio API Globals
    let audioCtx = null;
    let analyserNode = null;
    let sourceNode = null;
    let animationFrameId = null;
    let recordingAnimationId = null;

    // Default Voices preset
    const defaultVoices = [];

    // Global Auth State
    let authToken = localStorage.getItem('auth_token') || '';
    let authMode = 'login'; // 'login' or 'register'
    let syncSaveTimer = null;
    const voiceIdPattern = /^[A-Za-z0-9_-]+$/;

    window.onload = function() {
      // Load custom voice list
      loadVoicesList();
      
      // Load theme preference
      const savedTheme = localStorage.getItem('ui_theme') || 'dark';
      setTheme(savedTheme);

      isMuted = localStorage.getItem('is_muted') === 'true';
      updateMuteUI();

      // Check authentication status
      if (!authToken) {
        document.getElementById('auth-overlay').classList.add('active');
      } else {
        syncLoadFromServer();
      }

      // Initialize all custom selects
      initCustomSelect('chat-model-dropdown', (val) => {
        onModelChange();
      });
      initCustomSelect('elevenlabs-model-dropdown', (val) => {
        updateHUDModelInfo();
      });
      initCustomSelect('response-language-dropdown');
      initCustomSelect('voice-select-dropdown');
      
      initCustomSelect('translate-target-dropdown');
      
      // Initialize TTS Mode & Edge voice selects
      initCustomSelect('tts-mode-dropdown', (val) => {
        updateTTSModeVisibility(val);
        updateHUDModelInfo();
      });
      initCustomSelect('edge-voice-dropdown', (val) => {
        localStorage.setItem('edge_voice', val);
        updateHUDModelInfo();
      });

      // Set initial values from localStorage
      const savedTTSMode = localStorage.getItem('tts_mode') || 'elevenlabs';
      setCustomSelectValue('tts-mode-dropdown', savedTTSMode);
      updateTTSModeVisibility(savedTTSMode);
      
      const savedEdgeVoice = localStorage.getItem('edge_voice') || 'zh-CN-XiaoxiaoNeural';
      setCustomSelectValue('edge-voice-dropdown', savedEdgeVoice);
      
      // Global click handler to close custom selects
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-container').forEach(c => {
          c.classList.remove('open');
        });
      });

      // Initialize Web Speech API for voice recognition
      initSpeechRecognition();
    };

    // Session Management Functions
    function initSessions() {
      const saved = localStorage.getItem('chat_sessions');
      const savedActiveId = localStorage.getItem('active_session_id');
      
      if (saved) {
        try {
          sessions = JSON.parse(saved);
        } catch (e) {
          sessions = [];
        }
      }
      
      if (sessions.length === 0) {
        createNewSession(true);
      } else {
        activeSessionId = savedActiveId || sessions[0].id;
        if (!sessions.some(s => s.id === activeSessionId)) {
          activeSessionId = sessions[0].id;
        }
        loadSession(activeSessionId);
      }
      renderSessionsList();
    }

    function saveSessions() {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession) {
        activeSession.messages = [...chatHistory];
      }
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
      localStorage.setItem('active_session_id', activeSessionId);
      syncSaveToServer();
    }

    function renderSessionsList() {
      const listEl = document.getElementById('sessions-list');
      if (!listEl) return;
      listEl.innerHTML = '';
      
      sessions.sort((a,b) => (b.is_pinned === a.is_pinned ? 0 : b.is_pinned ? 1 : -1)).forEach(s => {
        const item = document.createElement('div');
        item.className = `session-item ${s.id === activeSessionId ? 'active' : ''}`;
        item.onclick = () => selectSession(s.id);
        
        const titleWrapper = document.createElement('div');
        titleWrapper.className = 'session-title-wrapper';
        titleWrapper.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="session-title">${escapeHTML(s.title)}</span>
        `;
        
        const actions = document.createElement('div');
        actions.className = 'session-actions';
        actions.innerHTML = `
          <button class="session-action-btn session-rename-btn" title="重命名对话" style="margin-right: 4px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="session-action-btn session-delete-btn" title="删除对话">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        `;
        actions.querySelector('.session-rename-btn').addEventListener('click', (e) => renameSession(e, s.id));
        actions.querySelector('.session-delete-btn').addEventListener('click', (e) => deleteSession(e, s.id));
        
        item.appendChild(titleWrapper);
        item.appendChild(actions);
        listEl.appendChild(item);
      });
    }

    function createNewSession(isInit = false) {
      if (activeSessionId) {
        const currentActive = sessions.find(s => s.id === activeSessionId);
        if (currentActive) {
          currentActive.messages = [...chatHistory];
        }
      }

      const newId = 'session_' + Date.now();
      const newSession = {
        id: newId,
        title: '新对话',
        messages: []
      };
      
      sessions.unshift(newSession);
      activeSessionId = newId;
      chatHistory = [];
      
      if (!isInit) {
        saveSessions();
        renderSessionsList();
        clearChatUI();
        if (window.innerWidth <= 768) {
          toggleSidebar(false);
        }
      }
    }

    function selectSession(id) {
      if (id === activeSessionId) return;
      
      const currentActive = sessions.find(s => s.id === activeSessionId);
      if (currentActive) {
        currentActive.messages = [...chatHistory];
      }
      
      activeSessionId = id;
      localStorage.setItem('active_session_id', id);
      
      if (currentAudio) {
        currentAudio.pause();
        stopAllWaveforms();
      }
      
      loadSession(id);
      renderSessionsList();
      
      if (window.innerWidth <= 768) {
        toggleSidebar(false);
      }
    }

    function loadSession(id) {
      const session = sessions.find(s => s.id === id);
      if (session) {
        chatHistory = [...session.messages];
        renderChatUI();
      }
    }

    async function deleteSession(e, id) {
      e.stopPropagation();
      
      const confirmed = await showCustomConfirm("确定要删除这个对话吗？");
      if (!confirmed) return;
      
      if (sessions.length <= 1) {
        sessions = [];
        createNewSession(false);
        return;
      }
      
      sessions = sessions.filter(s => s.id !== id);
      
      if (activeSessionId === id) {
        activeSessionId = sessions[0].id;
        loadSession(activeSessionId);
      }
      
      saveSessions();
      renderSessionsList();
      showToast('对话已删除', 1500);
    }

    function clearChatUI() {
      const windowEl = document.getElementById('chat-window');
      windowEl.innerHTML = `
        <div class="message-row ai">
          <div class="bubble">
            <p>👋 你好！我是你的专属智能语音助手。</p>
            <p>在开始前，请点击左下角侧边栏的 <strong>“系统设置”</strong> 按钮配置您的 API Key。点击右上角的喇叭图标，可以一键开启或关闭 <strong>“纯文字模式”</strong> 节省语音额度哦！</p>
          </div>
        </div>
      `;
      if (currentViewMode === 'orb') {
        setOrbSubtitleSimple('');
      }
    }

    function renderChatUI() {
      const windowEl = document.getElementById('chat-window');
      windowEl.innerHTML = '';
      
      if (chatHistory.length === 0) {
        clearChatUI();
        return;
      }
      
      chatHistory.forEach(msg => {
        appendMessage(msg.role === 'assistant' ? 'ai' : 'user', msg.content);
      });
      
      if (currentViewMode === 'orb' && chatHistory.length > 0) {
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (lastMsg.role === 'assistant') {
          // Only refresh/show subtitle if audio is actively playing or status is not idle
          const statusText = document.getElementById('tech-status-text');
          const isIdle = !statusText || statusText.innerText === 'idle';
          if (!isIdle || (currentAudio && !currentAudio.paused)) {
            typewriteSubtitle(lastMsg.content, currentAudio && !currentAudio.paused);
          }
        }
      }
      
      scrollToBottom();
    }

    function updateSessionTitleIfNeeded(userMessageText) {
      const activeSession = sessions.find(s => s.id === activeSessionId);
      if (activeSession && activeSession.title === '新对话') {
        const truncated = userMessageText.substring(0, 12) + (userMessageText.length > 12 ? '...' : '');
        activeSession.title = truncated;
        saveSessions();
        renderSessionsList();
      }
    }

    function toggleSidebar(forceState = null) {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      
      let isOpen = sidebar.classList.contains('open');
      if (forceState !== null) {
        isOpen = !forceState; 
      }
      
      if (isOpen) {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
      } else {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
      }
    }

    // Auto resize textarea height
    function autoResizeTextarea(el) {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }

    function updateHUDModelInfo() {
      // 1. AI model update
      const model = document.getElementById('chat-model').value || localStorage.getItem('chat_model') || 'deepseek-chat';
      const techModelVal = document.getElementById('tech-model-val');
      if (techModelVal) {
        let cleanModelName = model;
        if (model.includes('haiku')) cleanModelName = 'claude-haiku-3.5';
        else if (model.includes('sonnet')) cleanModelName = 'claude-sonnet-3.7';
        else if (model.includes('opus')) cleanModelName = 'claude-opus-4.0';
        else if (model.includes('gpt-4o-mini')) cleanModelName = 'gpt-4o-mini';
        else if (model.includes('gpt-4o')) cleanModelName = 'gpt-4o';
        else if (model.includes('gpt-4-turbo')) cleanModelName = 'gpt-4-turbo';
        else if (model.includes('o3-mini')) cleanModelName = 'o3-mini';
        else if (model.includes('deepseek-chat')) cleanModelName = 'deepseek-chat';
        else if (model.includes('deepseek-reasoner')) cleanModelName = 'deepseek-reasoner';
        else if (model.includes('gemini-2.5-pro')) cleanModelName = 'gemini-2.5-pro';
        else if (model.includes('gemini-3.5-flash')) cleanModelName = 'gemini-3.5-flash';
        else if (model.includes('grok-4.20-0309-non-reasoning')) cleanModelName = 'grok-4.2-fast';
        else if (model.includes('grok-4.20-0309-reasoning')) cleanModelName = 'grok-4.2-reason';
        techModelVal.innerText = cleanModelName;
      }

      // 2. Voice model update
      const ttsMode = localStorage.getItem('tts_mode') || 'elevenlabs';
      const techVoiceModelVal = document.getElementById('tech-voice-model-val');
      if (techVoiceModelVal) {
        if (ttsMode === 'edge') {
          const edgeVoice = localStorage.getItem('edge_voice') || 'zh-CN-XiaoxiaoNeural';
          let shortVoice = edgeVoice.split('-').pop().replace('Neural', '');
          techVoiceModelVal.innerText = `edge-tts (${shortVoice})`;
        } else {
          const voiceModel = document.getElementById('elevenlabs-model').value || localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2';
          let cleanVoiceModel = voiceModel;
          if (voiceModel === 'eleven_multilingual_v2') cleanVoiceModel = 'eleven-multilingual-v2';
          else if (voiceModel === 'eleven_turbo_v2_5') cleanVoiceModel = 'eleven-turbo-v2.5';
          else if (voiceModel === 'eleven_flash_v1') cleanVoiceModel = 'eleven-flash-v1';
          else if (voiceModel === 'eleven_monolingual_v1') cleanVoiceModel = 'eleven-monolingual-v1';
          techVoiceModelVal.innerText = cleanVoiceModel;
        }
      }
    }

    function updateTTSModeVisibility(mode) {
      const isElevenLabs = (mode === 'elevenlabs');
      
      const elevenlabsModelGroup = document.getElementById('elevenlabs-model-dropdown')?.closest('.form-group');
      const voiceSelectGroup = document.getElementById('voice-select-dropdown')?.closest('.form-group');
      const voiceManagementCard = document.querySelector('.voice-management-card');
      const elevenlabsKeyGroup = document.getElementById('elevenlabs-key')?.closest('.form-group');
      const edgeVoiceWrapper = document.getElementById('edge-voice-wrapper');
      
      if (isElevenLabs) {
        if (elevenlabsModelGroup) elevenlabsModelGroup.style.display = 'block';
        if (voiceSelectGroup) voiceSelectGroup.style.display = 'block';
        if (voiceManagementCard) voiceManagementCard.style.display = 'block';
        if (elevenlabsKeyGroup) elevenlabsKeyGroup.style.display = 'block';
        if (edgeVoiceWrapper) edgeVoiceWrapper.style.display = 'none';
      } else {
        if (elevenlabsModelGroup) elevenlabsModelGroup.style.display = 'none';
        if (voiceSelectGroup) voiceSelectGroup.style.display = 'none';
        if (voiceManagementCard) voiceManagementCard.style.display = 'none';
        if (elevenlabsKeyGroup) elevenlabsKeyGroup.style.display = 'none';
        if (edgeVoiceWrapper) edgeVoiceWrapper.style.display = 'block';
      }
    }

    function onModelChange() {
      const model = document.getElementById('chat-model').value;
      localStorage.setItem('chat_model', model);
      updateHUDModelInfo();
    }

    // Load Voice Library
    function loadVoicesList() {
      document.body.classList.remove('dragging-active');
      const saved = localStorage.getItem('custom_voices');
      if (saved) {
        try {
          voicesList = JSON.parse(saved);
        } catch (e) {
          voicesList = [...defaultVoices];
        }
      } else {
        voicesList = [...defaultVoices];
      }
      renderVoiceDropdown();
      renderVoiceManagerList();
    }

    function renderVoiceDropdown() {
      const container = document.getElementById('voice-select-options');
      if (!container) return;
      container.innerHTML = '';
      
      const savedVoice = localStorage.getItem('voice_id') || 'x7tNCivOKFAydss7fglA';
      const triggerSpan = document.querySelector('#voice-select-dropdown .custom-select-trigger span');
      const hiddenInput = document.getElementById('voice-select');
      
      let matchedVoiceName = "选择语音声音";
      
      voicesList.forEach(v => {
        const item = document.createElement('div');
        item.className = `custom-select-option ${v.id === savedVoice ? 'selected' : ''}`;
        item.setAttribute('data-value', v.id);
        item.innerText = v.name;
        
        if (v.id === savedVoice) {
          matchedVoiceName = v.name;
          hiddenInput.value = v.id;
        }
        
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          hiddenInput.value = v.id;
          triggerSpan.innerText = v.name;
          
          container.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
          item.classList.add('selected');
          document.getElementById('voice-select-dropdown').classList.remove('open');
        });
        
        container.appendChild(item);
      });
      
      triggerSpan.innerText = matchedVoiceName;
    }

    function renderVoiceManagerList() {
      const container = document.getElementById('voice-list-container');
      if (!container) return;
      container.innerHTML = '';
      
      voicesList.forEach((v, index) => {
        const row = document.createElement('div');
        row.className = 'voice-item-row';
        
        const isFirst = index === 0;
        const isLast = index === voicesList.length - 1;
        
        row.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
            <div style="display: flex; flex-direction: column; gap: 1px;">
              <button class="voice-sort-btn voice-move-up-btn" title="上移" ${isFirst ? 'disabled style="opacity: 0.15; cursor: not-allowed;"' : 'style="cursor: pointer;"'}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display: block;">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </button>
              <button class="voice-sort-btn voice-move-down-btn" title="下移" ${isLast ? 'disabled style="opacity: 0.15; cursor: not-allowed;"' : 'style="cursor: pointer;"'}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="display: block;">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="voice-name" style="font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(v.name)}</span>
                <button class="voice-action-btn voice-rename-btn" title="重命名" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="voice-id-badge" style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border-color);">${escapeHTML(v.id)}</span>
                <button class="voice-action-btn voice-copy-btn" title="复制完整ID" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; display: flex; align-items: center;">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button class="delete-voice-btn voice-delete-btn" style="margin-left: 10px;">删除</button>
        `;
        row.querySelector('.voice-move-up-btn').addEventListener('click', () => moveVoice(index, -1));
        row.querySelector('.voice-move-down-btn').addEventListener('click', () => moveVoice(index, 1));
        row.querySelector('.voice-rename-btn').addEventListener('click', (e) => renameVoice(e, v.id));
        row.querySelector('.voice-copy-btn').addEventListener('click', (e) => copyVoiceId(e, v.id));
        row.querySelector('.voice-delete-btn').addEventListener('click', () => deleteVoice(v.id));
        
        container.appendChild(row);
      });
    }

    function moveVoice(index, direction) {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= voicesList.length) return;
      
      const temp = voicesList[index];
      voicesList[index] = voicesList[targetIndex];
      voicesList[targetIndex] = temp;
      
      localStorage.setItem('custom_voices', JSON.stringify(voicesList));
      loadVoicesList();
      showToast('声音位置已调整！', 800);
    }

    function addNewVoice() {
      const nameInput = document.getElementById('new-voice-name');
      const idInput = document.getElementById('new-voice-id');
      const name = nameInput.value.trim();
      const id = idInput.value.trim();
      
      if (!name || !id) {
        showToast('声音名称和 ID 不能为空', 2000);
        return;
      }

      if (!isValidVoiceId(id)) {
        showToast('Voice ID 只能包含字母、数字、下划线和短横线', 3000);
        return;
      }
      
      if (voicesList.some(v => v.id === id)) {
        showToast('该声音 ID 已经存在', 2000);
        return;
      }
      
      voicesList.push({ name, id });
      localStorage.setItem('custom_voices', JSON.stringify(voicesList));
      
      nameInput.value = '';
      idInput.value = '';
      
      loadVoicesList();
      showToast('声音添加成功！', 2000);
    }

    function showCustomConfirm(message) {
      return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-modal-message');
        const cancelBtn = document.getElementById('confirm-modal-cancel');
        const okBtn = document.getElementById('confirm-modal-ok');
        
        if (!modal || !messageEl || !cancelBtn || !okBtn) {
          resolve(confirm(message));
          return;
        }
        
        messageEl.innerText = message;
        modal.classList.add('open');
        
        function handleCancel() {
          cleanup();
          resolve(false);
        }
        
        function handleOk() {
          cleanup();
          resolve(true);
        }
        
        function cleanup() {
          modal.classList.remove('open');
          cancelBtn.removeEventListener('click', handleCancel);
          okBtn.removeEventListener('click', handleOk);
        }
        
        // Replace buttons to flush duplicate click listeners
        const newCancelBtn = cancelBtn.cloneNode(true);
        const newOkBtn = okBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newCancelBtn.addEventListener('click', handleCancel);
        newOkBtn.addEventListener('click', handleOk);
      });
    }

    async function deleteVoice(id) {
      const voice = voicesList.find(v => v.id === id);
      const voiceName = voice ? voice.name : '';
      const confirmMsg = voiceName ? `确定要删除声音「${voiceName}」吗？` : '确定要删除该声音吗？';
      
      const confirmed = await showCustomConfirm(confirmMsg);
      if (!confirmed) return;
      
      voicesList = voicesList.filter(v => v.id !== id);
      localStorage.setItem('custom_voices', JSON.stringify(voicesList));
      loadVoicesList();
      showToast('声音已删除', 2000);
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
      );
    }

    function isValidVoiceId(id) {
      return voiceIdPattern.test(id);
    }

    // Custom select helpers
    function initCustomSelect(containerId, onChangeCallback) {
      const container = document.getElementById(containerId);
      if (!container) return;
      
      const trigger = container.querySelector('.custom-select-trigger');
      const optionsContainer = container.querySelector('.custom-select-options');
      const hiddenInput = container.querySelector('input[type="hidden"]');
      
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Close other custom selects
        document.querySelectorAll('.custom-select-container').forEach(c => {
          if (c !== container) c.classList.remove('open');
        });
        
        container.classList.toggle('open');
      });
      
      // We dynamically read options to support dynamic dropdowns like voice-select
      container.addEventListener('click', (e) => {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;
        
        e.stopPropagation();
        const val = option.getAttribute('data-value');
        const text = option.innerText;
        
        trigger.querySelector('span').innerText = text;
        hiddenInput.value = val;
        
        container.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');
        
        container.classList.remove('open');
        
        if (onChangeCallback) onChangeCallback(val);
      });
    }

    function setCustomSelectValue(containerId, value) {
      const container = document.getElementById(containerId);
      if (!container) return;
      const triggerSpan = container.querySelector('.custom-select-trigger span');
      const hiddenInput = container.querySelector('input[type="hidden"]');
      const options = container.querySelectorAll('.custom-select-option');
      
      hiddenInput.value = value;
      
      let matchedText = "";
      options.forEach(opt => {
        if (opt.getAttribute('data-value') === value) {
          opt.classList.add('selected');
          matchedText = opt.innerText;
        } else {
          opt.classList.remove('selected');
        }
      });
      
      if (matchedText && triggerSpan) {
        triggerSpan.innerText = matchedText;
      }
    }

    // Copy and rename helpers for Voice Manager
    function copyVoiceId(e, id) {
      e.stopPropagation();
      navigator.clipboard.writeText(id).then(() => {
        showToast('声音 ID 已复制！', 1500);
      }).catch(err => {
        showToast('复制失败：' + err, 1500);
      });
    }

    async function renameVoice(e, id) {
      e.stopPropagation();
      const voice = voicesList.find(v => v.id === id);
      if (!voice) return;
      const newName = await customPrompt("请输入声音新名称:", voice.name);
      if (newName && newName.trim()) {
        voice.name = newName.trim();
        localStorage.setItem('custom_voices', JSON.stringify(voicesList));
        loadVoicesList();
        showToast('声音重命名成功！', 1500);
      }
    }



    // Theme Switcher
    function setTheme(theme) {
      currentTheme = theme;
      localStorage.setItem('ui_theme', theme);
      
      const darkBtn = document.getElementById('theme-dark-btn');
      const lightBtn = document.getElementById('theme-light-btn');
      
      if (theme === 'light') {
        document.body.classList.add('light-theme');
        if (lightBtn) lightBtn.classList.add('active');
        if (darkBtn) darkBtn.classList.remove('active');
      } else {
        document.body.classList.remove('light-theme');
        if (darkBtn) darkBtn.classList.add('active');
        if (lightBtn) lightBtn.classList.remove('active');
      }
      syncSaveToServer();
    }

    // Toggle Immersive Sphere / Text Chat view mode
    function toggleViewMode() {
      const chatWindow = document.getElementById('chat-window');
      const orbWrapper = document.getElementById('orb-wrapper');
      const modeBtn = document.getElementById('mode-toggle-btn');
      
      if (currentViewMode === 'chat') {
        currentViewMode = 'orb';
        chatWindow.style.display = 'none';
        orbWrapper.classList.add('active');
        modeBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        `;
        startNebulaLoop();
        if (currentAudio && !currentAudio.paused) {
          nebulaState = 'speaking';
        } else if (isRecording) {
          nebulaState = 'recording';
        } else {
          nebulaState = 'idle';
        }
        showToast('切换到灵动星云模式', 1500);
      } else {
        currentViewMode = 'chat';
        chatWindow.style.display = 'flex';
        orbWrapper.classList.remove('active');
        modeBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"></path>
          </svg>
        `;
        stopNebulaLoop();
        showToast('切换到文字对话模式', 1500);
      }
    }

    // Modal Control Functions
    function openModal() {

      document.getElementById('anthropic-key').value = localStorage.getItem('anthropic_key') || '';
      document.getElementById('anthropic-base').value = localStorage.getItem('anthropic_base') || (window.serverConfig ? window.serverConfig.default_anthropic_base : 'https://api.anthropic.com');
      document.getElementById('elevenlabs-key').value = localStorage.getItem('elevenlabs_key') || '';
      setCustomSelectValue('chat-model-dropdown', localStorage.getItem('chat_model') || 'deepseek-chat');
      setCustomSelectValue('response-language-dropdown', localStorage.getItem('response_language') || 'auto');
      setCustomSelectValue('elevenlabs-model-dropdown', localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2');
      document.getElementById('translate-enable').value = localStorage.getItem('translate_enable') === 'true' ? 'true' : 'false';
      setCustomSelectValue('translate-target-dropdown', localStorage.getItem('translate_target') || 'Chinese');
      setCustomSelectValue('tts-mode-dropdown', localStorage.getItem('tts_mode') || 'elevenlabs');
      setCustomSelectValue('edge-voice-dropdown', localStorage.getItem('edge_voice') || 'zh-CN-XiaoxiaoNeural');
      document.getElementById('orb-font-size').value = localStorage.getItem('orb_font_size') || '16';
      document.getElementById('orb-font-size-val').innerText = (localStorage.getItem('orb_font_size') || '16') + 'px';
      
      const transSwitch = document.getElementById('translate-enable-switch');
      if(localStorage.getItem('translate_enable') === 'true') {
         transSwitch.classList.add('active');
      } else {
         transSwitch.classList.remove('active');
      }
      
      fetchModels(); // dynamically load models

      document.getElementById('settings-modal').classList.add('open');
    }

    function closeModal() {
      document.getElementById('settings-modal').classList.remove('open');
    }

    function closeModalOnOuterClick(e) {
      if (e.target.id === 'settings-modal') {
        closeModal();
      }
    }

    function openHelpModal() {
      document.getElementById('help-modal').classList.add('open');
    }

    function closeHelpModal() {
      document.getElementById('help-modal').classList.remove('open');
    }

    function closeHelpModalOnOuterClick(e) {
      if (e.target.id === 'help-modal') {
        closeHelpModal();
      }
    }

    function switchHelpTab(event, tabId) {
      if (event) event.stopPropagation();
      document.querySelectorAll('.help-tab-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelectorAll('.help-tab-content').forEach(content => {
        content.classList.remove('active');
      });
      
      if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
      }
      
      const targetContent = document.getElementById(`help-tab-${tabId}`);
      if (targetContent) targetContent.classList.add('active');
    }

    function toggleTranslationSwitch() {
      const transSwitch = document.getElementById('translate-enable-switch');
      const transInput = document.getElementById('translate-enable');
      if (!transSwitch || !transInput) return;
      
      const isActive = transSwitch.classList.contains('active');
      if (isActive) {
        transSwitch.classList.remove('active');
        transInput.value = 'false';
      } else {
        transSwitch.classList.add('active');
        transInput.value = 'true';
      }
      
      const transTargetWrapper = document.getElementById('translate-target-wrapper');
      if (transTargetWrapper) {
        transTargetWrapper.style.display = transInput.value === 'true' ? 'block' : 'none';
      }
    }

    // Save configurations
    function saveSettings() {
      const aKey = document.getElementById('anthropic-key').value.trim();
      const aBase = document.getElementById('anthropic-base').value.trim() || 'https://api.anthropic.com';
      const eKey = document.getElementById('elevenlabs-key').value.trim();
      const lang = document.getElementById('response-language').value;
      const eModel = document.getElementById('elevenlabs-model').value || 'eleven_multilingual_v2';
      
      const voiceSelect = document.getElementById('voice-select');
      const vId = voiceSelect.value || 'x7tNCivOKFAydss7fglA';
      
      const transEnable = document.getElementById('translate-enable').value === 'true';
      const transTarget = document.getElementById('translate-target').value;

      const ttsMode = document.getElementById('tts-mode').value || 'elevenlabs';
      const edgeVoice = document.getElementById('edge-voice').value || 'zh-CN-XiaoxiaoNeural';

      localStorage.setItem('anthropic_key', aKey);
      localStorage.setItem('anthropic_base', aBase);
      localStorage.setItem('response_language', lang);
      localStorage.setItem('elevenlabs_key', eKey);
      localStorage.setItem('voice_id', vId);
      localStorage.setItem('elevenlabs_model', eModel);
      localStorage.setItem('translate_enable', transEnable);
      localStorage.setItem('translate_target', transTarget);
      localStorage.setItem('tts_mode', ttsMode);
      localStorage.setItem('edge_voice', edgeVoice);
      const orbFontSize = document.getElementById('orb-font-size').value;
      localStorage.setItem('orb_font_size', orbFontSize);
      document.documentElement.style.setProperty('--orb-subtitle-size', orbFontSize + 'px');
      
      updateHUDModelInfo();
      renderChatUI(); // Re-render chat UI to immediately apply new translation / settings
      closeModal();
      showToast('设置保存成功！', 2000);
      syncSaveToServer();
    }

    // Authentication and synchronization functions
    function toggleAuthMode() {
      const title = document.getElementById('auth-title');
      const subtitle = document.getElementById('auth-subtitle');
      const primaryBtn = document.getElementById('auth-primary-btn');
      const switchLink = document.getElementById('auth-switch-link');
      const errMsg = document.getElementById('auth-error-msg');
      
      errMsg.style.display = 'none';
      
      if (authMode === 'login') {
        authMode = 'register';
        title.innerText = '注册新账号';
        subtitle.innerText = '请设置您的用户名 and 密码以创建专属空间';
        primaryBtn.innerText = '创建账号';
        switchLink.innerText = '已有账号？点击登录';
      } else {
        authMode = 'login';
        title.innerText = '登录您的语音助手';
        subtitle.innerText = '请输入您的账号密码进行身份验证';
        primaryBtn.innerText = '登录';
        switchLink.innerText = '还没有账号？点击注册';
      }
    }

    async function handleAuthSubmit() {
      const username = document.getElementById('auth-username').value.trim();
      const password = document.getElementById('auth-password').value;
      const errMsg = document.getElementById('auth-error-msg');
      
      if (!username || !password) {
        errMsg.innerText = '用户名和密码不能为空';
        errMsg.style.display = 'block';
        return;
      }
      if (password.length < 6) {
        errMsg.innerText = '密码长度必须至少为6位';
        errMsg.style.display = 'block';
        return;
      }
      
      const url = authMode === 'login' ? '/api/login' : '/api/register';
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          errMsg.innerText = data.detail || '操作失败，请重试';
          errMsg.style.display = 'block';
          return;
        }
        
        authToken = data.token;
        localStorage.setItem('auth_token', authToken);
        document.getElementById('auth-overlay').classList.remove('active');
        
        await syncLoadFromServer();
        showToast(authMode === 'login' ? '登录成功！' : '注册成功！', 2000);
      } catch (err) {
        console.error(err);
        errMsg.innerText = '连接服务器失败';
        errMsg.style.display = 'block';
      }
    }

    function handleLogout() {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('chat_sessions');
      localStorage.removeItem('active_session_id');
      localStorage.removeItem('anthropic_key');
      localStorage.removeItem('elevenlabs_key');
      location.reload();
    }

    async function syncSaveToServer() {
      if (!authToken) return;
      
      const aKey = localStorage.getItem('anthropic_key') || '';
      const aBase = localStorage.getItem('anthropic_base') || 'https://api.anthropic.com';
      const eKey = localStorage.getItem('elevenlabs_key') || '';
      const vId = localStorage.getItem('voice_id') || 'x7tNCivOKFAydss7fglA';
      const lang = localStorage.getItem('response_language') || 'auto';
      const eModel = localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2';
      const transEnable = localStorage.getItem('translate_enable') === 'true';
      const transTarget = localStorage.getItem('translate_target') || 'Chinese';
      const theme = localStorage.getItem('ui_theme') || 'dark';
      const muted = localStorage.getItem('is_muted') === 'true';
      
      const syncSessions = sessions.map(s => ({
        id: s.id,
        title: s.title,
            is_pinned: s.is_pinned,
        messages: JSON.stringify(s.messages || [])
      }));
      
      try {
        await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            anthropic_key: aKey,
            anthropic_base: aBase,
            elevenlabs_key: eKey,
            voice_id: vId,
            chat_model: document.getElementById('chat-model').value || 'claude-3-5-haiku-20241022',
            response_language: lang,
            elevenlabs_model: eModel,
            translate_enabled: transEnable,
            translate_target: transTarget,
            ui_theme: theme,
            is_muted: muted,
            tts_mode: ttsMode,
            edge_voice: edgeVoice,
            sessions: syncSessions
          })
        });
      } catch (err) {
        console.error('Failed to sync to server:', err);
      }
    }

    function scheduleSyncSaveToServer() {
      if (!authToken) return;
      if (syncSaveTimer) {
        clearTimeout(syncSaveTimer);
      }
      syncSaveTimer = setTimeout(() => {
        syncSaveTimer = null;
        syncSaveToServer();
      }, 800);
    }

    async function syncLoadFromServer() {
      if (!authToken) return;
      
      // Fetch server key configuration status in parallel
      fetch('/api/config')
        .then(response => response.json())
        .then(config => {
          window.serverConfig = config;
          
          const anthropicKeyInput = document.getElementById('anthropic-key');
          const elevenLabsKeyInput = document.getElementById('elevenlabs-key');
          const anthropicBaseInput = document.getElementById('anthropic-base');

          if (config.has_anthropic_key) {
            anthropicKeyInput.placeholder = "已在服务器端配置默认 Key (可在此输入自定义 Key 覆盖)";
          }
          if (config.has_elevenlabs_key) {
            elevenLabsKeyInput.placeholder = "已在服务器端配置默认 Key (可在此输入自定义 Key 覆盖)";
          }
          if (config.default_anthropic_base && !localStorage.getItem('anthropic_base')) {
            anthropicBaseInput.value = config.default_anthropic_base;
          }

          // Automatically pop up settings modal if keys are missing
          const hasAnthropic = localStorage.getItem('anthropic_key') || config.has_anthropic_key;
          const ttsMode = localStorage.getItem('tts_mode') || 'elevenlabs';
          const hasElevenLabs = localStorage.getItem('elevenlabs_key') || config.has_elevenlabs_key;
          const needsSetup = !hasAnthropic || (ttsMode === 'elevenlabs' && !hasElevenLabs);
          if (needsSetup) {
            setTimeout(openModal, 800);
          }
        })
        .catch(err => console.error("Failed to fetch server config:", err));

      try {
        const response = await fetch('/api/user/sync', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          authToken = '';
          document.getElementById('auth-overlay').classList.add('active');
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to load settings from server');
        }
        
        const data = await response.json();
        
        // Restore settings into localStorage
        localStorage.setItem('anthropic_key', data.anthropic_key || '');
        localStorage.setItem('anthropic_base', data.anthropic_base || 'https://api.anthropic.com');
        localStorage.setItem('elevenlabs_key', data.elevenlabs_key || '');
        localStorage.setItem('voice_id', data.voice_id || 'x7tNCivOKFAydss7fglA');
        localStorage.setItem('response_language', data.response_language || 'auto');
        localStorage.setItem('elevenlabs_model', data.elevenlabs_model || 'eleven_multilingual_v2');
        localStorage.setItem('translate_enable', data.translate_enabled ? 'true' : 'false');
        localStorage.setItem('translate_target', data.translate_target || 'Chinese');
        localStorage.setItem('tts_mode', data.tts_mode || 'elevenlabs');
        localStorage.setItem('edge_voice', data.edge_voice || 'zh-CN-XiaoxiaoNeural');
        localStorage.setItem('ui_theme', data.ui_theme || 'dark');
        localStorage.setItem('is_muted', data.is_muted ? 'true' : 'false');
        
        // Set setting input values
        document.getElementById('anthropic-key').value = data.anthropic_key || '';
        document.getElementById('anthropic-base').value = data.anthropic_base || 'https://api.anthropic.com';
        document.getElementById('elevenlabs-key').value = data.elevenlabs_key || '';
        
        const modelSelect = document.getElementById('chat-model');
        if (modelSelect) modelSelect.value = data.chat_model || 'claude-3-5-haiku-20241022';
        setCustomSelectValue('chat-model-dropdown', data.chat_model || 'claude-3-5-haiku-20241022');
        
        setCustomSelectValue('response-language-dropdown', data.response_language || 'auto');
        setCustomSelectValue('elevenlabs-model-dropdown', data.elevenlabs_model || 'eleven_multilingual_v2');
        setCustomSelectValue('tts-mode-dropdown', data.tts_mode || 'elevenlabs');
        setCustomSelectValue('edge-voice-dropdown', data.edge_voice || 'zh-CN-XiaoxiaoNeural');
        updateTTSModeVisibility(data.tts_mode || 'elevenlabs');
        
        const transSwitch = document.getElementById('translate-enable-switch');
        const transInput = document.getElementById('translate-enable');
        if (transSwitch && transInput) {
          transInput.value = data.translate_enabled ? 'true' : 'false';
          if (data.translate_enabled) {
            transSwitch.classList.add('active');
          } else {
            transSwitch.classList.remove('active');
          }
        }
        setCustomSelectValue('translate-target-dropdown', data.translate_target || 'Chinese');
        
        const transTargetWrapper = document.getElementById('translate-target-wrapper');
        if (transTargetWrapper) {
          transTargetWrapper.style.display = data.translate_enabled ? 'block' : 'none';
        }
        
        // Restore theme
        setTheme(data.ui_theme || 'dark');
        
        // Restore mute state
        isMuted = data.is_muted;
        updateMuteUI();
        
        // Restore sessions list
        if (data.sessions && data.sessions.length > 0) {
          sessions = data.sessions.map(s => ({
            id: s.id,
            title: s.title,
            is_pinned: s.is_pinned,
            messages: JSON.parse(s.messages || '[]')
          }));
          
          const savedActiveId = localStorage.getItem('active_session_id');
          activeSessionId = (savedActiveId && sessions.some(s => s.id === savedActiveId)) ? savedActiveId : sessions[0].id;
          loadSession(activeSessionId);
        } else {
          sessions = [];
          createNewSession(true);
        }
        
        renderSessionsList();
        loadVoicesList();
        updateHUDModelInfo();
        
      } catch (err) {
        console.error(err);
        showToast('无法从服务器加载数据，使用本地缓存', 3000);
        
        // Fallback to local storage
        const savedSessions = localStorage.getItem('chat_sessions');
        if (savedSessions) {
          try {
            sessions = JSON.parse(savedSessions);
            const savedActiveId = localStorage.getItem('active_session_id');
            activeSessionId = (savedActiveId && sessions.some(s => s.id === savedActiveId)) ? savedActiveId : (sessions[0] ? sessions[0].id : null);
            if (activeSessionId) {
              loadSession(activeSessionId);
            } else {
              createNewSession(true);
            }
          } catch (e) {
            sessions = [];
            createNewSession(true);
          }
        } else {
          sessions = [];
          createNewSession(true);
        }
        renderSessionsList();
        loadVoicesList();
        updateHUDModelInfo();
      }
    }

    // Toast Alert Notification Banner
    function showToast(text, duration = 3000) {
      const banner = document.getElementById('toast-banner');
      banner.innerText = text;
      banner.classList.add('show');
      setTimeout(() => {
        banner.classList.remove('show');
      }, duration);
    }

    // Toggle mute state (Text-only vs Voice mode)
    function toggleMute() {
      isMuted = !isMuted;
      localStorage.setItem('is_muted', isMuted);
      updateMuteUI();
      syncSaveToServer();
      
      if (isMuted && currentAudio) {
        currentAudio.pause();
        stopAllWaveforms();
      }
      showToast(isMuted ? '已切换为纯文字模式' : '已开启语音播报模式', 2500);
    }

    function updateMuteUI() {
      const speakerBtn = document.getElementById('voice-toggle');
      const speakerIcon = document.getElementById('speaker-icon');
      if (isMuted) {
        speakerBtn.classList.add('muted');
        speakerBtn.title = "当前为：纯文字模式 (点击开启语音播报)";
        speakerIcon.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <line x1="23" y1="9" x2="17" y2="15"></line>
          <line x1="17" y1="9" x2="23" y2="15"></line>
        `;
      } else {
        speakerBtn.classList.remove('muted');
        speakerBtn.title = "当前为：语音播报模式 (点击关闭语音以省额度)";
        speakerIcon.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        `;
      }
    }

    // Web Speech API Voice-to-Text Input
    function initSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.log('此浏览器不支持 Web Speech API，无法进行语音转文字输入');
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;

      recognition.onstart = function() {
        isRecording = true;
        document.getElementById('mic-btn').classList.add('recording');
        document.getElementById('chat-input').placeholder = '正在听你说话...';
        
        updateTechStatus('recording');

        setOrbSubtitleSimple('正在听你说话...');
        startRecordingOrbAnimation();
      };

      recognition.onerror = function(e) {
        console.error('Speech recognition error', e);
        stopRecordingUI();
        showToast('语音识别出错，请重试', 2000);
      };

      recognition.onend = function() {
        stopRecordingUI();
        stopRecordingOrbAnimation();
      };

      recognition.onresult = function(e) {
        const transcript = e.results[0][0].transcript;
        document.getElementById('chat-input').value = transcript;
        
        const inputEl = document.getElementById('chat-input');
        autoResizeTextarea(inputEl);

        if (currentViewMode === 'orb' && transcript.trim()) {
          sendMessage();
        }
      };
    }

    function stopRecordingUI() {
      isRecording = false;
      document.getElementById('mic-btn').classList.remove('recording');
      document.getElementById('chat-input').placeholder = '输入消息，或点击麦克风说话...';
      updateTechStatus('idle');
      if (currentViewMode === 'orb') {
        setOrbSubtitleSimple('');
      }
    }

    function toggleSpeechInput() {
      if (!recognition) {
        showToast('当前浏览器或系统不支持语音识别输入', 3000);
        return;
      }

      if (isRecording) {
        recognition.stop();
      } else {
        if (currentAudio) {
          currentAudio.pause();
          stopAllWaveforms();
        }
        recognition.start();
      }
    }

    // Chat Functions
    function handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    }

    async function sendMessage() {
      if (currentSendBtnState === 'stop') {
        handleCancelCurrentAction();
        return;
      }

      const inputEl = document.getElementById('chat-input');
      const text = inputEl.value.trim();
      if (!text) return;

      const aKey = localStorage.getItem('anthropic_key');
      const aBase = localStorage.getItem('anthropic_base') || 'https://api.anthropic.com';
      const model = document.getElementById('chat-model').value || 'claude-3-5-haiku-20241022';
      const eKey = localStorage.getItem('elevenlabs_key');
      const vId = localStorage.getItem('voice_id') || 'x7tNCivOKFAydss7fglA';
      const responseLang = localStorage.getItem('response_language') || 'auto';
      const eModel = localStorage.getItem('elevenlabs_model') || 'eleven_multilingual_v2';
      
      const transEnable = localStorage.getItem('translate_enable') === 'true';
      const transTarget = localStorage.getItem('translate_target') || 'Chinese';

      const ttsMode = localStorage.getItem('tts_mode') || 'elevenlabs';
      const edgeVoice = localStorage.getItem('edge_voice') || 'zh-CN-XiaoxiaoNeural';

      const serverConfig = window.serverConfig || { has_anthropic_key: false, has_elevenlabs_key: false };
      const hasAnthropic = aKey || serverConfig.has_anthropic_key;
      const hasElevenLabs = eKey || serverConfig.has_elevenlabs_key;

      if (!hasAnthropic || (ttsMode === 'elevenlabs' && !isMuted && !hasElevenLabs)) {
        openModal();
        if (!hasAnthropic) {
          showToast('请先配置您的 AI 大模型 API Key！', 3000);
        } else {
          showToast('请先配置您的 ElevenLabs Key，或切换为 Edge-TTS 免费模式！', 3000);
        }
        return;
      }

      appendMessage('user', text);
      inputEl.value = '';
      inputEl.style.height = 'auto'; 

      chatHistory.push({ role: 'user', content: text });
      updateSessionTitleIfNeeded(text);
      saveSessions();

      if (currentViewMode === 'orb') {
        updateTechStatus('thinking');
        startThinkingAnimation();
        typewriteSubtitle('Thinking...');
        startThinkingTimer();
      }

      const aiMessageId = 'ai-msg-' + Date.now();
      appendMessage('ai', 'Thinking...', aiMessageId);

      scrollToBottom();

      // Abort any ongoing request before starting a new one
      if (chatAbortController) {
        chatAbortController.abort();
      }
      chatAbortController = new AbortController();
      const signal = chatAbortController.signal;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            message: text,
            history: chatHistory.slice(0, -1).slice(-10), 
            model: model,
            anthropic_key: aKey,
            anthropic_base: aBase,
            elevenlabs_key: eKey,
            voice_id: vId,
            response_language: responseLang,
            elevenlabs_model: eModel,
            translate_enabled: transEnable,
            translate_target: transTarget,
            tts_enabled: !isMuted,
            tts_mode: ttsMode,
            edge_voice: edgeVoice
          }),
          signal: signal
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || '接口请求失败');
        }

        const data = await response.json();
        stopThinkingTimer();
        
        updateMessage(aiMessageId, data.text);

        if (currentViewMode === 'orb') {
          stopThinkingAnimation();
          typewriteSubtitle(data.text, !isMuted && data.audio);
        }

        chatHistory.push({ role: 'assistant', content: data.text });
        saveSessions();

        if (!isMuted && data.audio) {
          playSpeech(aiMessageId, data.audio);
        } else {
          updateTechStatus('idle');
          if (currentViewMode === 'orb') {
            stopThinkingAnimation();
          }
        }

        if (data.error) {
          console.warn('Speech synthesis warning:', data.error);
          showToast('语音合成警告：额度不足或配置有误。已降级为纯文本回复。', 4000);
        }

      } catch (err) {
        stopThinkingTimer();
        if (err.name === 'AbortError') {
          console.log('Chat request was aborted.');
          updateTechStatus('idle');
          return;
        }
        console.error('Request error:', err);
        const errMsg = `❌ **错误**：${err.message || '请求处理失败。'}`;
        updateMessage(aiMessageId, errMsg);
        updateTechStatus('idle');
        if (currentViewMode === 'orb') {
          stopThinkingAnimation();
          typewriteSubtitle(errMsg);
        }
      } finally {
        chatAbortController = null;
      }

      scrollToBottom();
    }

    function formatMessageText(text) {
      if (text === 'Thinking...') {
        return '<em class="thinking-message">思考中...</em>';
      }
      if (typeof text !== 'string') return '';

      const markedApi = window.marked;
      const parseMarkdown = markedApi && (markedApi.parse || markedApi.marked);
      if (!parseMarkdown || !window.DOMPurify) {
        return escapeHTML(text).replace(/\n/g, '<br>');
      }

      if (!markdownParserConfigured && markedApi.setOptions) {
        if (markedApi.Renderer && markedApi.use) {
          const safeRenderer = new markedApi.Renderer();
          safeRenderer.html = (token) => escapeHTML(token.raw || token.text || '');
          markedApi.use({ renderer: safeRenderer });
        }
        markedApi.setOptions({
          gfm: true,
          breaks: true,
          silent: true
        });
        markdownParserConfigured = true;
      }

      const translations = [];
      const translationPrefix = `__translation_${Date.now()}_${Math.random().toString(36).slice(2)}_`;
      let processed = text.replace(/<translation>(.*?)<\/translation>/gs, (_, translation) => {
        const placeholder = `${translationPrefix}${translations.length}__`;
        translations.push({
          placeholder,
          html: `<span class="translation-line">${escapeHTML(translation)}</span>`
        });
        return placeholder;
      });
      const html = parseMarkdown.call(markedApi, processed);
      let sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
          'ul', 'ol', 'li', 'a', 'span', 'h1', 'h2', 'h3', 'h4',
          'h5', 'h6', 'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        ALLOWED_ATTR: ['href', 'title', 'class'],
        ALLOW_DATA_ATTR: false
      });
      translations.forEach(({ placeholder, html }) => {
        sanitized = sanitized.replaceAll(placeholder, html);
      });
      return sanitized;
    }

    // Subtitle management for Immersive Orb Mode with fade-in/fade-out transitions
    let chatAbortController = null;
    let currentSendBtnState = 'send';
    let thinkingStartTime = null;
    let thinkingTimerInterval = null;
    let markdownParserConfigured = false;
    let currentSentences = [];
    let currentSentenceTimes = []; // { start, end } for each sentence
    let activeSentenceIndex = -1;
    let subtitleTimer = null; // fallback timer for no-audio playback
    let lastRenderedIndex = -1;
    let lastRenderedState = '';
    let isTransitioningSubtitle = false;

    function setOrbSubtitleSimple(text) {
      const subtitleEl = document.getElementById('orb-subtitle');
      if (!subtitleEl) return;
      if (subtitleTimer) {
        clearTimeout(subtitleTimer);
        subtitleTimer = null;
      }
      currentSentences = [];
      currentSentenceTimes = [];
      activeSentenceIndex = -1;
      lastRenderedIndex = -1;
      lastRenderedState = '';
      subtitleEl.textContent = text;
      subtitleEl.className = '';
    }

    function typewriteSubtitle(text, willPlayAudio = false) {
      const subtitleEl = document.getElementById('orb-subtitle');
      if (!subtitleEl) return;

      // Clear any active timers
      if (subtitleTimer) {
        clearTimeout(subtitleTimer);
        subtitleTimer = null;
      }

      // Reset sync state
      currentSentences = [];
      currentSentenceTimes = [];
      activeSentenceIndex = -1;
      lastRenderedIndex = -1;
      lastRenderedState = '';
      if (typeof isTransitioningSubtitle !== 'undefined') {
        isTransitioningSubtitle = false;
      }

      if (text === 'Thinking...' || text === '') {
        subtitleEl.innerHTML = '';
        subtitleEl.className = '';
        return;
      }

      if (text.startsWith('❌')) {
        subtitleEl.innerHTML = `<span style="color:var(--neon-pink)">${escapeHTML(text)}</span>`;
        subtitleEl.className = '';
        return;
      }

      // Parse sentences and translations
      currentSentences = parseSentences(text);
      if (currentSentences.length === 0) {
        subtitleEl.innerHTML = '';
        subtitleEl.className = '';
        return;
      }

      if (willPlayAudio) {
        // Just show the first sentence statically, audio timeupdate will handle transitions
        showSentenceDirect(0);
      } else {
        // Fallback: use the timer
        startFallbackSubtitleTimer();
      }
    }

    function parseSentences(rawText) {
      function cleanMarkdown(str) {
        if (!str) return '';
        // Also strip any leftover HTML tags like unclosed <translation> to keep visual display clean
        return str.replace(/\*\*([^*]+)\*\*/g, '$1')
                  .replace(/\*([^*]+)\*/g, '$1')
                  .replace(/__([^_]+)__/g, '$1')
                  .replace(/_([^_]+)_/g, '$1')
                  .replace(/`([^`]+)`/g, '$1')
                  .replace(/<\/?[^>]+(>|$)/g, '')
                  .trim();
      }

      // Check if translation is enabled in settings
      const transEnable = localStorage.getItem('translate_enable') === 'true';

      const sentences = [];
      if (transEnable && (rawText.includes('<translation>') || rawText.includes('<translation'))) {
        // Parse sentences with translation tags, supporting optional/unclosed translation blocks
        const regex = /([^<]+)(?:<translation>([^<]*)(?:<\/translation>)?)?/gi;
        let match;
        while ((match = regex.exec(rawText)) !== null) {
          const eng = match[1] ? match[1].trim() : '';
          const trans = match[2] ? match[2].trim() : '';
          if (!eng && !trans) continue;
          
          sentences.push({
            text: cleanMarkdown(eng),
            translation: cleanMarkdown(trans)
          });
        }
      } else {
        // No translation tags or translation is disabled, split by sentence endings.
        // Even if rawText contains translation tags, if transEnable is false, we strip them out and only show the main text.
        let cleanText = rawText;
        if (!transEnable) {
          cleanText = rawText.replace(/<translation>.*?<\/translation>/gi, '');
          cleanText = cleanText.replace(/<translation>[^<]*/gi, ''); // strip unclosed
        }
        
        const parts = cleanText.split(/(?<=[。！？.!?])\s*/);
        parts.forEach(part => {
          if (part.trim()) {
            sentences.push({
              text: cleanMarkdown(part.trim()),
              translation: ''
            });
          }
        });
      }
      return sentences;
    }

    function calculateSentenceTimes(duration) {
      if (!duration || !Number.isFinite(duration) || duration <= 0) return;
      
      // Spoken text is s.text (translation is visual and not spoken, so it is excluded from length-based timing)
      const totalLen = currentSentences.reduce((acc, s) => acc + s.text.length, 0);
      let elapsed = 0;
      currentSentenceTimes = currentSentences.map(s => {
        const sLen = s.text.length;
        const percent = totalLen > 0 ? (sLen / totalLen) : (1 / currentSentences.length);
        const sDuration = duration * percent;
        const start = elapsed;
        const end = elapsed + sDuration;
        elapsed = end;
        return { start, end };
      });
    }

    function updateSubtitleSync(currentTime, duration) {
      if (!currentSentences || currentSentences.length === 0 || isTransitioningSubtitle) return;
      
      if (Number.isFinite(duration) && duration > 0) {
        const needsCalculation = currentSentenceTimes.length === 0 || 
                                 Math.abs(currentSentenceTimes[currentSentenceTimes.length - 1].end - duration) > 0.05;
        if (needsCalculation) {
          calculateSentenceTimes(duration);
        }
      }
      
      if (currentSentenceTimes.length === 0) {
        showSentenceDirect(0);
        return;
      }
      
      // Find which sentence we are in
      let index = currentSentenceTimes.findIndex(t => currentTime >= t.start && currentTime <= t.end);
      if (index === -1) {
        if (currentTime > currentSentenceTimes[currentSentenceTimes.length - 1].end) {
          index = currentSentences.length; // Finished
        } else {
          index = 0;
        }
      }
      
      if (index >= currentSentences.length) {
        // Finished all sentences, clear with fade-out
        const subtitleEl = document.getElementById('orb-subtitle');
        if (subtitleEl && lastRenderedIndex !== -2) {
          lastRenderedIndex = -2;
          subtitleEl.className = 'fading-out';
          setTimeout(() => {
            subtitleEl.innerHTML = '';
            subtitleEl.className = '';
          }, 300);
        }
        return;
      }
      
      if (lastRenderedIndex !== index) {
        const prevIndex = lastRenderedIndex;
        lastRenderedIndex = index;
        
        const subtitleEl = document.getElementById('orb-subtitle');
        if (!subtitleEl) return;
        
        const s = currentSentences[index];
        if (!s) return;
        
        if (prevIndex !== -1 && prevIndex !== -2) {
          // Fade out first, then fade in the new one
          isTransitioningSubtitle = true;
          subtitleEl.className = 'fading-out';
          setTimeout(() => {
            subtitleEl.innerHTML = `
              <span class="english-line">${escapeHTML(s.text)}</span>
              ${s.translation ? `<span class="translation-line">${escapeHTML(s.translation)}</span>` : ''}
            `;
            subtitleEl.className = 'fading-in';
            void subtitleEl.offsetWidth; // Force reflow
            subtitleEl.className = '';
            isTransitioningSubtitle = false;
          }, 300);
        } else {
          // Direct fade-in for the first sentence
          subtitleEl.innerHTML = `
            <span class="english-line">${escapeHTML(s.text)}</span>
            ${s.translation ? `<span class="translation-line">${escapeHTML(s.translation)}</span>` : ''}
          `;
          subtitleEl.className = 'fading-in';
          void subtitleEl.offsetWidth; // Force reflow
          subtitleEl.className = '';
        }
      }
    }

    function showSentenceDirect(index) {
      const subtitleEl = document.getElementById('orb-subtitle');
      if (!subtitleEl) return;
      const s = currentSentences[index];
      if (!s) return;
      
      if (lastRenderedIndex === index) return;
      lastRenderedIndex = index;
      
      subtitleEl.innerHTML = `
        <span class="english-line">${escapeHTML(s.text)}</span>
        ${s.translation ? `<span class="translation-line">${escapeHTML(s.translation)}</span>` : ''}
      `;
      subtitleEl.className = '';
    }

    function startFallbackSubtitleTimer() {
      if (subtitleTimer) clearTimeout(subtitleTimer);
      
      let index = 0;
      
      function nextSentence() {
        if (index >= currentSentences.length) {
          const subtitleEl = document.getElementById('orb-subtitle');
          if (subtitleEl) {
            subtitleEl.className = 'fading-out';
            setTimeout(() => {
              subtitleEl.innerHTML = '';
              subtitleEl.className = '';
            }, 300);
          }
          return;
        }
        
        const subtitleEl = document.getElementById('orb-subtitle');
        if (subtitleEl) {
          if (index > 0) {
            subtitleEl.className = 'fading-out';
            setTimeout(() => {
              showSentenceFallback(index);
            }, 300);
          } else {
            showSentenceFallback(index);
          }
        }
      }
      
      function showSentenceFallback(idx) {
        const s = currentSentences[idx];
        const subtitleEl = document.getElementById('orb-subtitle');
        if (!subtitleEl || !s) return;
        
        subtitleEl.innerHTML = `
          <span class="english-line">${escapeHTML(s.text)}</span>
          ${s.translation ? `<span class="translation-line">${escapeHTML(s.translation)}</span>` : ''}
        `;
        subtitleEl.className = 'fading-in';
        void subtitleEl.offsetWidth; // Force reflow
        subtitleEl.className = '';
        
        const charCount = s.text.length + (s.translation ? s.translation.length : 0);
        const delay = Math.min(7000, 2500 + charCount * 80);
        
        index++;
        subtitleTimer = setTimeout(nextSentence, delay);
      }
      
      nextSentence();
    }

    // UI Helper Functions
    function appendMessage(role, text, id = null) {
      const chatWindow = document.getElementById('chat-window');
      const row = document.createElement('div');
      row.className = `message-row ${role}`;
      if (id) row.id = id;

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      
      if (role === 'user') {
        bubble.innerText = text;
      } else {
        bubble.innerHTML = formatMessageText(text);
      }

      row.appendChild(bubble);
      chatWindow.appendChild(row);
    }

    function updateMessage(id, text) {
      const row = document.getElementById(id);
      if (!row) return;
      const bubble = row.querySelector('.bubble');
      if (bubble) {
        bubble.innerHTML = formatMessageText(text);
      }
    }

    // Audio Analysis setup for Orb Mode
    let activeSpeechMessageId = null;

    function formatTime(secs) {
      if (isNaN(secs) || secs === Infinity) return '00:00';
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = Math.floor(secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }

    function updateTechStatus(status) {
      const statusText = document.getElementById('tech-status-text');
      const statusDot = document.getElementById('tech-status-dot');
      if (statusText) statusText.innerText = status;
      if (statusDot) {
        statusDot.className = 'status-dot';
        if (status === 'speaking') {
          statusDot.classList.add('speaking');
        } else if (status === 'recording') {
          statusDot.classList.add('recording');
        } else if (status === 'thinking') {
          statusDot.classList.add('thinking');
        }
      }

      // Manage visibility of time indicators
      const thinkingSep = document.getElementById('tech-thinking-separator');
      const thinkingTime = document.getElementById('tech-thinking-time');
      const durationSep = document.getElementById('tech-duration-separator');
      const durationVal = document.getElementById('tech-duration');

      if (thinkingSep) thinkingSep.style.display = (status === 'thinking') ? 'inline' : 'none';
      if (thinkingTime) thinkingTime.style.display = (status === 'thinking') ? 'inline' : 'none';
      if (durationSep) durationSep.style.display = (status === 'speaking') ? 'inline' : 'none';
      if (durationVal) durationVal.style.display = (status === 'speaking') ? 'inline' : 'none';

      // Sync send button state with tech status
      if (status === 'speaking' || status === 'thinking') {
        updateSendBtnState('stop');
      } else {
        updateSendBtnState('send');
      }
    }

    function updateSendBtnState(state) {
      const sendBtn = document.getElementById('send-btn');
      if (!sendBtn) return;
      
      currentSendBtnState = state;
      if (state === 'stop') {
        sendBtn.classList.add('stop-state');
        sendBtn.title = '终止';
        sendBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
          </svg>
        `;
      } else {
        sendBtn.classList.remove('stop-state');
        sendBtn.title = '发送';
        sendBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        `;
      }
    }

    function startThinkingTimer() {
      if (thinkingTimerInterval) {
        clearInterval(thinkingTimerInterval);
      }
      thinkingStartTime = Date.now();
      const thinkingTimeEl = document.getElementById('tech-thinking-time');
      if (thinkingTimeEl) {
        thinkingTimeEl.innerText = 'thinking time: 00s';
      }
      thinkingTimerInterval = setInterval(() => {
        if (!thinkingStartTime) return;
        const elapsed = Math.floor((Date.now() - thinkingStartTime) / 1000);
        if (thinkingTimeEl) {
          thinkingTimeEl.innerText = `thinking time: ${elapsed.toString().padStart(2, '0')}s`;
        }
      }, 1000);
    }

    function stopThinkingTimer() {
      if (thinkingTimerInterval) {
        clearInterval(thinkingTimerInterval);
        thinkingTimerInterval = null;
      }
      if (thinkingStartTime) {
        const elapsed = Math.floor((Date.now() - thinkingStartTime) / 1000);
        const thinkingTimeEl = document.getElementById('tech-thinking-time');
        if (thinkingTimeEl) {
          thinkingTimeEl.innerText = `thinking time: ${elapsed.toString().padStart(2, '0')}s`;
        }
        thinkingStartTime = null;
      }
    }

    function handleCancelCurrentAction() {
      console.log('Cancelling current action...');
      stopThinkingTimer();
      
      // 1. Abort fetch request
      if (chatAbortController) {
        chatAbortController.abort();
        chatAbortController = null;
      }
      
      // 2. Stop audio playback
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
      }
      
      // 3. Reset animations & UI states
      stopThinkingAnimation();
      stopOrbAnimation();
      stopAllWaveforms();
      if (currentViewMode === 'orb') {
        startNebulaLoop();
        
        // Clear subtitle with fade-out
        const subtitleEl = document.getElementById('orb-subtitle');
        if (subtitleEl) {
          subtitleEl.className = 'fading-out';
          setTimeout(() => {
            subtitleEl.innerHTML = '';
            subtitleEl.className = '';
          }, 500);
        }
        currentSentences = [];
        currentSentenceTimes = [];
      }
      
      // 4. Update tech status
      updateTechStatus('idle');
    }

    function getGlobalAudio() {
      if (!currentAudio) {
        currentAudio = new Audio();
        
        currentAudio.onplay = function() {
          if (activeSpeechMessageId) {
            const row = document.getElementById(activeSpeechMessageId);
            if (row) {
              const visualizer = row.querySelector('.waveform-visualizer');
              const playIcon = row.querySelector('.play-icon');
              const textLabel = row.querySelector('.bubble-audio-btn span');
              if (visualizer) visualizer.classList.add('playing');
              if (playIcon) playIcon.style.display = 'none';
              if (textLabel) textLabel.innerText = '正在播放语音';
            }
          }
          
          updateTechStatus('speaking');

          if (currentViewMode === 'orb') {
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            stopThinkingAnimation();
            startOrbAnimation();
          }
        };

        currentAudio.onpause = function() {
          if (activeSpeechMessageId) {
            const row = document.getElementById(activeSpeechMessageId);
            if (row) {
              const visualizer = row.querySelector('.waveform-visualizer');
              const playIcon = row.querySelector('.play-icon');
              const textLabel = row.querySelector('.bubble-audio-btn span');
              if (visualizer) visualizer.classList.remove('playing');
              if (playIcon) playIcon.style.display = 'block';
              if (textLabel) textLabel.innerText = '暂停播放';
            }
          }
          updateTechStatus('idle');
          stopOrbAnimation();
          if (currentViewMode === 'orb') {
            startNebulaLoop();
          }
        };

        currentAudio.onended = function() {
          if (activeSpeechMessageId) {
            const row = document.getElementById(activeSpeechMessageId);
            if (row) {
              const visualizer = row.querySelector('.waveform-visualizer');
              const playIcon = row.querySelector('.play-icon');
              const textLabel = row.querySelector('.bubble-audio-btn span');
              if (visualizer) visualizer.classList.remove('playing');
              if (playIcon) playIcon.style.display = 'block';
              if (textLabel) textLabel.innerText = '重新播放';
            }
          }
          updateTechStatus('idle');
          stopOrbAnimation();
          if (currentViewMode === 'orb') {
            startNebulaLoop();
            
            // Clear subtitle with fade-out
            const subtitleEl = document.getElementById('orb-subtitle');
            if (subtitleEl) {
              subtitleEl.className = 'fading-out';
              setTimeout(() => {
                subtitleEl.innerHTML = '';
                subtitleEl.className = '';
              }, 500);
            }
            // Reset subtitle sentences so that timeupdate doesn't run anymore
            currentSentences = [];
            currentSentenceTimes = [];
          }
        };

        currentAudio.addEventListener('timeupdate', () => {
          const durationEl = document.getElementById('tech-duration');
          if (durationEl) {
            const cur = formatTime(currentAudio.currentTime);
            const total = formatTime(currentAudio.duration);
            durationEl.innerText = `${cur} / ${total}`;
          }

          if (currentViewMode === 'orb' && currentSentences.length > 0) {
            // Cancel fallback timer since we now have active audio timeupdate
            if (subtitleTimer) {
              clearTimeout(subtitleTimer);
              subtitleTimer = null;
            }
            updateSubtitleSync(currentAudio.currentTime, currentAudio.duration);
          }
        });
        
        setupAudioAnalysis(currentAudio);
      }
      return currentAudio;
    }

    function setupAudioAnalysis(audioElement) {
      try {
        if (!audioCtx) {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          analyserNode = audioCtx.createAnalyser();
          analyserNode.fftSize = 64; 
        }
        
        if (!sourceNode) {
          sourceNode = audioCtx.createMediaElementSource(audioElement);
          sourceNode.connect(analyserNode);
          analyserNode.connect(audioCtx.destination);
        }
      } catch (e) {
        console.warn("Failed to hook AudioContext:", e);
      }
    }

    // Orb Mode animations (breathing, speaking, thinking, recording)
    let idleAnimationId = null;
    let thinkingAnimationId = null;

    function startNebulaLoop() {
      const container = document.getElementById('voice-orb-container');
      const orb = document.getElementById('voice-orb');
      
      let angle = 0;
      
      function animateIdle() {
        if (currentViewMode !== 'orb' || isRecording || (currentAudio && !currentAudio.paused) || thinkingAnimationId) {
          idleAnimationId = null;
          return;
        }
        idleAnimationId = requestAnimationFrame(animateIdle);
        angle += 0.025; // 4.2s cycle
        const scale = 0.95 + Math.sin(angle) * 0.05; // gentle breathing between 0.90 and 1.00
        const opacity = 0.75 + Math.sin(angle) * 0.15; // gentle opacity breathing between 0.60 and 0.90
        
        if (container) {
          container.style.transform = `scale(${scale})`;
          container.style.opacity = opacity;
        }
        if (orb) {
          const glowRadius = 15 + Math.sin(angle) * 5;
          orb.style.boxShadow = `0 0 ${glowRadius}px rgba(139, 92, 246, 0.25)`;
        }
      }
      
      if (idleAnimationId) cancelAnimationFrame(idleAnimationId);
      animateIdle();
    }

    function stopNebulaLoop() {
      if (idleAnimationId) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
      }
      resetOrbAndRings();
    }

    function startOrbAnimation() {
      if (!analyserNode) return;
      
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      const container = document.getElementById('voice-orb-container');
      const orb = document.getElementById('voice-orb');
      const ring1 = document.getElementById('orb-ring-1');
      const ring2 = document.getElementById('orb-ring-2');
      const ring3 = document.getElementById('orb-ring-3');
      const ring4 = document.getElementById('orb-ring-4');
      
      updateTechStatus('speaking');
      
      let angle = 0;
      let smoothAverage = 0;
      
      function draw() {
        if (currentViewMode !== 'orb' || !currentAudio || currentAudio.paused) {
          animationFrameId = null;
          return;
        }
        animationFrameId = requestAnimationFrame(draw);
        analyserNode.getByteFrequencyData(dataArray);
        
        let total = 0;
        for (let i = 0; i < dataArray.length; i++) {
          total += dataArray[i];
        }
        const average = total / dataArray.length; // 0 to 255
        smoothAverage = smoothAverage * 0.7 + average * 0.3;
        
        // Base sine wave breathing
        angle += 0.025;
        const baseScale = 0.95 + Math.sin(angle) * 0.05;
        const baseOpacity = 0.75 + Math.sin(angle) * 0.15;
        
        // Blend factor: 0 when silent, 1 when loud
        const audioFactor = Math.min(1.0, smoothAverage / 40);
        
        // Target scale/opacity
        const targetScale = baseScale * (1 - audioFactor) + (1.0 + (smoothAverage / 70)) * audioFactor;
        const finalScale = Math.min(1.35, targetScale); // Limit scale to 1.35x
        
        const finalOpacity = baseOpacity * (1 - audioFactor) + 1.0 * audioFactor;
        
        if (container) {
          container.style.transform = `scale(${finalScale})`;
          container.style.opacity = finalOpacity;
        }
        
        if (orb) {
          const glowRadius = 15 + smoothAverage * 0.5;
          const purpleGlow = `rgba(139, 92, 246, ${0.25 + (smoothAverage / 255) * 0.55})`;
          orb.style.boxShadow = `0 0 ${glowRadius}px ${purpleGlow}`;
          
          // Speed up the liquid-blob animation during speech by modifying the animation-duration
          const animSpeed = 8 - Math.min(6, (smoothAverage / 30) * 5); // 8s down to 2s
          orb.style.animationDuration = `${animSpeed}s`;
        }
        
        if (ring1) {
          ring1.style.transform = `scale(${1.0 + (smoothAverage / 150)})`;
          ring1.style.opacity = 0.15 + (smoothAverage / 255) * 0.45;
        }
        if (ring2) {
          ring2.style.transform = `scale(${1.0 + (smoothAverage / 120)})`;
          ring2.style.opacity = 0.12 + (smoothAverage / 255) * 0.38;
        }
        if (ring3) {
          ring3.style.transform = `scale(${1.0 + (smoothAverage / 90)})`;
          ring3.style.opacity = 0.10 + (smoothAverage / 255) * 0.30;
        }
        if (ring4) {
          ring4.style.transform = `scale(${1.0 + (smoothAverage / 60)})`;
          ring4.style.opacity = 0.08 + (smoothAverage / 255) * 0.22;
        }
      }
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      draw();
    }

    function stopOrbAnimation() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      updateTechStatus('idle');
      resetOrbAndRings();
    }

    function startRecordingOrbAnimation() {
      const container = document.getElementById('voice-orb-container');
      const orb = document.getElementById('voice-orb');
      const ring1 = document.getElementById('orb-ring-1');
      const ring2 = document.getElementById('orb-ring-2');
      const ring3 = document.getElementById('orb-ring-3');
      const ring4 = document.getElementById('orb-ring-4');
      
      let angle = 0;
      updateTechStatus('recording');
      
      function animate() {
        if (currentViewMode !== 'orb' || !isRecording) {
          recordingAnimationId = null;
          return;
        }
        recordingAnimationId = requestAnimationFrame(animate);
        angle += 0.06;
        const amplitude = Math.sin(angle) * 0.08 + 0.08; // 0 to 0.16
        const scale = 1.0 + amplitude;
        
        if (container) {
          container.style.transform = `scale(${scale})`;
          container.style.opacity = 0.9 + amplitude * 0.5;
        }
        if (orb) {
          const glowRadius = 20 + amplitude * 40;
          orb.style.boxShadow = `0 0 ${glowRadius}px rgba(139, 92, 246, 0.4)`;
          orb.style.animationDuration = '3s';
        }
        
        if (ring1) ring1.style.transform = `scale(${1 + amplitude * 0.5}) rotate(${angle * 10}deg)`;
        if (ring2) ring2.style.transform = `scale(${1 + amplitude * 0.8}) rotate(${-angle * 7}deg)`;
        if (ring3) ring3.style.transform = `scale(${1 + amplitude * 1.1}) rotate(${angle * 5}deg)`;
        if (ring4) ring4.style.transform = `scale(${1 + amplitude * 1.4}) rotate(${-angle * 3}deg)`;
      }
      
      if (recordingAnimationId) {
        cancelAnimationFrame(recordingAnimationId);
      }
      if (idleAnimationId) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
      }
      animate();
    }

    function startThinkingAnimation() {
      const container = document.getElementById('voice-orb-container');
      const orb = document.getElementById('voice-orb');
      const ring1 = document.getElementById('orb-ring-1');
      const ring2 = document.getElementById('orb-ring-2');
      const ring3 = document.getElementById('orb-ring-3');
      const ring4 = document.getElementById('orb-ring-4');
      let angle = 0;
      
      function animateThinking() {
        if (currentViewMode !== 'orb') {
          thinkingAnimationId = null;
          return;
        }
        thinkingAnimationId = requestAnimationFrame(animateThinking);
        
        // Fast, tight pulse for computing/thinking state
        angle += 0.15; 
        const scale = 0.94 + Math.sin(angle) * 0.03; // rapid tight vibration
        
        if (container) {
          container.style.transform = `scale(${scale})`;
          container.style.opacity = 0.85;
        }
        if (orb) {
          const glowRadius = 15 + Math.sin(angle) * 6;
          orb.style.boxShadow = `0 0 ${glowRadius}px rgba(139, 92, 246, 0.35)`;
          orb.style.animationDuration = '1.5s';
        }
        
        if (ring1) ring1.style.transform = `scale(1.02) rotate(${angle * 15}deg)`;
        if (ring2) ring2.style.transform = `scale(1.04) rotate(${-angle * 12}deg)`;
        if (ring3) ring3.style.transform = `scale(1.06) rotate(${angle * 9}deg)`;
        if (ring4) ring4.style.transform = `scale(1.08) rotate(${-angle * 6}deg)`;
      }
      
      if (thinkingAnimationId) cancelAnimationFrame(thinkingAnimationId);
      if (idleAnimationId) {
        cancelAnimationFrame(idleAnimationId);
        idleAnimationId = null;
      }
      animateThinking();
    }

    function stopThinkingAnimation() {
      if (thinkingAnimationId) {
        cancelAnimationFrame(thinkingAnimationId);
        thinkingAnimationId = null;
      }
    }

    function resetOrbAndRings() {
      const container = document.getElementById('voice-orb-container');
      const orb = document.getElementById('voice-orb');
      const ring1 = document.getElementById('orb-ring-1');
      const ring2 = document.getElementById('orb-ring-2');
      const ring3 = document.getElementById('orb-ring-3');
      const ring4 = document.getElementById('orb-ring-4');
      
      if (container) {
        container.style.transform = '';
        container.style.opacity = '';
      }
      if (orb) {
        orb.style.transform = '';
        orb.style.borderColor = '';
        orb.style.boxShadow = '';
        orb.style.animationDuration = '';
      }
      if (ring1) ring1.style.transform = '';
      if (ring2) ring2.style.transform = '';
      if (ring3) ring3.style.transform = '';
      if (ring4) ring4.style.transform = '';
    }

    async 
    function togglePinSession(id, event) {
      if(event) event.stopPropagation();
      const session = sessions.find(s => s.id === id);
      if (session) {
        session.is_pinned = !session.is_pinned;
        saveSessions();
        renderSessionsList();
      }
    }

    async function renameSession(e, id) {
      e.stopPropagation();
      const session = sessions.find(s => s.id === id);
      if (!session) return;
      const newTitle = await customPrompt("请输入新的对话名称:", session.title);
      if (newTitle && newTitle.trim()) {
        session.title = newTitle.trim();
        saveSessions();
        renderSessionsList();
        showToast('对话重命名成功！', 1500);
      }
    }

    function stopRecordingOrbAnimation() {
      if (recordingAnimationId) {
        cancelAnimationFrame(recordingAnimationId);
        recordingAnimationId = null;
      }
      resetOrbAndRings();
      if (currentViewMode === 'orb') {
        startNebulaLoop();
      }
    }

    function playSpeech(messageId, base64Audio) {
      const audio = getGlobalAudio();
      
      if (activeSpeechMessageId === messageId && !audio.paused) {
        audio.pause();
        return;
      }
      
      activeSpeechMessageId = messageId;
      audio.pause();
      audio.src = base64Audio;
      
      // Clear fallback timer immediately
      if (subtitleTimer) {
        clearTimeout(subtitleTimer);
        subtitleTimer = null;
      }

      // Reset sentence times and indexing so they are recalculated for this new audio
      currentSentenceTimes = [];
      activeSentenceIndex = -1;
      lastRenderedIndex = -1;
      lastRenderedState = '';
      
      stopAllWaveforms();
      stopOrbAnimation();

      const row = document.getElementById(messageId);
      const bubble = row ? row.querySelector('.bubble') : null;
      
      if (bubble) {
        let audioBtn = bubble.querySelector('.bubble-audio-btn');
        if (!audioBtn) {
          audioBtn = document.createElement('div');
          audioBtn.className = 'bubble-audio-btn';
          audioBtn.innerHTML = `
            <svg class="play-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="display:none">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <div class="waveform-visualizer">
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
              <div class="wave-bar"></div>
            </div>
            <span>正在播放语音</span>
          `;
          bubble.appendChild(audioBtn);
          
          audioBtn.onclick = function(e) {
            e.stopPropagation();
            playSpeech(messageId, base64Audio);
          };
        }
      }

      audio.play().catch(e => {
        console.error('Audio playback failed', e);
        showToast('浏览器自动播放受阻，请点击播放按钮', 3000);
        stopOrbAnimation();
        stopAllWaveforms();
      });
    }

    function stopAllWaveforms() {
      document.querySelectorAll('.waveform-visualizer').forEach(el => {
        el.classList.remove('playing');
      });
      document.querySelectorAll('.bubble-audio-btn span').forEach(el => {
        el.innerText = '重新播放';
      });
      document.querySelectorAll('.bubble-audio-btn .play-icon').forEach(el => {
        el.style.display = 'block';
      });
    }

    function scrollToBottom() {
      const chatWindow = document.getElementById('chat-window');
      chatWindow.scrollTo({
        top: chatWindow.scrollHeight,
        behavior: 'smooth'
      });
    }

  