<template>
  <el-container class="admin-layout-container">
    <!-- 左侧菜单边栏 -->
    <el-aside v-if="!isMobile" width="240px" class="layout-aside">
      <div class="logo-area">
        <el-icon :size="24" color="#fff" class="mr-2"><Platform /></el-icon>
        <span class="logo-text">管理中心</span>
      </div>
      
      <el-menu
        :default-active="route.path"
        class="main-menu"
        background-color="#191a23"
        text-color="#a0a5b8"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        
        <el-menu-item index="/projects" v-if="userStore.userInfo?.role === 'admin'">
          <el-icon><Files /></el-icon>
          <span>实验项目</span>
        </el-menu-item>
        
        <el-menu-item index="/records">
          <el-icon><Document /></el-icon>
          <span>历史记录</span>
        </el-menu-item>

        <!-- 管理员专属高级功能 -->
        <template v-if="userStore.userInfo?.role === 'admin'">
          <div class="menu-divider">系统管理</div>
          <el-menu-item index="/admin/users">
            <el-icon><User /></el-icon>
            <span>人员大盘管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/teams">
            <el-icon><Management /></el-icon>
            <span>加组申请审批</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <!-- 移动端抽屉导航 -->
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      size="240px"
      :with-header="false"
      class="mobile-menu-drawer"
    >
      <div class="logo-area">
        <el-icon :size="24" color="#fff" class="mr-2"><Platform /></el-icon>
        <span class="logo-text">管理中心</span>
      </div>
      <el-menu
        :default-active="route.path"
        class="main-menu"
        background-color="#191a23"
        text-color="#a0a5b8"
        active-text-color="#ffffff"
        router
        @select="drawerVisible = false"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>工作台</span>
        </el-menu-item>
        <el-menu-item index="/projects" v-if="userStore.userInfo?.role === 'admin'">
          <el-icon><Files /></el-icon>
          <span>实验项目</span>
        </el-menu-item>
        <el-menu-item index="/records">
          <el-icon><Document /></el-icon>
          <span>历史记录</span>
        </el-menu-item>
        <template v-if="userStore.userInfo?.role === 'admin'">
          <div class="menu-divider">系统管理</div>
          <el-menu-item index="/admin/users">
            <el-icon><User /></el-icon>
            <span>人员大盘管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/teams">
            <el-icon><Management /></el-icon>
            <span>加组申请审批</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-drawer>

    <el-container class="layout-main-panel">
      <!-- 顶部 Header 状态栏 -->
      <el-header height="60px" class="layout-header">
        <div class="header-left">
          <el-button
            v-if="isMobile"
            type="primary"
            link
            class="menu-toggle-btn"
            @click="drawerVisible = true"
          >
            <el-icon :size="20"><MenuIcon /></el-icon>
          </el-button>
          <el-breadcrumb separator="/" v-else>
            <el-breadcrumb-item>总览管理</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <el-dropdown trigger="click" @command="handleCommand">
            <span class="user-dropdown">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" />
              <span class="username">{{ userStore.userInfo?.real_name || userStore.userInfo?.username }}</span>
              <el-tag size="small" type="success" effect="dark">{{ userStore.userInfo?.role }}</el-tag>
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>所属: {{ userStore.userInfo?.department }}</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 核心承载路由墙 -->
      <el-main class="layout-body-wrapper">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { Platform, DataBoard, Files, Document, ArrowDown, User, Management, Menu as MenuIcon } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isMobile = ref(false);
const drawerVisible = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
  if (!isMobile.value) {
    drawerVisible.value = false;
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  if (userStore.token && !userStore.userInfo) {
    userStore.fetchUserInfo();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.clearAuth();
    ElMessage.info('已安全退出。');
    router.push('/login');
  }
};
</script>

<style scoped>
.admin-layout-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  display: flex;
}

.layout-aside {
  background-color: #191a23;
  display: flex;
  flex-direction: column;
}

.logo-area {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #101117;
}

.logo-text {
  color: #fff;
  font-weight: bold;
  font-size: 18px;
  letter-spacing: 1px;
}

.mr-2 { margin-right: 8px; }

.main-menu {
  flex: 1;
  border-right: none;
}
.main-menu .is-active {
  background-color: var(--el-color-primary) !important;
  color: #fff !important;
  font-weight: bold;
}

.menu-divider {
  padding: 15px 20px 5px;
  font-size: 11px;
  color: #606266;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.layout-main-panel {
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  min-width: 0; /* 防止被内部表格等内容撑开导致移动端横向溢出 */
}

.layout-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
}
.user-dropdown .username {
  font-weight: 500;
  color: #333;
}

.layout-body-wrapper {
  padding: 24px;
  overflow-y: auto;
  position: relative;
}

/* 页面切换动画 */
.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.3s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.menu-toggle-btn {
  padding: 0;
  height: auto;
  color: #333;
  margin-right: 12px;
}

:deep(.mobile-menu-drawer) {
  background-color: #191a23 !important;
}

:deep(.mobile-menu-drawer .el-drawer__body) {
  padding: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .layout-body-wrapper {
    padding: 12px;
  }
  .layout-header {
    padding: 0 12px;
  }
  .username {
    display: none;
  }
}
</style>
