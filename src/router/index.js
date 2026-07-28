import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
    // 1. 访问 '/' 时直接重定向到 '/issuer'
    {
        path: '/',
        redirect: '/issuer'
    },
    // 2. 一级路由：直接渲染 issuer.vue
    {
        path: '/issuer',
        name: 'issuer',
        component: () => import(/* webpackChunkName: "issuer" */ '../views/issuer/issuer.vue')
    },
    // 3. 一级路由：直接渲染 register.vue
    {
        path: '/register',
        name: 'register',
        component: () => import(/* webpackChunkName: "register" */ '../views/register/register.vue')
    },
    // 3. 一级路由：直接渲染 register.vue
    {
        path: '/update-password',
        name: 'updatePassword',
        component: () => import(/* webpackChunkName: "updatePassword" */ '../views/user/password.vue')
    }
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

export default router