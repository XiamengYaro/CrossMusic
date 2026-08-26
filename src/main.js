import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/global.css'

const app = createApp(App)

app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err.message, '\nComponent:', instance?.$options?.name || 'unknown', '\nInfo:', info)
}

app.use(createPinia())
app.use(router)
app.mount('#app')

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Rejection]', e.reason?.message || e.reason)
})
window.addEventListener('error', (e) => {
  console.error('[Global Error]', e.message)
})
