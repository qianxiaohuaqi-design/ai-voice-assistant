<template>
  <div class="auth-overlay active">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-icon"></div>
        <div class="auth-title">{{ authMode === 'login' ? '登录您的语音助手' : '注册新账号' }}</div>
      </div>
      <div class="auth-subtitle" style="display: none;">
        {{ authMode === 'login' ? '请输入您的账号密码进行身份验证' : '请设置您的用户名 and 密码以创建专属空间' }}
      </div>
      
      <div class="form-group" style="margin-top: 10px;">
        <label class="form-label" for="auth-username">用户名</label>
        <input type="text" class="form-input" id="auth-username" v-model="usernameInput" placeholder="输入用户名" @keyup.enter="handleSubmit">
      </div>
      
      <div class="form-group" style="margin-top: 15px; margin-bottom: 24px;">
        <label class="form-label" for="auth-password">密码</label>
        <input type="password" class="form-input" id="auth-password" v-model="passwordInput" placeholder="输入密码" @keyup.enter="handleSubmit">
      </div>

      <div class="auth-error" v-if="errMsg" style="color: var(--neon-pink); font-size: 0.85rem; margin-bottom: 15px; text-align: center;">
        {{ errMsg }}
      </div>
      
      <button class="save-btn" @click="handleSubmit">
        {{ authMode === 'login' ? '登录' : '创建账号' }}
      </button>
      
      <div class="auth-switch-link" @click="toggleMode">
        {{ authMode === 'login' ? '还没有账号？点击注册' : '已有账号？点击登录' }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { login } = useAuth()

const authMode = ref('login')
const usernameInput = ref('')
const passwordInput = ref('')
const errMsg = ref('')

const toggleMode = () => {
  authMode.value = authMode.value === 'login' ? 'register' : 'login'
  errMsg.value = ''
}

const handleSubmit = async () => {
  const user = usernameInput.value.trim()
  const pass = passwordInput.value

  if (!user || !pass) {
    errMsg.value = '用户名和密码不能为空'
    return
  }
  if (pass.length < 6) {
    errMsg.value = '密码长度必须至少为6位'
    return
  }

  errMsg.value = ''
  try {
    const error = await login(authMode.value, user, pass)
    if (error) {
      errMsg.value = error
    }
  } catch (err) {
    console.error(err)
    errMsg.value = '连接服务器失败'
  }
}
</script>

<style scoped>
/* Scoped styles can be omitted because global styles define .auth-overlay etc. */
</style>