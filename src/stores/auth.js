import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const loading = ref(false)

  const displayName = computed(() => {
    return user.value?.user_metadata?.display_name || 
           user.value?.user_metadata?.full_name || 
           user.value?.email?.split('@')[0] || 
           'User'
  })

  const isAuthenticated = () => {
    return user.value !== null
  }


  async function signIn(email, password) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      user.value = data.user
      return data
    } catch (error) {
      throw error
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    user.value = null
  }

  async function getCurrentUser() {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      user.value = currentUser
      return currentUser
    } catch (error) {
      console.error('Error getting current user:', error)
      user.value = null
      return null
    }
  }

  return {
    user,
    loading,
    displayName,
    isAuthenticated,
    signIn,
    signOut,
    getCurrentUser
  }
})
