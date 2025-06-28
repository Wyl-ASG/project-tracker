<script>
import { Menu, X, Plus, LogOut, FolderOpen, Folder, User, Sun, Moon, Shield } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'

export default {
    name: 'Sidebar',
    components: {
        Menu,
        X,
        Plus,
        LogOut,
        FolderOpen,
        Folder,
        User,
        Sun,
        Moon,
        Shield
    },
    props: {
        collapsed: Boolean,
        projects: Array,
        selectedProject: Object
    },
    emits: ['toggle-sidebar', 'select-project', 'add-project', 'sign-out'],
    data() {
        return {

            isDarkMode: false,
            isAdmin: false
        }
    },
    async mounted() {
        this.loadTheme()
        await this.checkAdminStatus()
    },
    computed:{
        authStore() {
            return useAuthStore() // ✅ Use it in computed instead
        }
    },
    methods: {
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

async checkAdminStatus() {
    try {
        // Wait for user to be available
        if (!this.authStore.user) {
            await this.authStore.getCurrentUser()
        }
        
        if (this.authStore.user) {
            // Use maybeSingle() instead of single() to avoid errors when no rows found
            const { data: adminUser, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('user_id', this.authStore.user.id)
                .maybeSingle() // ✅ This won't throw error for no rows
            
            if (error) {
                // Only log unexpected errors, not "no rows found"
                console.warn('Admin check error:', error)
                this.isAdmin = false
                return
            }
            
            // If adminUser is null, user is not admin; if it exists, user is admin
            this.isAdmin = !!adminUser
        } else {
            this.isAdmin = false
        }
    } catch (error) {
        // Silently handle any other errors
        this.isAdmin = false
    }
}


    }
}
</script>

<template>
    <div :class="['sidebar-container', { 'collapsed': collapsed, 'dark': isDarkMode }]">
        <div class="sidebar-content">
            <!-- Header -->
            <div class="sidebar-header">
                <h2 v-if="!collapsed" class="sidebar-title">Projects</h2>
                <button @click="$emit('toggle-sidebar')" class="toggle-button">
                    <Menu v-if="collapsed" class="toggle-icon" />
                    <X v-else class="toggle-icon" />
                </button>
            </div>

            <!-- Theme Toggle -->
            <div class="theme-toggle-section">
                <button @click="toggleTheme" class="theme-toggle-button"
                    :title="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'">
                    <Sun v-if="isDarkMode" class="theme-icon" />
                    <Moon v-else class="theme-icon" />
                    <span v-if="!collapsed" class="theme-text">
                        {{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}
                    </span>
                </button>
            </div>

            <!-- Add Project Button -->
            <div class="add-project-section">
                <button @click="$emit('add-project')" class="add-project-button">
                    <Plus class="add-project-icon" />
                    <span v-if="!collapsed" class="add-project-text">Add Project</span>
                </button>
            </div>

            <!-- Projects List -->
            <div class="projects-section">
                <div v-if="projects.length === 0" class="empty-projects">
                    <span v-if="!collapsed" class="empty-text">No projects yet</span>
                    <div v-else class="empty-icon">📁</div>
                </div>
                <div v-else class="projects-list">
                    <button v-for="project in projects" :key="project.id" @click="$emit('select-project', project)"
                        :class="[
                            'project-button',
                            selectedProject?.id === project.id ? 'project-button-active' : 'project-button-inactive'
                        ]">
                        <FolderOpen v-if="selectedProject?.id === project.id" class="project-icon" />
                        <Folder v-else class="project-icon" />
                        <span v-if="!collapsed" class="project-name">{{ project.project_name }}</span>
                    </button>
                </div>
            </div>

            <!-- User Section -->
            <div class="user-section">
                <!-- Admin Link (only show for admin users) -->
                <router-link v-if="isAdmin" to="/admin" class="user-button admin-button">
                    <Shield class="user-icon" />
                    <span v-if="!collapsed" class="user-text">Admin Panel</span>
                </router-link>

                <!-- Profile Link -->
                <router-link to="/profile" class="user-button">
                    <User class="user-icon" />
                    <span v-if="!collapsed" class="user-text">Profile</span>
                </router-link>

                <!-- Sign Out Button -->
                <button @click="$emit('sign-out')" class="user-button sign-out-button">
                    <LogOut class="user-icon" />
                    <span v-if="!collapsed" class="user-text">Sign Out</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.sidebar-container {
    --sidebar-bg: #1e293b;
    --sidebar-bg-hover: #334155;
    --sidebar-text: #f8fafc;
    --sidebar-text-muted: #cbd5e1;
    --sidebar-border: #475569;
    --sidebar-primary: #3b82f6;
    --sidebar-primary-hover: #2563eb;
    --sidebar-success: #10b981;
    --sidebar-success-hover: #059669;
    --sidebar-danger: #ef4444;
    --sidebar-danger-hover: #dc2626;
    --sidebar-admin: #8b5cf6;
    --sidebar-admin-hover: #7c3aed;
    --sidebar-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-container.dark {
    --sidebar-bg: #0f172a;
    --sidebar-bg-hover: #1e293b;
    --sidebar-text: #f1f5f9;
    --sidebar-text-muted: #e2e8f0;
    --sidebar-border: #334155;
}

/* Sidebar Container */
.sidebar-container {
    background-color: var(--sidebar-bg);
    color: var(--sidebar-text);
    transition: var(--transition);
    width: 16rem;
    box-shadow: var(--sidebar-shadow);
    border-right: 1px solid var(--sidebar-border);
}

.sidebar-container.collapsed {
    width: 4rem;
}

.sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
}

/* Header */
.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--sidebar-border);
    background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--sidebar-bg-hover) 100%);
}

.sidebar-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--sidebar-text);
    margin: 0;
}

.toggle-button {
    padding: 0.5rem;
    border-radius: 0.5rem;
    background-color: transparent;
    border: none;
    color: var(--sidebar-text-muted);
    cursor: pointer;
    transition: var(--transition);
}

.toggle-button:hover {
    background-color: var(--sidebar-bg-hover);
    color: var(--sidebar-text);
    transform: scale(1.05);
}

.toggle-icon {
    width: 1.25rem;
    height: 1.25rem;
}

/* Theme Toggle Section */
.theme-toggle-section {
    padding: 1rem;
    border-bottom: 1px solid var(--sidebar-border);
}

.theme-toggle-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background-color: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 0.5rem;
    color: var(--sidebar-primary);
    cursor: pointer;
    transition: var(--transition);
    font-weight: 500;
    font-size: 0.875rem;
}

.theme-toggle-button:hover {
    background-color: rgba(59, 130, 246, 0.2);
    border-color: var(--sidebar-primary);
    transform: translateY(-1px);
}

.theme-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

.theme-text {
    white-space: nowrap;
}

/* Add Project Section */
.add-project-section {
    padding: 1rem;
    border-bottom: 1px solid var(--sidebar-border);
}

.add-project-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background-color: var(--sidebar-success);
    border: none;
    border-radius: 0.5rem;
    color: white;
    cursor: pointer;
    transition: var(--transition);
    font-weight: 500;
    font-size: 0.875rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.add-project-button:hover {
    background-color: var(--sidebar-success-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.add-project-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

.add-project-text {
    white-space: nowrap;
}

/* Projects Section */
.projects-section {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
}

.empty-projects {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 0;
    text-align: center;
}

.empty-text {
    color: var(--sidebar-text-muted);
    font-size: 0.875rem;
}

.empty-icon {
    font-size: 1.5rem;
    opacity: 0.5;
}

.projects-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.project-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    text-align: left;
    cursor: pointer;
    transition: var(--transition);
    font-size: 0.875rem;
    background-color: transparent;
}

.project-button-active {
    background-color: var(--sidebar-primary);
    color: white;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}

.project-button-inactive {
    color: var(--sidebar-text-muted);
}

.project-button-inactive:hover {
    background-color: var(--sidebar-bg-hover);
    color: var(--sidebar-text);
    transform: translateX(4px);
}

.project-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

.project-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
}

/* User Section */
.user-section {
    padding: 1rem;
    border-top: 1px solid var(--sidebar-border);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--sidebar-bg) 0%, var(--sidebar-bg-hover) 100%);
}

.user-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: none;
    border-radius: 0.5rem;
    background-color: transparent;
    color: var(--sidebar-text-muted);
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;
    font-size: 0.875rem;
    font-weight: 500;
}

.user-button:hover {
    background-color: var(--sidebar-bg-hover);
    color: var(--sidebar-text);
    transform: translateX(4px);
}

.admin-button:hover {
    background-color: rgba(139, 92, 246, 0.1);
    color: var(--sidebar-admin);
}

.sign-out-button:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: var(--sidebar-danger);
}

.user-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
}

.user-text {
    white-space: nowrap;
}

/* Scrollbar Styling */
.projects-section::-webkit-scrollbar {
    width: 0.25rem;
}

.projects-section::-webkit-scrollbar-track {
    background: var(--sidebar-bg);
}

.projects-section::-webkit-scrollbar-thumb {
    background: var(--sidebar-border);
    border-radius: 0.125rem;
}

.projects-section::-webkit-scrollbar-thumb:hover {
    background: var(--sidebar-text-muted);
}

/* Responsive Design */
@media (max-width: 768px) {
    .sidebar-container {
        position: fixed;
        top: 0;
        left: 0;
        height: 100vh;
        z-index: 40;
    }

    .sidebar-container.collapsed {
        transform: translateX(-100%);
    }
}

/* Animation for project selection */
@keyframes projectSelect {
    0% {
        transform: scale(1);
    }

    50% {
        transform: scale(1.02);
    }

    100% {
        transform: scale(1);
    }
}

.project-button-active {
    animation: projectSelect 0.2s ease-out;
}
</style>
