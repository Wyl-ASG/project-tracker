<script>
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'
import { Mail, UserPlus, Shield, Trash2, Clock, CheckCircle, XCircle, ArrowLeft } from 'lucide-vue-next'

export default {
  name: 'AdminDashboard',
  components: {
    Mail,
    UserPlus,
    Shield,
    Trash2,
    Clock,
    CheckCircle,
    XCircle,
    ArrowLeft
  },
  data() {
    return {
      authStore: useAuthStore(),
      isDarkMode: false,
      inviteForm: {
        email: '',
        password: '',
        displayName: '',
        role: 'user'
      },
      invitations: [],
      loading: false,
      sending: false,
      error: '',
      successMessage: ''
    }
  },
  async mounted() {
    this.loadTheme()
    this.watchThemeChanges()
    await this.loadInvitations()
  },
  beforeUnmount() {
    window.removeEventListener('storage', this.handleStorageChange)
    if (this.themeObserver) {
      this.themeObserver.disconnect()
    }
  },
  methods: {
    goBackToDashboard() {
      this.$router.push('/dashboard')
    },

    async loadInvitations() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('invitations')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        this.invitations = data || []
      } catch (error) {
        console.error('Error loading invitations:', error)
        this.error = 'Failed to load invitations'
      } finally {
        this.loading = false
      }
    },

async sendInvitation() {
  if (!this.inviteForm.email) {
    this.error = 'Email is required'
    return
  }

  if (!this.inviteForm.displayName) {
    this.error = 'Display name is required'
    return
  }

  if (!this.inviteForm.password) {
    this.error = 'Password is required'
    return
  }

  this.sending = true
  this.error = ''
  this.successMessage = ''

  try {
    // Check if current user is admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('*')
      .eq('user_id', this.authStore.user.id)
      .maybeSingle() // Use maybeSingle to avoid errors

    if (!adminCheck) {
      throw new Error('Only administrators can create users')
    }

    // Create user using Supabase admin API with service role
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: this.inviteForm.email,
        password: this.inviteForm.password,
        email_confirm: true,
        user_metadata: {
          display_name: this.inviteForm.displayName,
          role: this.inviteForm.role
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Failed to create user')
    }

    const userData = await response.json()

    // If creating an admin user, add them to admin_users table
    if (this.inviteForm.role === 'admin') {
      const { error: adminError } = await supabase
        .from('admin_users')
        .insert({
          user_id: userData.id,
          email: this.inviteForm.email,
          display_name: this.inviteForm.displayName
        })

      if (adminError) {
        console.warn('Failed to add user to admin_users table:', adminError)
        // Don't throw here as user was created successfully
      }
    }

    // Add to invitations table for tracking
    await supabase
      .from('invitations')
      .insert({
        email: this.inviteForm.email,
        invited_by: this.authStore.user.id,
        role: this.inviteForm.role,
        status: 'accepted'
      })

    this.successMessage = `User ${this.inviteForm.email} created successfully! ${this.inviteForm.role === 'admin' ? 'They now have admin privileges.' : 'They can now sign in.'}`
    this.inviteForm = { email: '', password: '', displayName: '', role: 'user' }
    await this.loadInvitations()

  } catch (error) {
    console.error('Full error:', error)
    this.error = error.message
  } finally {
    this.sending = false
  }
},



    async deleteInvitation(invitationId) {
      if (!confirm('Are you sure you want to delete this invitation?')) return

      try {
        const { error } = await supabase
          .from('invitations')
          .delete()
          .eq('id', invitationId)

        if (error) throw error

        this.successMessage = 'Invitation deleted successfully'
        await this.loadInvitations()
      } catch (error) {
        this.error = 'Failed to delete invitation'
      }
    },

    getStatusColor(status) {
      switch (status) {
        case 'pending': return 'text-yellow-600'
        case 'accepted': return 'text-green-600'
        case 'expired': return 'text-red-600'
        default: return 'text-gray-600'
      }
    },

    getStatusIcon(status) {
      switch (status) {
        case 'pending': return Clock
        case 'accepted': return CheckCircle
        case 'expired': return XCircle
        default: return Clock
      }
    },

    generateTemporaryPassword() {
      // Generate a random temporary password
      return Math.random().toString(36).slice(-12) + 'A1!'
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
      this.handleStorageChange = (e) => {
        if (e.key === 'theme') {
          this.isDarkMode = e.newValue === 'dark'
        }
      }
      window.addEventListener('storage', this.handleStorageChange)

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

      const isDark = document.documentElement.classList.contains('dark') || 
                    document.body.classList.contains('dark')
      this.isDarkMode = isDark
    }
  }
}
</script>

<template>
  <div :class="['admin-dashboard', { 'dark': isDarkMode }]">
    <div class="admin-content">
      <!-- Back Button -->
      <div class="back-button-section">
        <button
          @click="goBackToDashboard"
          class="back-button"
        >
          <ArrowLeft class="back-icon" />
          <span>Back to Dashboard</span>
        </button>
      </div>

      <!-- Header -->
      <div class="admin-header">
        <div class="header-info">
          <Shield class="header-icon" />
          <div>
            <h1 class="header-title">Admin Dashboard</h1>
            <p class="header-subtitle">Create and manage user accounts</p>
          </div>
        </div>
      </div>

      <!-- Create User Form -->
      <div class="invite-section">
        <div class="invite-card">
          <div class="invite-header">
            <UserPlus class="invite-icon" />
            <h2 class="invite-title">Create New User</h2>
          </div>

          <form @submit.prevent="sendInvitation" class="invite-form">
            <!-- Messages -->
            <div v-if="successMessage" class="success-message">
              <p>{{ successMessage }}</p>
            </div>
            
            <div v-if="error" class="error-message">
              <p>{{ error }}</p>
            </div>

            <!-- Email Input -->
            <div class="form-group">
              <label for="email" class="form-label">Email Address</label>
              <div class="input-wrapper">
                <Mail class="input-icon" />
                <input
                  id="email"
                  v-model="inviteForm.email"
                  type="email"
                  class="form-input"
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <!-- Display Name Input -->
            <div class="form-group">
              <label for="displayName" class="form-label">Display Name</label>
              <div class="input-wrapper">
                <UserPlus class="input-icon" />
                <input
                  id="displayName"
                  v-model="inviteForm.displayName"
                  type="text"
                  class="form-input"
                  placeholder="Enter display name"
                  required
                />
              </div>
            </div>

            <!-- Password Input -->
            <div class="form-group">
              <label for="password" class="form-label">Temporary Password</label>
              <div class="password-wrapper">
                <input
                  id="password"
                  v-model="inviteForm.password"
                  type="text"
                  class="form-input"
                  placeholder="Enter temporary password"
                  required
                />
                <button
                  type="button"
                  @click="inviteForm.password = generateTemporaryPassword()"
                  class="generate-password-btn"
                >
                  Generate
                </button>
              </div>
              <p class="form-hint">User can change this password after first login</p>
            </div>

            <!-- Role Selection -->
            <div class="form-group">
              <label for="role" class="form-label">Role</label>
              <select
                id="role"
                v-model="inviteForm.role"
                class="form-select"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="sending"
              class="invite-button"
            >
              <UserPlus class="button-icon" />
              {{ sending ? 'Creating...' : 'Create User' }}
            </button>
          </form>
        </div>
      </div>

      <!-- Created Users List -->
      <div class="invitations-section">
        <div class="invitations-card">
          <div class="invitations-header">
            <h2 class="invitations-title">Created Users</h2>
            <button @click="loadInvitations" class="refresh-button">
              Refresh
            </button>
          </div>

          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading users...</p>
          </div>

          <div v-else-if="invitations.length === 0" class="empty-state">
            <Mail class="empty-icon" />
            <p class="empty-title">No users created</p>
            <p class="empty-subtitle">Create your first user to get started</p>
          </div>

          <div v-else class="invitations-list">
            <div
              v-for="invitation in invitations"
              :key="invitation.id"
              class="invitation-item"
            >
              <div class="invitation-info">
                <div class="invitation-email">{{ invitation.email }}</div>
                <div class="invitation-meta">
                  <span class="invitation-role">{{ invitation.role }}</span>
                  <span class="invitation-date">
                    {{ new Date(invitation.created_at).toLocaleDateString() }}
                  </span>
                </div>
              </div>

              <div class="invitation-status">
                <component
                  :is="getStatusIcon(invitation.status)"
                  :class="['status-icon', getStatusColor(invitation.status)]"
                />
                <span :class="['status-text', getStatusColor(invitation.status)]">
                  {{ invitation.status }}
                </span>
              </div>

              <div class="invitation-actions">
                <button
                  @click="deleteInvitation(invitation.id)"
                  class="delete-button"
                  title="Delete record"
                >
                  <Trash2 class="delete-icon" />
                </button>
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
.admin-dashboard {
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
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-dashboard.dark {
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

/* Layout */
.admin-dashboard {
  min-height: 100vh;
  background-color: var(--bg-secondary);
  transition: var(--transition);
}

.admin-content {
  max-width: 64rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

/* Back Button */
.back-button-section {
  margin-bottom: 1.5rem;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: var(--shadow);
}

.back-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  transform: translateX(-2px);
  box-shadow: var(--shadow-lg);
}

.back-icon {
  width: 1rem;
  height: 1rem;
}

/* Header */
.admin-header {
  margin-bottom: 2rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--primary-color);
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem;
  border-radius: 0.75rem;
}

.header-title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

/* Invite Section */
.invite-section {
  margin-bottom: 2rem;
}

.invite-card {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.invite-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
}

.invite-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: white;
}

.invite-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.invite-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Messages */
.success-message {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.admin-dashboard.dark .success-message {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.3);
}

.success-message p {
  color: #166534;
  margin: 0;
  font-weight: 500;
}

.admin-dashboard.dark .success-message p {
  color: #6ee7b7;
}

.error-message {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.admin-dashboard.dark .error-message {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}

.error-message p {
  color: #dc2626;
  margin: 0;
  font-weight: 500;
}

.admin-dashboard.dark .error-message p {
  color: #fca5a5;
}

/* Form Elements */
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
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin: 0;
}

.input-wrapper {
  position: relative;
}

.password-wrapper {
  position: relative;
  display: flex;
  gap: 0.5rem;
}

.generate-password-btn {
  padding: 0.75rem 1rem;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  color: var(--text-primary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.generate-password-btn:hover {
  background-color: var(--border-color);
}

.input-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition);
}

.form-input {
  padding-left: 2.5rem;
}

.password-wrapper .form-input {
  padding-left: 0.75rem;
  flex: 1;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.invite-button {
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
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow);
}

.invite-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-lg);
}

.invite-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.button-icon {
  width: 1rem;
  height: 1rem;
}

/* Invitations Section */
.invitations-card {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  overflow: hidden;
}

.invitations-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.invitations-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.refresh-button {
  padding: 0.5rem 1rem;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition);
}

.refresh-button:hover {
  background-color: var(--border-color);
}

/* Loading and Empty States */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  width: 3rem;
  height: 3rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.empty-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

/* Invitations List */
.invitations-list {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invitation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-secondary);
  transition: var(--transition);
}

.invitation-item:hover {
  background-color: var(--bg-tertiary);
}

.invitation-info {
  flex: 1;
  min-width: 0;
}

.invitation-email {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.invitation-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.invitation-role {
  background-color: var(--bg-primary);
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.invitation-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 1rem;
}

.status-icon {
  width: 1rem;
  height: 1rem;
}

.status-text {
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: capitalize;
}

.invitation-actions {
  display: flex;
  gap: 0.5rem;
}

.delete-button {
  padding: 0.5rem;
  background-color: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: var(--transition);
  color: var(--text-muted);
}

.delete-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
}

.delete-icon {
  width: 1rem;
  height: 1rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-content {
    padding: 1rem 0.5rem;
  }
  
  .password-wrapper {
    flex-direction: column;
  }
  
  .invitation-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
  
  .invitation-status {
    margin: 0;
    justify-content: space-between;
  }
}
</style>
