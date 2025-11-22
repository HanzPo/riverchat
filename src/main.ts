import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initPostHog } from './composables/usePostHog';
import './style.css';

// Initialize PostHog before creating the app
initPostHog();

const app = createApp(App);

app.use(router);

app.mount('#app');
