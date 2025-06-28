import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import Dashboard from '@/views/Dashboard.vue'
import Login from '@/views/Login.vue'
import Profile from '@/views/Profile.vue'
import AdminDashboard from '@/views/AdminDashboard.vue' // Add this import

const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true } // Add admin requirement
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard with admin check
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth) {
    const user = await authStore.getCurrentUser()
    if (!user) {
      next('/login')
      return
    }
    
    // Check admin requirement
    if (to.meta.requiresAdmin) {
      try {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', user.id)
          .single()
        
        if (!adminUser) {
          // User is not an admin, redirect to dashboard
          next('/dashboard')
          return
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
        next('/dashboard')
        return
      }
    }
  }
  
  next()
})

export default router
