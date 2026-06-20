import { ref } from 'vue'

const isAuthModalOpen = ref(false)
const isAuthenticated = ref(false)
const username = ref('')

export function useAuth() {
  const checkLoginStatus = () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      isAuthModalOpen.value = true
      isAuthenticated.value = false
    } else {
      isAuthModalOpen.value = false
      isAuthenticated.value = true
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
      localStorage.setItem('username', user) // store username on login
      checkLoginStatus()
      // Note: In a real implementation we might trigger syncLoadFromServer here
      return null // No error
    } catch (err) {
      console.error(err)
      return '连接服务器失败'
    }
  }
  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('username')
    checkLoginStatus()
  }

  return {
    isAuthModalOpen,
    isAuthenticated,
    username,
    checkLoginStatus,
    login,
    logout
  }
}
