import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref([])
  const loading = ref(false)
  const selectedProject = ref(null)

  async function fetchProjects() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) throw error
      projects.value = data || []
    } catch (error) {
      console.error('Error fetching projects:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createProject(projectData) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          project_name: projectData.project_name
        }])
        .select()
      
      if (error) throw error
      if (data && data[0]) {
        projects.value.unshift(data[0])
      }
      return data[0]
    } catch (error) {
      console.error('Error creating project:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateProject(id, projectData) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          project_name: projectData.project_name
        })
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      const index = projects.value.findIndex(p => p.id === id)
      if (index !== -1 && data && data[0]) {
        projects.value[index] = data[0]
      }
      return data[0]
    } catch (error) {
      console.error('Error updating project:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      projects.value = projects.value.filter(p => p.id !== id)
      if (selectedProject.value && selectedProject.value.id === id) {
        selectedProject.value = null
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  function selectProject(project) {
    selectedProject.value = project
  }

  return {
    projects,
    loading,
    selectedProject,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject
  }
})
