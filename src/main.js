import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './assets/styles.css'  // Add this line

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

app.mount('#app')

// Handle uncaught errors
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue error:', err, info)
}
