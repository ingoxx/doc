import Vue from 'vue'
import VueRouter from 'vue-router'

Vue.use(VueRouter)

const routes = [
    {
        path: '/',
        redirect: '/issuer'
    },
    {
        path: '/issuer',
        name: 'issuer',
        component: () => import(/* webpackChunkName: "issuer" */ '../views/issuer/issuer.vue')
    },
    {
        path: '/register',
        name: 'register',
        component: () => import(/* webpackChunkName: "register" */ '../views/register/register.vue')
    },
    {
        path: '/update-password',
        name: 'updatePassword',
        component: () => import(/* webpackChunkName: "updatePassword" */ '../views/user/password.vue')
    },
    {
        path: '/login',
        name: 'login',
        component: () => import(/* webpackChunkName: "login" */ '../views/login/login.vue')
    },
    // 兜底路由：匹配所有不存在的路径，重定向到 /issuer（未登录时会被守卫拦截到 /login）
    {
        path: '*',
        redirect: '/issuer'
    }
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
})

// 1. 定义白名单路径（不需要登录就能访问的页面）
const whiteList = ['/', '/login', '/register', '/update-password'];

/**
 * 校验 localStorage 中的登录凭证是否全部有效
 * @returns {boolean} 三个字段都存在且非空时返回 true
 */
function isAuthValid() {
    const sign = localStorage.getItem('sign');
    const username = localStorage.getItem('username');
    const uid = localStorage.getItem('uid');

    // 检验函数：不能为 null、undefined、"null"、"undefined" 或纯空字符串
    const isValid = (val) => {
        if (val === null || val === undefined) return false;
        const str = String(val).trim();
        return str !== '' && str !== 'null' && str !== 'undefined';
    };

    // 任意一个无效则整体无效（必须三个全部有效）
    return isValid(sign) && isValid(username) && isValid(uid);
}

// 2. 全局前置路由守卫
router.beforeEach((to, from, next) => {
    const hasAuth = isAuthValid();

    // 场景 A：目标路由在白名单中（如：登录页、注册页、重置密码页）
    if (whiteList.includes(to.path)) {
        // 如果用户已经登录，又尝试访问登录页，直接重定向到主页 /issuer
        if (hasAuth && (to.path === '/' || to.path === '/login')) {
            next('/issuer');
        } else {
            next(); // 未登录访问白名单，正常放行
        }
    } 
    // 场景 B：目标路由是受保护的页面（如：/issuer 等）
    else {
        if (hasAuth) {
            next(); // 三个凭证全部齐全，放行进入
        } else {
            // 只要缺少任意一个凭证，清理残留的非法缓存，防止状态错乱
            localStorage.removeItem('sign');
            localStorage.removeItem('username');
            localStorage.removeItem('uid');

            // 修复点：明确跳转到 /login，避免跳转 / 导致路由自动重定向到 /issuer 形成死循环
            next('/login'); 
        }
    }
});

export default router