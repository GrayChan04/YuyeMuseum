import { createRouter, createWebHashHistory } from 'vue-router'
import AboutView from '../views/AboutView.vue'
import HomeView from '../views/HomeView.vue'
import KeywordView from '../views/KeywordView.vue'
import LawnView from '../views/LawnView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/keyword/:id', name: 'keyword', component: KeywordView },
    { path: '/lawn', name: 'lawn', component: LawnView },
    { path: '/about', name: 'about', component: AboutView },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const titles = {
    home: '榆野博物馆',
    keyword: '馆藏时间轴｜榆野博物馆',
    lawn: '小草坪｜榆野博物馆',
    about: '关于本馆｜榆野博物馆',
    'not-found': '展厅未开放｜榆野博物馆',
  }

  document.title = titles[to.name] ?? '榆野博物馆'
})

export default router
