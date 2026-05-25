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
        meta: { roles: ['admin'] }
      },
      {
        path: 'records',
        name: 'RecordHistory',
        component: () => import('../views/Record/History.vue')
      },
      {
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
        meta: { roles: ['admin', 'teacher'] }
      }
    ]
  },

];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

router.beforeEach((to) => {
  const userStore = useUserStore();
  
  const requireAuth = (to.meta.requireAuth as boolean | undefined) ?? true;

  if (requireAuth && !userStore.token) {
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

  return true;
});

export default router;
