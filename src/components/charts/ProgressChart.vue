<template>
  <div class="w-full h-64">
    <Bar
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  projects: {
    type: Array,
    default: () => []
  },
  activities: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const projectProgress = props.projects.map(project => {
    const projectActivities = props.activities.filter(a => a.project_id === project.id)
    const avgProgress = projectActivities.length > 0
      ? projectActivities.reduce((sum, a) => sum + a.progress, 0) / projectActivities.length
      : 0
    
    return {
      name: project.name,
      progress: Math.round(avgProgress)
    }
  })

  return {
    labels: projectProgress.map(p => p.name),
    datasets: [{
      label: 'Progress (%)',
      data: projectProgress.map(p => p.progress),
      backgroundColor: '#8B5CF6',
      borderColor: '#7C3AED',
      borderWidth: 1
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      max: 100
    }
  },
  plugins: {
    legend: {
      display: false
    }
  }
}
</script>