<script>
import { useActivitiesStore } from '@/stores/activities'
import { Edit, Trash2, User, Clock, AlertCircle } from 'lucide-vue-next'
import ActivityForm from './ActivityForm.vue'

export default {
  name: 'ActivityList',
  components: {
    ActivityForm,
    Edit,
    Trash2,
    User,
    Clock,
    AlertCircle
  },
  props: {
    activities: Array,
    loading: Boolean
  },
  emits: ['update-activity', 'delete-activity'],
  data() {
    return {
      activitiesStore: useActivitiesStore(),
      editingActivity: null,
      showEditForm: false,
      isDarkMode: false,
      filters: {
        urgency: '',
        assigned: '',
        sortBy: 'created_at'
      },
      urgencyColors: {
        'High': 'high-urgency',
        'Medium': 'medium-urgency',
        'Low': 'low-urgency'
      }
    }
  },
  mounted() {
    this.loadTheme()
    this.watchThemeChanges()
  },
  beforeUnmount() {
    // Clean up event listener
    window.removeEventListener('storage', this.handleStorageChange)
    if (this.themeObserver) {
      this.themeObserver.disconnect()
    }
  },
  methods: {
    updateFilters() {
      this.activitiesStore.setFilters(this.filters)
    },

    getProgressColor(progress) {
      const prog = parseFloat(progress)
      if (prog >= 80) return 'progress-high'
      if (prog >= 50) return 'progress-medium'
      if (prog >= 20) return 'progress-low'
      return 'progress-very-low'
    },

    handleEdit(activity) {
      this.editingActivity = { ...activity }
      this.showEditForm = true
    },

    async handleUpdateActivity(updatedData) {
      try {
        await this.activitiesStore.updateActivity(this.editingActivity.id, updatedData)
        this.showEditForm = false
        this.editingActivity = null
      } catch (error) {
        console.error('Error updating activity:', error)
        alert('Error updating activity: ' + error.message)
      }
    },

    cancelEdit() {
      this.showEditForm = false
      this.editingActivity = null
    },

    async handleDelete(activityId) {
      if (confirm('Are you sure you want to delete this activity?')) {
        try {
          await this.activitiesStore.deleteActivity(activityId)
        } catch (error) {
          console.error('Error deleting activity:', error)
          alert('Error deleting activity: ' + error.message)
        }
      }
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
  <div :class="['activity-list-container', { 'dark': isDarkMode }]">
    <!-- Filters -->
    <div class="filters-card">
      <h3 class="filters-title">Filters & Sort</h3>
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">Urgency</label>
          <select
            v-model="filters.urgency"
            @change="updateFilters"
            class="filter-select"
          >
            <option value="">All Urgency</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Assignment</label>
          <select
            v-model="filters.assigned"
            @change="updateFilters"
            class="filter-select"
          >
            <option value="">All Activities</option>
            <option value="true">Assigned</option>
            <option value="false">Not Assigned</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">Sort By</label>
          <select
            v-model="filters.sortBy"
            @change="updateFilters"
            class="filter-select"
          >
            <option value="created_at">Date Created</option>
            <option value="urgency">Urgency</option>
            <option value="progress">Progress</option>
            <option value="expected_time">Expected Time</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Activities List -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading activities...</div>
    </div>
    
    <div v-else-if="activities.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-title">No activities found</div>
      <div class="empty-subtitle">Create your first activity to get started!</div>
    </div>
    
    <div v-else class="activities-grid">
      <div
        v-for="activity in activities"
        :key="activity.id"
        class="activity-card"
      >
        <!-- Activity Header -->
        <div class="activity-header">
          <div class="activity-info">
            <h3 class="activity-title">
              {{ activity.activity_name }}
            </h3>
            <p class="activity-project">{{ activity.project_name }}</p>
          </div>
          <div class="activity-actions">
            <button
              type="button"
              @click="handleEdit(activity)"
              class="action-btn edit-btn"
              title="Edit Activity"
            >
              <Edit class="action-icon" />
            </button>
            <button
              type="button"
              @click="handleDelete(activity.id)"
              class="action-btn delete-btn"
              title="Delete Activity"
            >
              <Trash2 class="action-icon" />
            </button>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">Progress</span>
            <span class="progress-value">{{ activity.progress }}%</span>
          </div>
          <div class="progress-bar">
            <div
              :class="['progress-fill', getProgressColor(activity.progress)]"
              :style="{ width: `${activity.progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Activity Details -->
        <div class="activity-details">
          <!-- Urgency -->
          <div class="detail-row">
            <div class="detail-label">
              <AlertCircle class="detail-icon" />
              <span>Urgency</span>
            </div>
            <span :class="['urgency-badge', urgencyColors[activity.urgency]]">
              {{ activity.urgency }}
            </span>
          </div>

          <!-- Expected Time -->
          <div class="detail-row">
            <div class="detail-label">
              <Clock class="detail-icon" />
              <span>Expected Time</span>
            </div>
            <span class="detail-value">{{ activity.expected_time }}h</span>
          </div>

          <!-- Assignment -->
          <div class="detail-row">
            <div class="detail-label">
              <User class="detail-icon" />
              <span>Assignment</span>
            </div>
            <div class="assignment-info">
              <div :class="['assignment-status', activity.assigned ? 'assigned' : 'not-assigned']">
                {{ activity.assigned ? 'Assigned' : 'Not Assigned' }}
              </div>
              <div v-if="activity.assigned && activity.assigned_to_who" class="assignment-to">
                to {{ activity.assigned_to_who }}
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="activity.notes" class="notes-section">
            <p class="notes-text">{{ activity.notes }}</p>
          </div>

          <!-- Created Info -->
          <div class="created-info">
            <div class="created-date">Created: {{ new Date(activity.created_at).toLocaleDateString() }}</div>
            <div v-if="activity.created_by" class="created-by">By: {{ activity.created_by }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Activity Modal -->
    <ActivityForm
      v-if="showEditForm && editingActivity"
      :activity="editingActivity"
      :is-editing="true"
      @submit="handleUpdateActivity"
      @cancel="cancelEdit"
    />
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.activity-list-container {
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
  --warning-color: #f59e0b;
  --danger-color: #ef4444;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.activity-list-container.dark {
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
.activity-list-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  max-width: 100%;
  transition: var(--transition);
}

/* Filters Card */
.filters-card {
  background-color: var(--bg-primary);
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.filters-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition);
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
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

.loading-text {
  color: var(--text-secondary);
  font-size: 1rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.empty-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

/* Activities Grid */
.activities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* Activity Card */
.activity-card {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

.activity-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}

/* Activity Header */
.activity-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.activity-info {
  flex: 1;
  min-width: 0;
}

.activity-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
  line-height: 1.4;
}

.activity-project {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.activity-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;
}

.action-btn {
  padding: 0.5rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: var(--transition);
  background-color: transparent;
}

.action-icon {
  width: 1rem;
  height: 1rem;
}

.edit-btn {
  color: var(--text-muted);
}

.edit-btn:hover {
  color: var(--primary-color);
  background-color: rgba(59, 130, 246, 0.1);
}

.delete-btn {
  color: var(--text-muted);
}

.delete-btn:hover {
  color: var(--danger-color);
  background-color: rgba(239, 68, 68, 0.1);
}

/* Progress Section */
.progress-section {
  margin-bottom: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.progress-value {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 0.5rem;
  background-color: var(--bg-tertiary);
  border-radius: 0.25rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 0.25rem;
  transition: var(--transition);
}

.progress-high {
  background-color: var(--success-color);
}

.progress-medium {
  background-color: var(--warning-color);
}

.progress-low {
  background-color: #fb7185;
}

.progress-very-low {
  background-color: var(--danger-color);
}

/* Activity Details */
.activity-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.detail-icon {
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
}

.detail-value {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* Urgency Badges */
.urgency-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.high-urgency {
  background-color: #fef2f2;
  color: #dc2626;
}

.activity-list-container.dark .high-urgency {
  background-color: rgba(220, 38, 38, 0.2);
  color: #fca5a5;
}

.medium-urgency {
  background-color: #fffbeb;
  color: #d97706;
}

.activity-list-container.dark .medium-urgency {
  background-color: rgba(217, 119, 6, 0.2);
  color: #fcd34d;
}

.low-urgency {
  background-color: #f0fdf4;
  color: #059669;
}

.activity-list-container.dark .low-urgency {
  background-color: rgba(5, 150, 105, 0.2);
  color: #6ee7b7;
}

/* Assignment Info */
.assignment-info {
  text-align: right;
}

.assignment-status {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.assignment-status.assigned {
  color: var(--success-color);
}

.assignment-status.not-assigned {
  color: var(--text-muted);
}

.assignment-to {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 0.125rem;
}

/* Notes Section */
.notes-section {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
}

.notes-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Created Info */
.created-info {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.created-date {
  margin-bottom: 0.125rem;
}

.created-by {
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .activities-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }
  
  .activity-card {
    padding: 1rem;
  }
  
  .activity-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .activity-actions {
    margin-left: 0;
    justify-content: flex-end;
  }
}

@media (max-width: 480px) {
  .activity-list-container {
    gap: 1rem;
  }
  
  .filters-card {
    padding: 1rem;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .assignment-info {
    text-align: left;
  }
}
</style>
