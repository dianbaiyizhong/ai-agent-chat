import { createApp } from 'vue'
import App from './App.vue'
const app = createApp(App)

import TDesignChat from '@tdesign-vue-next/chat'; // 引入chat组件
import 'tdesign-vue-next/es/style/index.css'; // 引入少量全局样式变量
app.use(TDesignChat);
app.mount('#app')
