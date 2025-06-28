<script>
import { X } from 'lucide-vue-next'

export default {
  name: 'ActivityForm',
  components: {
    X
  },
  props: {
    projectName: String,
    activity: Object,
    isEditing: {
      type: Boolean,
      default: false
    }
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      isDarkMode: false,
      form: {
        project_name: this.projectName || '',
        activity_name: '',
        progress: 0,
        expected_time: 1,
        urgency: 'Medium',
        notes: '',
        assigned: false,
        assigned_to_who: '',
        created_by: ''
      },
      errors: {}
    }
  },
  mounted() {
    this.loadTheme()
    this.initializeForm()
  },
  methods: {
    initializeForm() {
      if (this.isEditing && this.activity) {
        this.form = {
          project_name: this.activity.project_name || '',
          activity_name: this.activity.activity_name || '',
          progress: parseInt(this.activity.progress) || 0,
          expected_time: this.activity.expected_time || 1,
          urgency: this.activity.urgency || 'Medium',
          notes: this.activity.notes || '',
          assigned: this.activity.assigned || false,
          assigned_to_who: this.activity.assigned_to_who || '',
          created_by: this.activity.created_by || ''
        }
      }
    },

    validateForm() {
      this.errors = {}
      
      if (!this.form.project_name.trim()) {
        this.errors.project_name = 'Project name is required'
      }
      
      if (!this.form.activity_name.trim()) {
        this.errors.activity_name = 'Activity name is required'
      }
      
      if (this.form.progress < 0 || this.form.progress > 100) {
        this.errors.progress = 'Progress must be between 0 and 100'
      }
      
      if (this.form.expected_time <= 0) {
        this.errors.expected_time = 'Expected time must be greater than 0'
      }
      
      if (this.form.assigned && !this.form.assigned_to_who.trim()) {
        this.errors.assigned_to_who = 'Please specify who this is assigned to'
      }
      
      return Object.keys(this.errors).length === 0
    },

    handleSubmit() {
      if (this.validateForm()) {
        this.$emit('submit', { ...this.form })
      }
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
    }
  }
}
</script>

<template>
  <div :class="['modal-overlay', { 'dark': isDarkMode }]">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">
          {{ isEditing ? 'Edit Activity' : 'Add New Activity' }}
        </h2>
        <button
          @click="$emit('cancel')"
          class="close-button"
        >
          <X class="close-icon" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-form">
        <!-- Project Name -->
        <div class="form-group">
          <label for="project_name" class="form-label">
            Project Name *
          </label>
          <input
            id="project_name"
            v-model="form.project_name"
            type="text"
            class="form-input"
            placeholder="Enter project name"
            :readonly="!!projectName && !isEditing"
          />
          <p v-if="errors.project_name" class="error-message">
            {{ errors.project_name }}
          </p>
        </div>

        <!-- Activity Name -->
        <div class="form-group">
          <label for="activity_name" class="form-label">
            Activity Name *
          </label>
          <input
            id="activity_name"
            v-model="form.activity_name"
            type="text"
            class="form-input"
            placeholder="Enter activity name"
          />
          <p v-if="errors.activity_name" class="error-message">
            {{ errors.activity_name }}
          </p>
        </div>

        <!-- Progress -->
        <div class="form-group">
          <label for="progress" class="form-label">
            Progress (%)
          </label>
          <input
            id="progress"
            v-model.number="form.progress"
            type="number"
            min="0"
            max="100"
            class="form-input"
          />
          <p v-if="errors.progress" class="error-message">
            {{ errors.progress }}
          </p>
        </div>

        <!-- Expected Time -->
        <div class="form-group">
          <label for="expected_time" class="form-label">
            Expected Time (hours)
          </label>
          <input
            id="expected_time"
            v-model.number="form.expected_time"
            type="number"
            min="0"
            step="0.5"
            class="form-input"
          />
          <p v-if="errors.expected_time" class="error-message">
            {{ errors.expected_time }}
          </p>
        </div>

        <!-- Urgency -->
        <div class="form-group">
          <label for="urgency" class="form-label">
            Urgency
          </label>
          <select
            id="urgency"
            v-model="form.urgency"
            class="form-select"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <!-- Assignment -->
        <div class="form-group">
          <label class="checkbox-label">
            <input
              v-model="form.assigned"
              type="checkbox"
              class="form-checkbox"
            />
            <span class="checkbox-text">Assigned to someone</span>
          </label>
        </div>

        <!-- Assigned To -->
        <div v-if="form.assigned" class="form-group">
          <label for="assigned_to_who" class="form-label">
            Assigned To *
          </label>
          <input
            id="assigned_to_who"
            v-model="form.assigned_to_who"
            type="text"
            class="form-input"
            placeholder="Enter person's name or email"
          />
          <p v-if="errors.assigned_to_who" class="error-message">
            {{ errors.assigned_to_who }}
          </p>
        </div>

        <!-- Created By -->
        <div class="form-group">
          <label for="created_by" class="form-label">
            Created By
          </label>
          <input
            id="created_by"
            v-model="form.created_by"
            type="text"
            class="form-input"
            placeholder="Enter your name or email"
          />
        </div>

        <!-- Notes -->
        <div class="form-group">
          <label for="notes" class="form-label">
            Notes
          </label>
          <textarea
            id="notes"
            v-model="form.notes"
            rows="3"
            class="form-textarea"
            placeholder="Enter any additional notes..."
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button
            type="button"
            @click="$emit('cancel')"
            class="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
          >
            {{ isEditing ? 'Update Activity' : 'Create Activity' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.modal-overlay {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-overlay: rgba(0, 0, 0, 0.5);
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
  --border-color: #e2e8f0;
  --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --danger-color: #ef4444;
  --success-color: #10b981;
  --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-overlay.dark {
  --bg-primary: #1e293b;
  --bg-secondary: #0f172a;
  --bg-overlay: rgba(0, 0, 0, 0.75);
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --border-color: #475569;
  --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
  backdrop-filter: blur(4px);
}

/* Modal Container */
.modal-container {
  background-color: var(--bg-primary);
  border-radius: 0.75rem;
  box-shadow: var(--shadow);
  max-width: 32rem;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  transition: var(--transition);
}

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--primary-color) 0%, #1d4ed8 100%);
  border-radius: 0.75rem 0.75rem 0 0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.close-button {
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: var(--transition);
  color: white;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.close-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* Modal Form */
.modal-form {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
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

/* Form Inputs */
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  transition: var(--transition);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:read-only {
  background-color: var(--bg-secondary);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-textarea {
  resize: vertical;
  min-height: 4rem;
  line-height: 1.5;
}

/* Checkbox */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
  cursor: pointer;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  accent-color: var(--primary-color);
  cursor: pointer;
}

.checkbox-text {
  font-size: 0.875rem;
  color: var(--text-primary);
  font-weight: 500;
}

/* Error Messages */
.error-message {
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
  margin-top: 0.5rem;
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  border: none;
  cursor: pointer;
  transition: var(--transition);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6rem;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background-color: var(--border-color);
  transform: translateY(-1px);
}

/* Responsive Design */
@media (max-width: 640px) {
  .modal-overlay {
    padding: 0.5rem;
  }
  
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem;
  }
  
  .modal-form {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}

/* Animation */
@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-container {
  animation: modalFadeIn 0.2s ease-out;
}
</style>
