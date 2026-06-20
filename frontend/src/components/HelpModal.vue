<template>
  <div class="modal-overlay" :class="{ open: isOpen }" @click="closeModalOnOuterClick">
    <div class="modal-sheet" style="max-height: 80vh;" @click.stop>
      <div class="modal-header">
        <div class="modal-title">🤖 智能语音助手说明书</div>
        <button class="icon-btn" @click="$emit('close')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- Tab Navigation Header -->
        <div class="help-tabs">
          <button class="help-tab-btn" :class="{ active: activeTab === 'guide' }" @click="activeTab = 'guide'">📖 基础使用指南</button>
          <button class="help-tab-btn" :class="{ active: activeTab === 'tariffs' }" @click="activeTab = 'tariffs'">💰 模型资费与功能</button>
        </div>

        <!-- TAB 1: Basic Usage Guide -->
        <div class="help-tab-content" :class="{ active: activeTab === 'guide' }">
          <div class="guide-section">
            <div class="guide-card">
              <div class="guide-card-title">🔑 1. 如何配置 API Key 才能开始？</div>
              <div class="guide-card-body">
                <p>点击左下角侧边栏的 <strong>“系统设置”</strong> 按钮，拉到最底部的 <strong>“开发者 API 配置”</strong>：</p>
                <ul>
                  <li><strong>AI 大模型 Key</strong>: 填写您的 API Key。本助手不限制模型渠道，全面支持 DeepSeek, OpenAI, Claude, Gemini, Grok 等各种大模型或第三方中转接口的 API Key。若使用代理或中转接口，可配合在下方填写自定义的代理地址 (Base URL)。</li>
                  <li><strong>ElevenLabs Key</strong>: 填写您的语音合成 API Key，用于生成精美的声音。(若使用 Edge-TTS 免费模式则无需填写)</li>
                </ul>
              </div>
            </div>
            
            <div class="guide-card">
              <div class="guide-card-title">🎙️ 2. 怎么添加和切换语音声音？</div>
              <div class="guide-card-body">
                <p>点击左下角侧边栏的 <strong>“系统设置”</strong>，在中间的 <strong>“声音库管理”</strong> 卡片中：</p>
                <ul>
                  <li>在输入框中填入<strong>自定义声音名称</strong>以及您在 ElevenLabs 官方后台克隆或获取的 <strong>Voice ID</strong>。</li>
                  <li>点击 <strong>“添加新声音”</strong> 成功后，即可在上方 <strong>“选择语音声音”</strong> 下拉菜单中一键切换！</li>
                </ul>
              </div>
            </div>

            <div class="guide-card">
              <div class="guide-card-title">🛡️ 3. 右上角按键功能与省额度秘籍</div>
              <div class="guide-card-body">
                <ul>
                  <li><strong>语音/静音按钮 (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; display: inline-block;"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>)</strong>: 一键开启/关闭语音。当切换为<strong>“纯文字模式”</strong>时，后端会直接跳过语音合成接口，发送请求时不消耗语音额度。</li>
                  <li><strong>星云按钮 (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle; display: inline-block;"><circle cx="12" cy="12" r="10"></circle><path d="M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0"></path></svg>)</strong>: 一键在<strong>“传统聊天面板”</strong>和<strong>“星云模式”</strong>间切换，能带来更沉浸式的交互体验。</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 2: Model Tariffs Table -->
        <div class="help-tab-content" :class="{ active: activeTab === 'tariffs' }">
          <div style="overflow-x: auto; margin-bottom: 20px; max-height: 52vh;">
            <table class="help-table">
              <thead>
                <tr>
                  <th>模型名称</th>
                  <th>分类</th>
                  <th>消耗评级</th>
                  <th>功能与特长</th>
                </tr>
              </thead>
              <tbody>
                <!-- DeepSeek 系列 -->
                <tr class="table-group-row"><td colspan="4">DeepSeek 系列模型</td></tr>
                <tr><td><strong>DeepSeek Chat</strong></td><td><span class="badge badge-cheap">性价比推荐</span></td><td><span class="badge badge-cheap">极低 (约0.007元/万字)</span></td><td>中文对话、日常问答、长文润色与快速翻译，价格超划算，国内首选。</td></tr>
                <tr><td><strong>DeepSeek Reasoner</strong></td><td><span class="badge badge-reasoning">深度推理 (R1)</span></td><td><span class="badge badge-cheap">极低 (约0.04元/万字)</span></td><td>DeepSeek-R1 推理模型，解决数理逻辑、复杂编码与长考难题，带思维链。</td></tr>
                
                <!-- OpenAI GPT 系列 -->
                <tr class="table-group-row"><td colspan="4">OpenAI GPT 系列模型</td></tr>
                <tr><td><strong>GPT-4o Mini</strong></td><td><span class="badge badge-cheap">性价比推荐</span></td><td><span class="badge badge-cheap">极低 (约0.01元/万字)</span></td><td>OpenAI 官方最轻量且实惠的模型。速度极快，适合日常快捷聊天和纠错。</td></tr>
                <tr><td><strong>o3-mini</strong></td><td><span class="badge badge-reasoning">深度推理</span></td><td><span class="badge badge-mid">中等 (约0.1元/万字)</span></td><td>OpenAI 极速推理模型，支持推理思考。擅长理科推导与高难度代码重构。</td></tr>
                <tr><td><strong>GPT-4o</strong></td><td><span class="badge badge-flagship">高智能旗舰</span></td><td><span class="badge badge-expensive">偏高 (约0.35元/万字)</span></td><td>OpenAI 全能王牌旗舰，综合推理、中英双语、各行业任务处理高度均衡稳定。</td></tr>
                
                <!-- AI 大模型系列 -->
                <tr class="table-group-row"><td colspan="4">AI 大模型系列模型</td></tr>
                <tr><td><strong>Claude 3.5 Haiku</strong></td><td><span class="badge badge-cheap">性价比推荐</span></td><td><span class="badge badge-mid">中等 (约0.07元/万字)</span></td><td>Anthropic 极速模型。擅长精细格式输出与高水平翻译，比 Sonnet 省钱。</td></tr>
                <tr><td><strong>Claude 3.7 Sonnet</strong></td><td><span class="badge badge-flagship">高智能旗舰</span></td><td><span class="badge badge-expensive">偏高 (约0.35元/万字)</span></td><td>当前综合实力天花板。代码编写、深度分析和文学写作极佳，可选思维链。</td></tr>
                <tr><td><strong>Claude Opus 4.0</strong></td><td><span class="badge badge-flagship">高智能旗舰</span></td><td><span class="badge badge-expensive">偏高 (约0.35元/万字)</span></td><td>中转特供重制版，回复逻辑极强，擅长高度复杂的学术分析及决策建议。</td></tr>
                
                <!-- Google Gemini 系列 -->
                <tr class="table-group-row"><td colspan="4">Google Gemini 系列模型</td></tr>
                <tr><td><strong>Gemini 3.5 Flash</strong></td><td><span class="badge badge-cheap">性价比推荐</span></td><td><span class="badge badge-cheap">极低 (约0.005元/万字)</span></td><td>Google 最新一代超快速且极低成本模型，长文本处理和多模态交互好。</td></tr>
                <tr><td><strong>Gemini 2.5 Pro</strong></td><td><span class="badge badge-flagship">高智能旗舰</span></td><td><span class="badge badge-mid">中等 (约0.15元/万字)</span></td><td>Google 经典高智商专业模型。极长上下文语义提取和长文档分析能力极佳。</td></tr>
                
                <!-- xAI Grok 系列 -->
                <tr class="table-group-row"><td colspan="4">xAI Grok 系列模型</td></tr>
                <tr><td><strong>Grok 4.2 Fast</strong></td><td><span class="badge badge-flagship">高智能旗舰</span></td><td><span class="badge badge-mid">中等 (约0.08元/万字)</span></td><td>xAI 最新极速版旗舰，包含实时网络搜索，性格直爽率真，回复效率高.</td></tr>
                <tr><td><strong>Grok 4.2 Reasoning</strong></td><td><span class="badge badge-reasoning">深度推理</span></td><td><span class="badge badge-expensive">偏高 (约0.3元/万字)</span></td><td>xAI 深度推理旗舰，专门解决数理逻辑攻坚，思考推导十分严密。</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const activeTab = ref('guide')

const closeModalOnOuterClick = (e) => {
  emit('close')
}
</script>
