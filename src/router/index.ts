import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useUserStore } from '../store/user';
import { ElMessage } from 'element-plus';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login/index.vue'),
    meta: { requireAuth: false }
  },
  {
    path: '/',
    // 全局嵌套 Layout，后台所有受保护页面都渲染在这里面
    component: () => import('../components/layout/BaseLayout.vue'),
    meta: { requireAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard/index.vue')
      },
      {
        path: 'projects',
        name: 'ProjectList',
        component: () => import('../views/Project/List.vue'),
        meta: { roles: ['admin'] } // 只有管理员可访问项目管理
      },
      {
        path: 'records',
        name: 'RecordHistory',
        component: () => import('../views/Record/History.vue')
      },
      {
        // 核心传承点：把之前测试通过的完美组件整合进带导航的体系中
        path: 'experiment/entry',
        name: 'ExperimentEntry',
        component: () => import('../views/Experiment/Entry.vue')
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('../views/Admin/UserManagement.vue'),
        meta: { roles: ['admin'] }
      },
      {
        path: 'admin/teams',
        name: 'TeamManagement',
        component: () => import('../views/Admin/TeamManagement.vue'),
        meta: { roles: ['admin', 'teacher'] } // 教师也能进协同中心，但 API 层面会有数据隔离
      }
    ]
  },

];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// 全局前置路由守卫：绝对执行拦截鉴权逻辑
router.beforeEach((to) => {
  // 注意：Pinia store 必须在使用前动态实例化
  const userStore = useUserStore();
  
  // 如果没有配置 requireAuth，为了系统极致安全，默认所有未标注节点为核心节点，必须拦截
  const requireAuth = (to.meta.requireAuth as boolean | undefined) ?? true;

  if (requireAuth && !userStore.token) {
    // 拦截无证驾驶人员，强制引渡到登录节点，并携带尝试访问的面包屑地址
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  
  // RBAC 权限校验
  const metaRoles = to.meta.roles as string[] | undefined;
  if (metaRoles && metaRoles.length > 0) {
    const userRole = userStore.userInfo?.role || 'operator';
    if (!metaRoles.includes(userRole)) {
      ElMessage.warning('您的权限不足，无权访问该页面');
      return { path: '/dashboard' };
    }
  }

  // 已认证 或 属于白名单免签节点（/login, /dsp-debug）直接放行
  return true;
});

export default router;
