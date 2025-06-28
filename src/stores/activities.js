import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabaseClient'

export const useActivitiesStore = defineStore('activities', () => {
  const activities = ref([])
  const loading = ref(false)
  const filters = ref({
    urgency: '',
    assigned: '',
    sortBy: 'created_at'
  })

  const filteredActivities = computed(() => {
    let filtered = [...activities.value]

    // Filter by urgency
    if (filters.value.urgency) {
      filtered = filtered.filter(activity => 
        activity.urgency === filters.value.urgency
      )
    }

    // Filter by assignment
    if (filters.value.assigned !== '') {
      const isAssigned = filters.value.assigned === 'true'
      filtered = filtered.filter(activity => 
        activity.assigned === isAssigned
      )
    }

    // Sort activities
    filtered.sort((a, b) => {
      switch (filters.value.sortBy) {
        case 'urgency':
          const urgencyOrder = { 'High': 3, 'Medium': 2, 'Low': 1 }
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
        case 'progress':
          return parseFloat(b.progress) - parseFloat(a.progress)
        case 'expected_time':
          return b.expected_time - a.expected_time
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    return filtered
  })

  async function fetchActivities(projectName = null) {
    loading.value = true
    try {
      let query = supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false })

      if (projectName) {
        query = query.eq('project_name', projectName)
      }

      const { data, error } = await query
      
      if (error) throw error
      activities.value = data || []
    } catch (error) {
      console.error('Error fetching activities:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function createActivity(activityData) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([{
          project_name: activityData.project_name,
          activity_name: activityData.activity_name,
          progress: activityData.progress.toString(),
          expected_time: activityData.expected_time,
          urgency: activityData.urgency,
          notes: activityData.notes || '',
          assigned: activityData.assigned || false,
          assigned_to_who: activityData.assigned_to_who || '',
          created_by: activityData.created_by || ''
        }])
        .select()
      
      if (error) throw error
      if (data && data[0]) {
        activities.value.unshift(data[0])
      }
      return data[0]
    } catch (error) {
      console.error('Error creating activity:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateActivity(id, activityData) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('activities')
        .update({
          project_name: activityData.project_name,
          activity_name: activityData.activity_name,
          progress: activityData.progress.toString(),
          expected_time: activityData.expected_time,
          urgency: activityData.urgency,
          notes: activityData.notes || '',
          assigned: activityData.assigned || false,
          assigned_to_who: activityData.assigned_to_who || '',
          created_by: activityData.created_by || ''
        })
        .eq('id', id)
        .select()
      
      if (error) throw error
      
      // Update the activity in the local array
      const index = activities.value.findIndex(a => a.id === id)
      if (index !== -1 && data && data[0]) {
        activities.value[index] = data[0]
      }
      return data[0]
    } catch (error) {
      console.error('Error updating activity:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteActivity(id) {
    loading.value = true
    try {
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      // Remove from local array
      activities.value = activities.value.filter(a => a.id !== id)
    } catch (error) {
      console.error('Error deleting activity:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  return {
    activities,
    loading,
    filters,
    filteredActivities,
    fetchActivities,
    createActivity,
    updateActivity,
    deleteActivity,
    setFilters
  }
})
