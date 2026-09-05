import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css'

import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSun, faMoon, faRotate, faCircle, faHeartPulse, faTriangleExclamation, faCode, faCheck, faSpinner, faPlus, faLocationDot, faClock, faUserPlus, faArrowLeft, faCalendarDays, faPen, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons'

// add to library for string-based usage if needed, and ensure SVG core is initialized
library.add(faSun, faMoon, faRotate, faCircle, faHeartPulse, faTriangleExclamation, faCode, faCheck, faSpinner, faPlus, faLocationDot, faClock, faUserPlus, faArrowLeft, faCalendarDays, faPen, faTrash, faXmark)

const app = createApp(App)
app.component('FontAwesomeIcon', FontAwesomeIcon)
app.use(router)
app.mount('#app')
