<script>
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useActivitiesStore } from '@/stores/activities'
import Sidebar from '@/components/Sidebar.vue'
import ActivityList from '@/components/ActivityList.vue'
import ProjectForm from '@/components/ProjectForm.vue'
import ActivityForm from '@/components/ActivityForm.vue'
import { Doughnut, Bar, Pie } from 'vue-chartjs'
import { ArrowLeft, Filter, User, FolderOpen, Sun, Moon, Shield } from 'lucide-vue-next'
import { supabase } from '@/lib/supabaseClient'
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, ArcElement, CategoryScale, LinearScale, BarElement)

export default {
    name: 'Dashboard',
    components: {
        Sidebar,
        ActivityList,
        ProjectForm,
        ActivityForm,
        Doughnut,
        Bar,
        Pie,
        ArrowLeft,
        Filter,
        User,
        FolderOpen,
        Sun,
        Moon,
        Shield
    },
    data() {
        return {

            projectsStore: useProjectsStore(),
            activitiesStore: useActivitiesStore(),
            showProjectForm: false,
            showActivityForm: false,
            sidebarCollapsed: false,
            isDarkMode: false,
            isAdmin: false,
            viewMode: 'all',
            selectedProjectFilter: '',
            showMyActivitiesOnly: false,
            showFilters: false
        }
    },
    computed: {
        authStore() {
            return useAuthStore() // ✅ Use it in computed instead
        },
        availableProjects() {
            const projectNames = new Set()
            this.activitiesStore.activities.forEach(activity => {
                if (activity.project_name) {
                    projectNames.add(activity.project_name)
                }
            })
            return Array.from(projectNames).sort()
        },

        filteredActivitiesForView() {
            let filtered = [...this.activitiesStore.activities]

            if (this.showMyActivitiesOnly && this.authStore.user) {
                filtered = filtered.filter(activity =>
                    activity.created_by === this.authStore.user.email ||
                    activity.created_by === this.authStore.user.id
                )
            }

            if (this.selectedProjectFilter) {
                filtered = filtered.filter(activity =>
                    activity.project_name === this.selectedProjectFilter
                )
            }

            return filtered
        },

        dashboardStats() {
            const activities = this.filteredActivitiesForView
            const totalActivities = activities.length
            const assignedActivities = activities.filter(a => a.assigned).length
            const avgProgress = activities.length > 0
                ? activities.reduce((sum, a) => sum + parseFloat(a.progress || 0), 0) / activities.length
                : 0

            return {
                totalProjects: this.getUniqueProjectsCount(),
                totalActivities,
                assignedActivities,
                avgProgress: Math.round(avgProgress)
            }
        },

        urgencyChartData() {
            const activities = this.filteredActivitiesForView
            const urgencyCounts = activities.reduce((acc, activity) => {
                acc[activity.urgency] = (acc[activity.urgency] || 0) + 1
                return acc
            }, {})

            return {
                labels: Object.keys(urgencyCounts),
                datasets: [{
                    data: Object.values(urgencyCounts),
                    backgroundColor: this.isDarkMode
                        ? ['#dc2626', '#d97706', '#059669']
                        : ['#ef4444', '#f59e0b', '#10b981']
                }]
            }
        },

        projectProgressData() {
            const activities = this.filteredActivitiesForView
            const projectProgress = this.availableProjects.map(projectName => {
                const projectActivities = activities.filter(a => a.project_name === projectName)
                const avgProgress = projectActivities.length > 0
                    ? projectActivities.reduce((sum, a) => sum + parseFloat(a.progress || 0), 0) / projectActivities.length
                    : 0
                return {
                    name: projectName,
                    progress: Math.round(avgProgress)
                }
            }).filter(p => p.progress > 0)

            return {
                labels: projectProgress.map(p => p.name),
                datasets: [{
                    label: 'Progress %',
                    data: projectProgress.map(p => p.progress),
                    backgroundColor: this.isDarkMode ? '#1d4ed8' : '#3b82f6'
                }]
            }
        },

        assignmentChartData() {
            const activities = this.filteredActivitiesForView
            const assigned = activities.filter(a => a.assigned).length
            const unassigned = activities.length - assigned

            return {
                labels: ['Assigned', 'Unassigned'],
                datasets: [{
                    data: [assigned, unassigned],
                    backgroundColor: this.isDarkMode
                        ? ['#059669', '#4b5563']
                        : ['#10b981', '#6b7280']
                }]
            }
        },

        activitiesByProject() {
            const grouped = {}
            this.filteredActivitiesForView.forEach(activity => {
                const projectName = activity.project_name || 'Unassigned'
                if (!grouped[projectName]) {
                    grouped[projectName] = []
                }
                grouped[projectName].push(activity)
            })
            return grouped
        }
    },
    async mounted() {
        this.loadTheme()
        await this.checkAdminStatus()
        await this.projectsStore.fetchProjects()
        await this.activitiesStore.fetchActivities()
    },
    methods: {
        async handleProjectSelect(project) {
            this.projectsStore.selectProject(project)
            await this.activitiesStore.fetchActivities(project.project_name)
        },

        async handleAddProject(projectData) {
            await this.projectsStore.createProject(projectData)
            this.showProjectForm = false
        },

        async handleAddActivity(activityData) {
            if (this.projectsStore.selectedProject) {
                activityData.project_name = this.projectsStore.selectedProject.project_name
            }
            activityData.created_by = this.authStore.user?.email || this.authStore.user?.id
            await this.activitiesStore.createActivity(activityData)
            this.showActivityForm = false
        },

        async signOut() {
            await this.authStore.signOut()
            this.$router.push('/login')
        },

        backToOverview() {
            this.projectsStore.selectProject(null)
            this.activitiesStore.fetchActivities()
        },

        exportData() {
            const data = {
                projects: this.projectsStore.projects,
                activities: this.filteredActivitiesForView,
                stats: this.dashboardStats,
                filters: {
                    viewMode: this.viewMode,
                    selectedProject: this.selectedProjectFilter,
                    showMyActivitiesOnly: this.showMyActivitiesOnly
                },
                exportDate: new Date().toISOString()
            }

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `project-data-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        },

        resetFilters() {
            this.viewMode = 'all'
            this.selectedProjectFilter = ''
            this.showMyActivitiesOnly = false
        },

        getUniqueProjectsCount() {
            const uniqueProjects = new Set()
            this.filteredActivitiesForView.forEach(activity => {
                if (activity.project_name) {
                    uniqueProjects.add(activity.project_name)
                }
            })
            return uniqueProjects.size
        },

        selectProjectFromView(projectName) {
            this.selectedProjectFilter = projectName
            this.viewMode = 'by-project'
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

        // In your Sidebar.vue checkAdminStatus method
// In Sidebar.vue (paste-9.txt) - Replace the checkAdminStatus method
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
    <div :class="['dashboard-container', { 'dark': isDarkMode }]">
        <!-- Sidebar -->
        <Sidebar :collapsed="sidebarCollapsed" :projects="projectsStore.projects"
            :selected-project="projectsStore.selectedProject" @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
            @select-project="handleProjectSelect" @add-project="showProjectForm = true" @sign-out="signOut" />

        <!-- Main Content -->
        <div class="main-content">
            <!-- Header -->
            <header class="header">
                <div class="header-content">
                    <div class="header-left">
                        <!-- Back to Overview Button -->
                        <button v-if="projectsStore.selectedProject" @click="backToOverview" class="btn btn-secondary">
                            <ArrowLeft class="icon" />
                            <span>Overview</span>
                        </button>

                        <h1 class="page-title">
                            {{ projectsStore.selectedProject ? projectsStore.selectedProject.project_name : 'Dashboard'
                            }}
                        </h1>
                    </div>

                    <div class="header-right">
                        <!-- Admin Panel Button (only show for admin users) -->
                        <router-link v-if="isAdmin" to="/admin" class="btn btn-admin">
                            <Shield class="icon" />
                            <span class="btn-text">Admin Panel</span>
                        </router-link>

                        <!-- Theme Toggle -->
                        <button @click="toggleTheme" class="btn btn-icon" title="Toggle theme">
                            <Sun v-if="isDarkMode" class="icon" />
                            <Moon v-else class="icon" />
                        </button>

                        <!-- Filter Toggle Button -->
                        <button @click="showFilters = !showFilters" class="btn btn-secondary">
                            <Filter class="icon" />
                            <span class="btn-text">Filters</span>
                        </button>

                        <!-- Export Data Button -->
                        <button @click="exportData" class="btn btn-success">
                            <span class="btn-text">Export Data</span>
                            <span class="btn-text-mobile">Export</span>
                        </button>

                        <!-- Add Activity Button -->
                        <button v-if="projectsStore.selectedProject" @click="showActivityForm = true"
                            class="btn btn-primary">
                            <span class="btn-text">Add Activity</span>
                            <span class="btn-text-mobile">Add</span>
                        </button>

                        <div class="welcome-text">
                            Welcome, {{ authStore.displayName || authStore.user?.email }}
                        </div>
                    </div>
                </div>

                <!-- Filters Panel -->
                <div v-if="showFilters" class="filters-panel">
                    <div class="filters-grid">
                        <!-- View Mode -->
                        <div class="filter-group">
                            <label class="filter-label">View Mode</label>
                            <select v-model="viewMode" class="filter-select">
                                <option value="all">All Activities</option>
                                <option value="my-activities">My Activities Only</option>
                                <option value="by-project">By Project</option>
                            </select>
                        </div>

                        <!-- Project Filter -->
                        <div class="filter-group">
                            <label class="filter-label">Filter by Project</label>
                            <select v-model="selectedProjectFilter" class="filter-select">
                                <option value="">All Projects</option>
                                <option v-for="project in availableProjects" :key="project" :value="project">
                                    {{ project }}
                                </option>
                            </select>
                        </div>

                        <!-- My Activities Toggle -->
                        <div class="filter-group">
                            <label class="filter-label">Show Only</label>
                            <label class="checkbox-label">
                                <input v-model="showMyActivitiesOnly" type="checkbox" class="filter-checkbox" />
                                <span class="checkbox-text">My Activities</span>
                            </label>
                        </div>

                        <!-- Reset Filters -->
                        <div class="filter-group">
                            <button @click="resetFilters" class="btn btn-gray full-width">
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content Area -->
            <main class="main-area">
                <!-- Dashboard Overview -->
                <div v-if="!projectsStore.selectedProject" class="dashboard-content">
                    <!-- Filter Status -->
                    <div v-if="selectedProjectFilter || showMyActivitiesOnly" class="filter-status">
                        <div class="filter-status-content">
                            <Filter class="icon" />
                            <span class="filter-status-label">Active Filters:</span>
                            <span v-if="selectedProjectFilter" class="filter-tag">
                                Project: {{ selectedProjectFilter }}
                            </span>
                            <span v-if="showMyActivitiesOnly" class="filter-tag">
                                My Activities Only
                            </span>
                        </div>
                    </div>

                    <!-- Stats Cards -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3 class="stat-title">Total Projects</h3>
                            <p class="stat-value">{{ dashboardStats.totalProjects }}</p>
                        </div>
                        <div class="stat-card">
                            <h3 class="stat-title">Total Activities</h3>
                            <p class="stat-value">{{ dashboardStats.totalActivities }}</p>
                        </div>
                        <div class="stat-card">
                            <h3 class="stat-title">Assigned Activities</h3>
                            <p class="stat-value stat-value-success">{{ dashboardStats.assignedActivities }}</p>
                        </div>
                        <div class="stat-card">
                            <h3 class="stat-title">Avg Progress</h3>
                            <p class="stat-value stat-value-primary">{{ dashboardStats.avgProgress }}%</p>
                        </div>
                    </div>

                    <!-- Charts -->
                    <div class="charts-grid">
                        <div class="chart-card">
                            <h3 class="chart-title">Assignment Distribution</h3>
                            <div class="chart-container">
                                <Doughnut :data="assignmentChartData" :options="{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: isDarkMode ? '#e5e7eb' : '#374151'
                                            }
                                        }
                                    }
                                }" />
                            </div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">Project Progress</h3>
                            <div class="chart-container">
                                <Bar :data="projectProgressData" :options="{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: isDarkMode ? '#e5e7eb' : '#374151'
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            ticks: {
                                                color: isDarkMode ? '#9ca3af' : '#6b7280'
                                            }
                                        },
                                        y: {
                                            ticks: {
                                                color: isDarkMode ? '#9ca3af' : '#6b7280'
                                            }
                                        }
                                    }
                                }" />
                            </div>
                        </div>
                        <div class="chart-card">
                            <h3 class="chart-title">Urgency Distribution</h3>
                            <div class="chart-container">
                                <Pie :data="urgencyChartData" :options="{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: isDarkMode ? '#e5e7eb' : '#374151'
                                            }
                                        }
                                    }
                                }" />
                            </div>
                        </div>
                    </div>

                    <!-- Recent Projects -->
                    <div class="recent-projects-card">
                        <div class="card-header">
                            <h3 class="card-title">Recent Projects</h3>
                        </div>
                        <div class="card-content">
                            <div v-if="projectsStore.projects.length === 0" class="empty-state">
                                <FolderOpen class="empty-icon" />
                                <p class="empty-title">No projects yet</p>
                                <p class="empty-subtitle">Create your first project to get started!</p>
                            </div>
                            <div v-else class="projects-list">
                                <div v-for="project in projectsStore.projects.slice(0, 5)" :key="project.id"
                                    class="project-item" @click="handleProjectSelect(project)">
                                    <div class="project-info">
                                        <h4 class="project-name">{{ project.project_name }}</h4>
                                        <p class="project-id">Project ID: {{ project.id }}</p>
                                    </div>
                                    <button class="project-action">
                                        View Details →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Project Activities -->
                <div v-else class="activities-view">
                    <ActivityList :activities="activitiesStore.filteredActivities" :loading="activitiesStore.loading"
                        @update-activity="activitiesStore.updateActivity"
                        @delete-activity="activitiesStore.deleteActivity" />
                </div>
            </main>
        </div>

        <!-- Modals -->
        <ProjectForm v-if="showProjectForm" @submit="handleAddProject" @cancel="showProjectForm = false" />

        <ActivityForm v-if="showActivityForm" :project-name="projectsStore.selectedProject?.project_name"
            @submit="handleAddActivity" @cancel="showActivityForm = false" />
    </div>
</template>

<style scoped>
/* CSS Variables for Light/Dark Mode */
.dashboard-container {
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
    --gray-color: #6b7280;
    --gray-hover: #4b5563;
    --admin-color: #8b5cf6;
    --admin-hover: #7c3aed;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dashboard-container.dark {
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
.dashboard-container {
    display: flex;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background-color: var(--bg-secondary);
    transition: var(--transition);
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
}

/* Header */
.header {
    background-color: var(--bg-primary);
    box-shadow: var(--shadow);
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    transition: var(--transition);
}

.header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.page-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
}

.welcome-text {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 500;
}

/* Buttons */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    font-size: 0.875rem;
    border: none;
    cursor: pointer;
    transition: var(--transition);
    text-decoration: none;
    box-shadow: var(--shadow);
}

.btn-primary {
    background-color: var(--primary-color);
    color: white;
}

.btn-primary:hover {
    background-color: var(--primary-hover);
    transform: translateY(-1px);
}

.btn-success {
    background-color: var(--success-color);
    color: white;
}

.btn-success:hover {
    background-color: var(--success-hover);
    transform: translateY(-1px);
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

.btn-gray {
    background-color: var(--gray-color);
    color: white;
}

.btn-gray:hover {
    background-color: var(--gray-hover);
    transform: translateY(-1px);
}

.btn-admin {
    background-color: var(--admin-color);
    color: white;
}

.btn-admin:hover {
    background-color: var(--admin-hover);
    transform: translateY(-1px);
}

.btn-icon {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    justify-content: center;
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.btn-icon:hover {
    background-color: var(--border-color);
    color: var(--text-primary);
}

.icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
}

.full-width {
    width: 100%;
}

/* Responsive Button Text */
.btn-text-mobile {
    display: none;
}

@media (max-width: 640px) {
    .btn-text {
        display: none;
    }

    .btn-text-mobile {
        display: inline;
    }

    .welcome-text {
        display: none;
    }
}

/* Filters Panel */
.filters-panel {
    padding: 1rem 1.5rem;
    background-color: var(--bg-secondary);
    border-top: 1px solid var(--border-color);
    transition: var(--transition);
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
    font-weight: 600;
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

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
}

.filter-checkbox {
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
    border: 1px solid var(--border-color);
    accent-color: var(--primary-color);
}

.checkbox-text {
    font-size: 0.875rem;
    color: var(--text-primary);
    font-weight: 500;
}

/* Main Area */
.main-area {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    min-height: 0;
    background-color: var(--bg-secondary);
}

.dashboard-content {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    max-width: 100%;
}

/* Filter Status */
.filter-status {
    background-color: #dbeafe;
    border: 1px solid #93c5fd;
    border-radius: 0.75rem;
    padding: 1rem;
    box-shadow: var(--shadow);
}

.dashboard-container.dark .filter-status {
    background-color: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
}

.filter-status-content {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.filter-status-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #1e40af;
}

.dashboard-container.dark .filter-status-label {
    color: #93c5fd;
}

.filter-tag {
    font-size: 0.875rem;
    color: #1d4ed8;
    background-color: #dbeafe;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-weight: 500;
}

.dashboard-container.dark .filter-tag {
    color: #93c5fd;
    background-color: rgba(59, 130, 246, 0.2);
}

/* Stats Grid */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
}

.stat-card {
    background-color: var(--bg-primary);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    transition: var(--transition);
}

.stat-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.stat-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 0.5rem 0;
}

.stat-value {
    font-size: 2.25rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
}

.stat-value-success {
    color: var(--success-color);
}

.stat-value-primary {
    color: var(--primary-color);
}

/* Charts Grid */
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 2rem;
}

.chart-card {
    background-color: var(--bg-primary);
    padding: 1.5rem;
    border-radius: 0.75rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    transition: var(--transition);
}

.chart-card:hover {
    box-shadow: var(--shadow-lg);
}

.chart-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 1.5rem 0;
}

.chart-container {
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* Recent Projects */
.recent-projects-card {
    background-color: var(--bg-primary);
    border-radius: 0.75rem;
    box-shadow: var(--shadow);
    border: 1px solid var(--border-color);
    overflow: hidden;
    transition: var(--transition);
}

.card-header {
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color);
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.card-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: white;
    margin: 0;
}

.card-content {
    padding: 1.5rem;
}

.empty-state {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
}

.empty-icon {
    width: 3rem;
    height: 3rem;
    margin: 0 auto 1rem auto;
    opacity: 0.5;
}

.empty-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.5rem 0;
}

.empty-subtitle {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
}

.projects-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.project-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 0.5rem;
    background-color: var(--bg-secondary);
    cursor: pointer;
    transition: var(--transition);
}

.project-item:hover {
    background-color: var(--bg-tertiary);
    transform: translateY(-1px);
    box-shadow: var(--shadow);
}

.project-info {
    min-width: 0;
    flex: 1;
}

.project-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.25rem 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.project-item:hover .project-name {
    color: var(--primary-color);
}

.project-id {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
}

.project-action {
    color: var(--primary-color);
    font-size: 0.875rem;
    font-weight: 600;
    margin-left: 1rem;
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    transition: var(--transition);
}

.project-action:hover {
    color: var(--primary-hover);
}

/* Activities View */
.activities-view {
    height: 100%;
    overflow-y: auto;
}

/* Responsive Design */
@media (max-width: 768px) {
    .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }

    .header-right {
        justify-content: space-between;
    }

    .filters-grid {
        grid-template-columns: 1fr;
    }

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .charts-grid {
        grid-template-columns: 1fr;
    }

    .main-area {
        padding: 1rem;
    }

    .dashboard-content {
        gap: 1.5rem;
    }
}

@media (max-width: 480px) {
    .stats-grid {
        grid-template-columns: 1fr;
    }

    .stat-card {
        padding: 1rem;
    }

    .chart-card {
        padding: 1rem;
    }

    .chart-container {
        height: 250px;
    }
}
</style>
