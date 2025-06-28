<script>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Eye, EyeOff, Sun, Moon, Lock, Mail, User as UserIcon } from 'lucide-vue-next'

export default {
  name: 'Login',
  components: {
    Eye,
    EyeOff,
    Sun,
    Moon,
    Lock,
    Mail,
    UserIcon
  },
  data() {
    return {
      router: useRouter(),
      authStore: useAuthStore(),
      isLogin: true,
      showPassword: false,
      isDarkMode: false,
      form: {
        email: '',
        password: '',
        displayName: ''
      },
      error: '',
      loading: false
    }
  },
  mounted() {
    this.loadTheme()
    this.watchThemeChanges()
  },
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('storage', this.handleStorageChange)
    if (this.themeObserver) {
      this.themeObserver.disconnect()
    }
  },
  methods: {
    async handleSubmit() {
      if (!this.form.email || !this.form.password) {
        this.error = 'Please fill in all fields'
        return
      }

      // Validate display name for sign up
      if (!this.isLogin && !this.form.displayName.trim()) {
        this.error = 'Display name is required for sign up'
        return
      }

      this.loading = true
      this.error = ''

      try {
        if (this.isLogin) {
          await this.authStore.signIn(this.form.email, this.form.password)
        } 
        this.router.push('/dashboard')
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    toggleMode() {
      this.isLogin = !this.isLogin
      this.error = ''
      this.form = { email: '', password: '', displayName: '' }
    },

    toggleTheme() {
      this.isDarkMode = !this.isDarkMode
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light')
      this.applyTheme()
    },

    loadTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
      } else {
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
      }
      this.applyTheme()
    },

    applyTheme() {
      if (this.isDarkMode) {
        document.documentElement.classList.add('dark')
        document.body.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
        document.body.classList.remove('dark')
      }
    },

    watchThemeChanges() {
      // Watch for localStorage changes (when theme is changed from dashboard)
      this.handleStorageChange = (e) => {
        if (e.key === 'theme') {
          this.isDarkMode = e.newValue === 'dark'
        }
      }
      window.addEventListener('storage', this.handleStorageChange)

      // Watch for DOM class changes
      this.themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark')
            if (this.isDarkMode !== isDark) {
              this.isDarkMode = isDark
            }
          }
        })
      })

      this.themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
      })
      this.themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      })

      // Initial check
      const isDark = document.documentElement.classList.contains('dark') || 
                    document.body.classList.contains('dark')
      this.isDarkMode = isDark
    }
  }
}
</script>

<template>
  <div :class="['login-container', { 'dark': isDarkMode }]">
    <!-- Theme Toggle -->
    <div class="theme-toggle">
      <button
        @click="toggleTheme"
        class="theme-toggle-button"
        :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <Sun v-if="isDarkMode" class="theme-icon" />
        <Moon v-else class="theme-icon" />
      </button>
    </div>

    <div class="login-content">
      <div class="login-card">
        <!-- Header -->
        <div class="login-header">
          <div class="logo-container">
            <div class="logo-icon">
              <Lock class="logo" />
            </div>
          </div>
 <h2 class="login-title">Welcome Back</h2>
<p class="login-subtitle">Sign in to your account</p>
        </div>
        
        <!-- Form -->
        <form class="login-form" @submit.prevent="handleSubmit">
          <!-- Email Field -->
          <div class="form-group">
            <label for="email" class="form-label">Email Address</label>
            <div class="input-wrapper">
              <div class="input-icon">
                <Mail class="icon" />
              </div>
              <input
                id="email"
                v-model="form.email"
                name="email"
                type="email"
                autocomplete="email"
                required
                class="form-input"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <!-- Display Name Field (Sign Up Only) -->
          <div v-if="!isLogin" class="form-group">
            <label for="displayName" class="form-label">Display Name</label>
            <div class="input-wrapper">
              <div class="input-icon">
                <UserIcon class="icon" />
              </div>
              <input
                id="displayName"
                v-model="form.displayName"
                name="displayName"
                type="text"
                required
                class="form-input"
                placeholder="Enter your display name"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <div class="password-wrapper">
              <div class="input-icon">
                <Lock class="icon" />
              </div>
              <input
                id="password"
                v-model="form.password"
                name="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                class="form-input password-input"
                placeholder="Enter your password"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="password-toggle"
              >
                <Eye v-if="!showPassword" class="icon" />
                <EyeOff v-else class="icon" />
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-message">
            <p class="error-text">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="loading"
            class="submit-button"
          >
            <span v-if="loading" class="loading-spinner"></span>
            {{ loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account') }}
          </button>


        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.login-container {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-gradient-start: #f0f9ff;
  --bg-gradient-end: #e0f2fe;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-container.dark {
  --bg-primary: #1e293b;
  --bg-secondary: #0f172a;
  --bg-gradient-start: #0f172a;
  --bg-gradient-end: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #475569;
  --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* Container */
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
  padding: 3rem 1rem;
  position: relative;
  transition: var(--transition);
}

/* Theme Toggle */
.theme-toggle {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 10;
}

.theme-toggle-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow);
  color: var(--text-secondary);
}

.theme-toggle-button:hover {
  background-color: var(--bg-secondary);
  transform: scale(1.05);
  color: var(--text-primary);
}

.theme-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Content */
.login-content {
  width: 100%;
  max-width: 28rem;
}

.login-card {
  background-color: var(--bg-primary);
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: var(--transition);
}

/* Header */
.login-header {
  padding: 2rem 2rem 1rem 2rem;
  text-align: center;
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
  color: white;
}

.logo-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.logo-icon {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 1rem;
  border-radius: 50%;
  backdrop-filter: blur(10px);
}

.logo {
  width: 2rem;
  height: 2rem;
  color: white;
}

.login-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.login-subtitle {
  font-size: 0.875rem;
  opacity: 0.9;
  margin: 0;
}

/* Form */
.login-form {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

/* Input Wrappers */
.input-wrapper,
.password-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  transition: var(--transition);
  z-index: 2;
}

.password-toggle:hover {
  color: var(--text-primary);
}

.icon {
  width: 1rem;
  height: 1rem;
}

/* Form Inputs */
.form-input {
  width: 100%;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition);
}

.password-input {
  padding-right: 2.5rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: var(--text-muted);
}

/* Error Message */
.error-message {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.login-container.dark .error-message {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.error-text {
  color: var(--danger-color);
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
  font-weight: 500;
}

/* Submit Button */
.submit-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Toggle Mode */
.toggle-mode {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

.toggle-button {
  color: var(--primary-color);
  font-size: 0.875rem;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  transition: var(--transition);
}

.toggle-button:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 640px) {
  .login-container {
    padding: 1rem;
  }
  
  .theme-toggle {
    top: 1rem;
    right: 1rem;
  }
  
  .login-header {
    padding: 1.5rem 1.5rem 1rem 1.5rem;
  }
  
  .login-form {
    padding: 1.5rem;
  }
  
  .theme-toggle-button {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .theme-icon {
    width: 1rem;
    height: 1rem;
  }
}

/* Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-card {
  animation: fadeIn 0.6s ease-out;
}
</style>
