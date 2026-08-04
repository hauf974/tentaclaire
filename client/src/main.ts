import '@fontsource/im-fell-english/latin-400.css';
import '@fontsource/caudex/latin-400.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/creepster/latin-400.css';
import '@fontsource/cormorant/latin-400.css';
import '@fontsource/press-start-2p/latin-400.css';
import './themes/themes.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';

createApp(App).use(router).mount('#app');
