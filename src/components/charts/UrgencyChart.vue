<template>
  <div class="w-full h-64">
    <Pie
      :data="chartData"
      :options="chartOptions"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Pie } from 'vue-chartjs'
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
  const urgencyCounts = {
    'High': 0,
    'Medium': 0,
    'Low': 0
  }

  props.activities.forEach(activity => {
    urgencyCounts[activity.urgency] = (urgencyCounts[activity.urgency] || 0) + 1
  })

  return {
    labels: Object.keys(urgencyCounts),
    datasets: [{
      data: Object.values(urgencyCounts),
      backgroundColor: [
        '#EF4444', // Red for High
        '#F59E0B', // Yellow for Medium
        '#10B981'  // Green for Low
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
