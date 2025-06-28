<script>
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, User, Mail, Save, Eye, EyeOff } from 'lucide-vue-next'

export default {
  name: 'Profile',
  components: {
    ArrowLeft,
    User,
    Mail,
    Save,
    Eye,
    EyeOff
  },
  data() {
    return {
      authStore: useAuthStore(),
      loading: false,
      saving: false,
      showPassword: false,
      isDarkMode: false,
      form: {
        email: '',
        displayName: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      errors: {},
      successMessage: '',
      userStats: {
        totalProjects: 0,
        totalActivities: 0,
        completedActivities: 0
      }
    }
  },
  async mounted() {
    this.loadTheme()
    this.watchThemeChanges()
    await this.loadUserProfile()
    await this.loadUserStats()
  },
  beforeUnmount() {
    // Clean up event listeners
    window.removeEventListener('storage', this.handleStorageChange)
    if (this.themeObserver) {
      this.themeObserver.disconnect()
    }
  },
  methods: {
    async loadUserProfile() {
      this.loading = true
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          this.form.email = user.email || ''
          // Load display name from user metadata
          this.form.displayName = user.user_metadata?.display_name || 
                                  user.user_metadata?.full_name || 
                                  user.email?.split('@')[0] || ''
        }
      } catch (error) {
        console.error('Error loading profile:', error)
      } finally {
        this.loading = false
      }
    },
    
    async loadUserStats() {
      try {
        const user = this.authStore.user
        if (!user) return

        // Get projects count
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
        
        // Get activities created by user
        const { data: activities } = await supabase
          .from('activities')
          .select('progress, created_by')
          .eq('created_by', user.email)
        
        this.userStats.totalProjects = projects?.length || 0
        this.userStats.totalActivities = activities?.length || 0
        this.userStats.completedActivities = activities?.filter(a => 
          parseFloat(a.progress) >= 100
        ).length || 0
        
      } catch (error) {
        console.error('Error loading user stats:', error)
      }
    },
    
    validateForm() {
      this.errors = {}
      
      // Email validation
      if (!this.form.email.trim()) {
        this.errors.email = 'Email is required'
      } else if (!/\S+@\S+\.\S+/.test(this.form.email)) {
        this.errors.email = 'Please enter a valid email'
      }
      
      // Display name validation
      if (!this.form.displayName.trim()) {
        this.errors.displayName = 'Display name is required'
      } else if (this.form.displayName.length < 2) {
        this.errors.displayName = 'Display name must be at least 2 characters'
      }
      
      // Password validation (only if changing password)
      if (this.form.newPassword || this.form.confirmPassword) {
        if (!this.form.currentPassword) {
          this.errors.currentPassword = 'Current password is required to change password'
        }
        
        if (this.form.newPassword.length < 6) {
          this.errors.newPassword = 'New password must be at least 6 characters'
        }
        
        if (this.form.newPassword !== this.form.confirmPassword) {
          this.errors.confirmPassword = 'Passwords do not match'
        }
      }
      
      return Object.keys(this.errors).length === 0
    },
    
    async updateProfile() {
      if (!this.validateForm()) return
      
      this.saving = true
      this.successMessage = ''
      
      try {
        const updates = {}
        
        // Update email if changed
        if (this.form.email !== this.authStore.user?.email) {
          updates.email = this.form.email
        }
        
        // Update display name
        const currentDisplayName = this.authStore.user?.user_metadata?.display_name || 
                                  this.authStore.user?.user_metadata?.full_name || ''
        if (this.form.displayName !== currentDisplayName) {
          updates.data = {
            display_name: this.form.displayName,
            full_name: this.form.displayName
          }
        }
        
        // Update password if provided
        if (this.form.newPassword) {
          updates.password = this.form.newPassword
        }
        
        if (Object.keys(updates).length > 0) {
          const { data, error } = await supabase.auth.updateUser(updates)
          
          if (error) throw error
          
          // Update activities table with new email if email changed
          if (updates.email) {
            await supabase
              .from('activities')
              .update({ created_by: updates.email })
              .eq('created_by', this.authStore.user?.email)
          }
          
          this.successMessage = 'Profile updated successfully!'
          
          // Clear password fields
          this.form.currentPassword = ''
          this.form.newPassword = ''
          this.form.confirmPassword = ''
          
          // Refresh user data
          await this.authStore.getCurrentUser()
        } else {
          this.successMessage = 'No changes to save.'
        }
        
      } catch (error) {
        this.errors.general = error.message
      } finally {
        this.saving = false
      }
    },
    
    goBack() {
      this.$router.push('/dashboard')
    },
    
    async signOut() {
      await this.authStore.signOut()
      this.$router.push('/login')
    },

    loadTheme() {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        this.isDarkMode = savedTheme === 'dark'
      } else {
        this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
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

      // Watch for DOM class changes (alternative method)
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

      // Observe both html and body for class changes
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
  <div :class="['profile-container', { 'dark': isDarkMode }]">
    <div class="profile-content">
      <!-- Header -->
      <div class="profile-header">
        <button
          @click="goBack"
          class="back-button"
        >
          <ArrowLeft class="back-icon" />
          <span>Back to Dashboard</span>
        </button>
        
        <div class="header-info">
          <div class="header-avatar">
            <User class="avatar-icon" />
          </div>
          <div class="header-text">
            <h1 class="header-title">Profile Settings</h1>
            <p class="header-subtitle">Manage your account information and preferences</p>
          </div>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Profile Form -->
        <div class="form-section">
          <div class="form-card">
            <div class="form-card-header">
              <h2 class="form-card-title">Account Information</h2>
            </div>
            
            <form @submit.prevent="updateProfile" class="form-content">
              <!-- Success Message -->
              <div v-if="successMessage" class="success-message">
                <p class="success-text">{{ successMessage }}</p>
              </div>
              
              <!-- General Error -->
              <div v-if="errors.general" class="error-message">
                <p class="error-text">{{ errors.general }}</p>
              </div>
              
              <!-- Display Name -->
              <div class="form-group">
                <label for="displayName" class="form-label">
                  Display Name *
                </label>
                <div class="input-wrapper">
                  <div class="input-icon">
                    <User class="icon" />
                  </div>
                  <input
                    id="displayName"
                    v-model="form.displayName"
                    type="text"
                    class="form-input"
                    placeholder="Enter your display name"
                  />
                </div>
                <p v-if="errors.displayName" class="field-error">{{ errors.displayName }}</p>
              </div>
              
              <!-- Email -->
              <div class="form-group">
                <label for="email" class="form-label">
                  Email Address *
                </label>
                <div class="input-wrapper">
                  <div class="input-icon">
                    <Mail class="icon" />
                  </div>
                  <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    class="form-input"
                    placeholder="Enter your email"
                  />
                </div>
                <p v-if="errors.email" class="field-error">{{ errors.email }}</p>
              </div>
              
              <!-- Current Password -->
              <div class="form-group">
                <label for="currentPassword" class="form-label">
                  Current Password
                </label>
                <p class="form-hint">Required only if changing password</p>
                <input
                  id="currentPassword"
                  v-model="form.currentPassword"
                  type="password"
                  class="form-input"
                  placeholder="Enter current password"
                />
                <p v-if="errors.currentPassword" class="field-error">{{ errors.currentPassword }}</p>
              </div>
              
              <!-- New Password -->
              <div class="form-group">
                <label for="newPassword" class="form-label">
                  New Password
                </label>
                <div class="password-wrapper">
                  <input
                    id="newPassword"
                    v-model="form.newPassword"
                    :type="showPassword ? 'text' : 'password'"
                    class="form-input"
                    placeholder="Enter new password (optional)"
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
                <p v-if="errors.newPassword" class="field-error">{{ errors.newPassword }}</p>
              </div>
              
              <!-- Confirm Password -->
              <div class="form-group">
                <label for="confirmPassword" class="form-label">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  v-model="form.confirmPassword"
                  type="password"
                  class="form-input"
                  placeholder="Confirm new password"
                />
                <p v-if="errors.confirmPassword" class="field-error">{{ errors.confirmPassword }}</p>
              </div>
              
              <!-- Submit Button -->
              <div class="form-actions">
                <button
                  type="button"
                  @click="signOut"
                  class="btn btn-secondary"
                >
                  Sign Out
                </button>
                <button
                  type="submit"
                  :disabled="saving"
                  class="btn btn-primary"
                >
                  <Save class="btn-icon" />
                  <span>{{ saving ? 'Saving...' : 'Save Changes' }}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <!-- Stats Sidebar -->
        <div class="stats-section">
          <!-- User Stats -->
          <div class="stats-card">
            <h3 class="stats-title">Your Activity</h3>
            <div class="stats-list">
              <div class="stat-item">
                <span class="stat-label">Total Projects</span>
                <span class="stat-value">{{ userStats.totalProjects }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Activities Created</span>
                <span class="stat-value">{{ userStats.totalActivities }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Completed Activities</span>
                <span class="stat-value stat-value-success">{{ userStats.completedActivities }}</span>
              </div>
            </div>
          </div>
          
          <!-- Account Info -->
          <div class="info-card">
            <h3 class="info-title">Account Details</h3>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">Display Name</span>
                <p class="info-value">
                  {{ authStore.user?.user_metadata?.display_name || 'Not set' }}
                </p>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <p class="info-value">{{ authStore.user?.email }}</p>
              </div>
              <div class="info-item">
                <span class="info-label">Member Since</span>
                <p class="info-value">
                  {{ authStore.user?.created_at ? new Date(authStore.user.created_at).toLocaleDateString() : 'N/A' }}
                </p>
              </div>
              <div class="info-item">
                <span class="info-label">Last Sign In</span>
                <p class="info-value">
                  {{ authStore.user?.last_sign_in_at ? new Date(authStore.user.last_sign_in_at).toLocaleDateString() : 'N/A' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.profile-container {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --success-color: #10b981;
  --success-hover: #059669;
  --danger-color: #ef4444;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.profile-container.dark {
  --bg-primary: #1e293b;
  --bg-secondary: #0f172a;
  --bg-tertiary: #334155;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #475569;
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
}

/* Container */
.profile-container {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  padding: 2rem 0;
  transition: var(--transition);
}

.profile-content {
  max-width: 64rem;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Header */
.profile-header {
  margin-bottom: 2rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.back-button:hover {
  color: var(--text-primary);
}

.back-icon {
  width: 1rem;
  height: 1rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-avatar {
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
  padding: 0.75rem;
  border-radius: 50%;
  flex-shrink: 0;
}

.avatar-icon {
  width: 2rem;
  height: 2rem;
  color: white;
}

.header-text {
  flex: 1;
}

.header-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
}

.header-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

/* Grid Layout */
.profile-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .profile-grid {
    grid-template-columns: 2fr 1fr;
  }
}

/* Form Section */
.form-section {
  display: flex;
  flex-direction: column;
}

.form-card {
  background-color: var(--bg-primary);
  box-shadow: var(--shadow);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  overflow: hidden;
  transition: var(--transition);
}

.form-card-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
}

.form-card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.form-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Messages */
.success-message {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
  padding: 1rem;
}

.profile-container.dark .success-message {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.success-text {
  color: #166534;
  margin: 0;
  font-weight: 500;
}

.profile-container.dark .success-text {
  color: #6ee7b7;
}

.error-message {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 1rem;
}

.profile-container.dark .error-message {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.error-text {
  color: #dc2626;
  margin: 0;
  font-weight: 500;
}

.profile-container.dark .error-text {
  color: #fca5a5;
}

/* Form Groups */
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

.form-hint {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

/* Input Wrappers */
.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.password-wrapper {
  position: relative;
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
}

.password-toggle:hover {
  color: var(--text-primary);
}

/* Form Inputs */
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition);
}

.input-wrapper .form-input {
  padding-left: 2.5rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.icon {
  width: 1rem;
  height: 1rem;
}

/* Field Errors */
.field-error {
  font-size: 0.875rem;
  color: var(--danger-color);
  margin: 0;
  font-weight: 500;
}

/* Form Actions */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: var(--transition);
  min-width: 6rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  box-shadow: var(--shadow);
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

.btn-icon {
  width: 1rem;
  height: 1rem;
}

/* Stats Section */
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.stats-card, .info-card {
  background-color: var(--bg-primary);
  box-shadow: var(--shadow);
  border-radius: 0.75rem;
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  transition: var(--transition);
}

.stats-title, .info-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.stats-list, .info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stat-item, .info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label, .info-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.stat-value, .info-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.stat-value-success {
  color: var(--success-color);
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: right;
}

/* Responsive Design */
@media (max-width: 640px) {
  .profile-container {
    padding: 1rem 0;
  }
  
  .profile-content {
    padding: 0 0.5rem;
  }
  
  .form-content {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .stat-item, .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .info-value {
    text-align: left;
  }
}
</style>
