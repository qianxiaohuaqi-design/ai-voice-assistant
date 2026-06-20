<template>
  <div class="modal-overlay" :class="{ open: isSettingsModalOpen }" @click="closeModalOnOuterClick">
    <div class="modal-sheet" @click.stop>
      <div class="modal-header">
        <div class="modal-title">服务参数配置</div>
        <button class="icon-btn" @click="isSettingsModalOpen = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div style="margin-bottom: 24px;">
          <!-- Theme Selection -->
          <div class="form-group">
            <label class="form-label">界面主题</label>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="theme-select-btn active">深色模式</button>
              <button type="button" class="theme-select-btn">浅色模式</button>
            </div>
          </div>

          <!-- TTS Mode Selector -->
          <div class="form-group">
            <label class="form-label">语音合成模式 (TTS Mode)</label>
            <select class="form-input" v-model="ttsMode" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="elevenlabs">ElevenLabs (高音质，自备 Key)</option>
              <option value="edge">Edge-TTS (免费免配置，推荐)</option>
            </select>
          </div>

          <div class="form-group" v-if="ttsMode === 'elevenlabs'">
            <label class="form-label">ELEVENLABS 语音模型</label>
            <select class="form-input" v-model="elevenlabsModel" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="eleven_multilingual_v2">Multilingual v2 (高质量多语言 - 推荐)</option>
              <option value="eleven_turbo_v2_5">Turbo v2.5 (极速低延迟多语言)</option>
              <option value="eleven_flash_v1">Flash v1 (最快低成本多语言)</option>
              <option value="eleven_monolingual_v1">Monolingual v1 (经典英文单语)</option>
            </select>
          </div>

          <!-- Response Language Selection Dropdown -->
          <div class="form-group">
            <label class="form-label">设置回答语言</label>
            <select class="form-input" v-model="responseLanguage" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="auto">自动 (跟随您所说语言)</option>
              <option value="Chinese">简体中文 (Chinese)</option>
              <option value="English">英文 (English)</option>
              <option value="Japanese">日文 (Japanese)</option>
              <option value="Korean">韩文 (Korean)</option>
              <option value="French">法语 (French)</option>
              <option value="German">德语 (German)</option>
              <option value="Spanish">西班牙语 (Spanish)</option>
              <option value="Italian">意大利语 (Italian)</option>
              <option value="Russian">俄语 (Russian)</option>
            </select>
          </div>

          <!-- Translation Enable Selection -->
          <div class="form-group">
            <label class="form-label">文字翻译设置</label>
            <div class="switch-container" :class="{ active: translateEnable }" @click="translateEnable = !translateEnable">
              <div class="switch-label-group">
                <span class="switch-title">开启文字翻译</span>
                <span class="switch-desc">在回答下方额外输出一份不会读出来的翻译</span>
              </div>
              <div class="switch-toggle"></div>
            </div>
          </div>

          <!-- Translation Target Language Selection Dropdown -->
          <div class="form-group" v-if="translateEnable">
            <label class="form-label">翻译目标语言</label>
            <select class="form-input" v-model="translateTarget" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="Chinese">简体中文 (Chinese)</option>
              <option value="English">英文 (English)</option>
              <option value="Japanese">日文 (Japanese)</option>
              <option value="Korean">韩文 (Korean)</option>
              <option value="French">法语 (French)</option>
              <option value="German">德语 (German)</option>
              <option value="Spanish">西班牙语 (Spanish)</option>
              <option value="Italian">意大利语 (Italian)</option>
              <option value="Russian">俄语 (Russian)</option>
            </select>
          </div>

          <!-- Voice Selection -->
          <div class="form-group" v-if="ttsMode === 'elevenlabs'">
            <label class="form-label">选择语音声音</label>
            <select class="form-input" v-model="voiceId" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="x7tNCivOKFAydss7fglA">星穹铁道 - 黑塔 Herta (默认女声)</option>
              <option value="bVMeCyTHy58xNoL34h3G">原神 - 芙宁娜 Furina</option>
              <option value="JBFqnCBcg639IGvOWKIg">温柔中文女声 (基础版)</option>
              <option v-for="v in customVoices" :key="v.id" :value="v.id">{{ v.name }}</option>
            </select>
          </div>
          <div class="form-group" v-if="ttsMode === 'edge'">
            <label class="form-label">选择 Edge-TTS 声音</label>
            <select class="form-input" v-model="edgeVoice" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="zh-CN-XiaoxiaoNeural">晓晓 (zh-CN-XiaoxiaoNeural - 推荐女声)</option>
              <option value="zh-CN-YunxiNeural">云希 (zh-CN-YunxiNeural - 推荐男声)</option>
              <option value="zh-CN-YunjianNeural">云健 (zh-CN-YunjianNeural - 运动活力男声)</option>
              <option value="zh-CN-XiaoyiNeural">晓伊 (zh-CN-XiaoyiNeural - 甜美女声)</option>
              <option value="zh-CN-YunyangNeural">云扬 (zh-CN-YunyangNeural - 专业男声)</option>
              <option value="zh-CN-XiaochenNeural">晓辰 (zh-CN-XiaochenNeural - 亲切女声)</option>
              <option value="zh-CN-XiaoshuangNeural">晓双 (zh-CN-XiaoshuangNeural - 可爱童声)</option>
              <option value="en-US-AriaNeural">Aria (en-US-AriaNeural - 英文女声)</option>
              <option value="en-US-GuyNeural">Guy (en-US-GuyNeural - 英文男声)</option>
              <option value="en-US-JennyNeural">Jenny (en-US-JennyNeural - 英文女声)</option>
              <option value="ja-JP-NanamiNeural">七海 (ja-JP-NanamiNeural - 日文女声)</option>
              <option value="ja-JP-KeitaNeural">启太 (ja-JP-KeitaNeural - 日文男声)</option>
            </select>
          </div>

          <!-- Orb Font Size -->
          <div class="form-group">
            <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
              星云模式文字大小
              <span style="color: var(--neon-cyan); font-weight: 600; font-size: 0.85rem;">{{ orbFontSize }}px</span>
            </label>
            <input type="range" v-model="orbFontSize" min="12" max="36" step="1" class="form-input" style="width: 100%; padding: 0;">
          </div>
          <!-- Voice Management Area -->
          <VoiceManager />
        </div>

        <div style="border-top: 1px dashed var(--border-color); padding-top: 20px; margin-bottom: 24px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-bottom: 16px; font-family: 'Outfit', sans-serif; letter-spacing: 0.5px; text-transform: uppercase;">开发者 API 配置</div>
          
          <div class="form-group">
            <label class="form-label">大模型选择</label>
            <select class="form-input" v-model="chatModel" style="background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: #fff;">
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="deepseek-reasoner">DeepSeek Reasoner</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">AI 大模型 API KEY</label>
            <input type="password" class="form-input" v-model="anthropicKey" placeholder="填入您的大模型 API Key">
          </div>

          <div class="form-group">
            <label class="form-label">API BASE URL</label>
            <input type="text" class="form-input" v-model="anthropicBase" placeholder="使用官方接口请留空">
          </div>
          
          <div class="form-group" v-if="ttsMode === 'elevenlabs'">
            <label class="form-label">ELEVENLABS API KEY</label>
            <input type="password" class="form-input" v-model="elevenlabsKey" placeholder="填入您的 ElevenLabs Key">
          </div>
        </div>
      </div>
      
      <div class="modal-footer" style="display: flex; gap: 10px;">
        <button class="save-btn" @click="handleSave" style="flex: 1.5; margin-top: 0;">保存并关闭</button>
        <button class="save-btn" @click="handleLogout" style="flex: 1; margin-top: 0; background: #ef4444; box-shadow: 0 0 12px rgba(239, 68, 68, 0.3);">退出登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useSettings } from '../composables/useSettings'
import { useAuth } from '../composables/useAuth'
import { useVoices } from '../composables/useVoices'
import VoiceManager from './VoiceManager.vue'

const { customVoices } = useVoices()

const {
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
  saveSettings
} = useSettings()

const { logout } = useAuth()

const closeModalOnOuterClick = (e) => {
  isSettingsModalOpen.value = false
}

const handleSave = () => {
  saveSettings()
  isSettingsModalOpen.value = false
}

const handleLogout = () => {
  logout()
  isSettingsModalOpen.value = false
}
</script>