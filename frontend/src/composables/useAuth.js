import { ref } from 'vue'

// --- Global singleton state ---
const isAuthModalOpen = ref(false)
const isAuthenticated = ref(false)
const token = ref(localStorage.getItem('auth_token') || '')
const username = ref(localStorage.getItem('username') || '')

export function useAuth() {
  const checkLoginStatus = () => {
    const savedToken = localStorage.getItem('auth_token')
    if (!savedToken) {
      isAuthModalOpen.value = true
      isAuthenticated.value = false
      token.value = ''
    } else {
      isAuthModalOpen.value = false
      isAuthenticated.value = true
      token.value = savedToken
      username.value = localStorage.getItem('username') || ''
    }
  }

  const login = async (mode, user, pass) => {
    const url = mode === 'login' ? '/api/login' : '/api/register'
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return data.detail || '操作失败，请重试'
      }
      
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('username', user)
      token.value = data.token
      username.value = user
      checkLoginStatus()
      return null // No error
    } catch (err) {
      console.error(err)
      return '连接服务器失败'
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    token.value = ''
    username.value = ''
    checkLoginStatus()
  }

  return {
    isAuthModalOpen,
    isAuthenticated,
    token,
    username,
    checkLoginStatus,
    login,
    logout
  }
}
