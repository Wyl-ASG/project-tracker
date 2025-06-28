<template>
  <div class="w-full h-64">
    <Doughnut
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  activities: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const statusCounts = {
    'Not Started': 0,
    'In Progress': 0,
    'Complete': 0,
    'Not Assigned': 0
  }

  props.activities.forEach(activity => {
    statusCounts[activity.status] = (statusCounts[activity.status] || 0) + 1
  })

  return {
    labels: Object.keys(statusCounts),
    datasets: [{
      data: Object.values(statusCounts),
      backgroundColor: [
        '#6B7280', // Gray for Not Started
        '#3B82F6', // Blue for In Progress
        '#10B981', // Green for Complete
        '#F59E0B'  // Yellow for Not Assigned
      ],
      borderWidth: 0
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  }
}
</script>