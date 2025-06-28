<script>
import { X } from 'lucide-vue-next'

export default {
  name: 'ProjectForm',
  components: {
    X
  },
  emits: ['submit', 'cancel'],
  data() {
    return {
      isDarkMode: false,
      form: {
        project_name: ''
      },
      errors: {}
    }
  },
  mounted() {
    this.loadTheme()
  },
  methods: {
    validateForm() {
      this.errors = {}
      
      if (!this.form.project_name.trim()) {
        this.errors.project_name = 'Project name is required'
      } else if (this.form.project_name.length < 2) {
        this.errors.project_name = 'Project name must be at least 2 characters'
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
        <h2 class="modal-title">Add New Project</h2>
        <button
          @click="$emit('cancel')"
          class="close-button"
        >
          <X class="close-icon" />
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="modal-form">
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
            maxlength="100"
          />
          <p v-if="errors.project_name" class="error-message">
            {{ errors.project_name }}
          </p>
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
            Create Project
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
  max-width: 28rem;
  width: 100%;
  border: 1px solid var(--border-color);
  transition: var(--transition);
  animation: modalFadeIn 0.2s ease-out;
}

/* Modal Header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  background: linear-gradient(135deg, var(--success-color) 0%, #059669 100%);
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

.form-input:focus {
  outline: none;
  border-color: var(--success-color);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.form-input::placeholder {
  color: var(--text-muted);
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
  background-color: var(--success-color);
  color: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background-color: #059669;
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
</style>
