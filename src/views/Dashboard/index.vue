<template>
  <div class="dashboard-page">
    <!-- 顶端问候横幅 -->
    <el-card shadow="never" class="welcome-card mb-4" :body-style="{ display: 'flex', alignItems: 'center' }">
      <el-avatar :size="64" :src="userStore.userInfo?.avatar || 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'" class="mr-4" />
      <div>
        <h2 class="welcome-title">早安，{{ userStore.userInfo?.real_name || userStore.userInfo?.username }}，祝你在实验室的一天有所突破。</h2>
        <p class="welcome-subtitle">
          您的安全级位：<el-tag size="small" type="success" effect="dark">{{ userStore.userInfo?.role }}</el-tag>
          <el-divider direction="vertical" />
          归属部属：{{ userStore.userInfo?.department }}
        </p>
      </div>
    </el-card>
    
    <el-row :gutter="20" class="mt-4">
      <el-col :xs="24" :sm="16" class="col-responsive flex-mb">
        <el-card shadow="never" class="table-card">
          <template #header>
            <div style="font-weight: bold;">近期负责波形流水 (Top 5 快捷入口)</div>
          </template>
          <el-table :data="recentRecords" style="width: 100%" size="small">
            <el-table-column prop="created_at" label="采样时间" width="160" />
            <el-table-column prop="project_name" label="目标实验项目" />
            <el-table-column prop="measured_vpp" label="信号幅值 (VPP)" width="120">
              <template #default="{ row }">
                <el-tag :type="row.measured_vpp > 0 ? 'danger' : 'info'">{{ row.measured_vpp || 0 }} V</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="快捷链接" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link @click="goToHistory(row.project_id)">进入源表</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>

      <el-col :xs="24" :sm="8" class="col-responsive">
        <el-card shadow="never" class="storage-card">
          <template #header>
            <div style="font-weight: bold;">科研配额云空间占用</div>
          </template>
          <div class="progress-wrapper" style="display: flex; justify-content: center; padding: 20px 0;">
             <el-progress type="dashboard" :percentage="dashboardData.storage_used_percent" :color="progressColors">
                <template #default="{ percentage }">
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <span style="font-size: 24px; font-weight: bold; color: var(--el-text-color-primary);">{{ percentage }}%</span>
                    <span style="font-size: 12px; color: var(--el-text-color-secondary); margin-top: 4px;">已耗用 ({{ dashboardData.storage_used_gb }})</span>
                  </div>
                </template>
             </el-progress>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/store/user';
import { useRouter } from 'vue-router';
import { DashboardAPI } from '@/api';
import { ElMessage } from 'element-plus';

const userStore = useUserStore();

const progressColors = [
  { color: '#5cb87a', percentage: 40 },
  { color: '#e6a23c', percentage: 70 },
  { color: '#f56c6c', percentage: 90 },
];

const dashboardData = ref<any>({
  projects_count: 0,
  total_records: 0,
  work_hours: 0,
  storage_used_percent: 0,
  storage_used_gb: '0GB',
  recent_records: []
});

const loadSummary = async () => {
  try {
    const res: any = await DashboardAPI.getSummary();
    const data = res.data || res;
    dashboardData.value = {
      projects_count: data.projects_count || 0,
      total_records: data.total_records || 0,
      work_hours: data.work_hours || 0,
      storage_used_percent: 68,
      storage_used_gb: '34.2GB',
      recent_records: data.recent_records || []
    };
  } catch (e) {
    ElMessage.warning('提取仪表盘统筹数据失败！');
  }
};

onMounted(() => {
  loadSummary();
});

const recentRecords = computed(() => dashboardData.value.recent_records);

const router = useRouter();
const goToHistory = (projectId: number | string) => {
  router.push({
    path: '/records',
    query: { projectId: String(projectId) }
  });
};
</script>

<style scoped>
.mb-4 { margin-bottom: 24px; }
.mr-4 { margin-right: 20px; }

/* 欢迎卡片优化 */
.welcome-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: none;
}
.welcome-title { margin: 0 0 4px 0; font-size: 22px; font-weight: bold; color: #2c3e50; }
.welcome-subtitle { margin: 0; color: #576574; font-size: 14px; opacity: 0.8; }

/* 核心毛玻璃卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  padding: 24px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.glass-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.1); }

.stat-card { display: flex; align-items: center; }
.stat-icon-wrapper {
  width: 56px; height: 56px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px; margin-right: 18px;
}
.stat-icon-wrapper.blue { background: #e0f2fe; color: #3b82f6; }
.stat-icon-wrapper.orange { background: #fff7ed; color: #f97316; }
.stat-icon-wrapper.green { background: #f0fdf4; color: #22c55e; }

.stat-value { font-size: 28px; font-weight: 800; color: #1e293b; line-height: 1.2; }
.stat-label { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }

.shadow-premium { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); }

/* 表格与存储卡片 */
.table-card, .storage-card {
  border-radius: 20px;
  border: 1px solid #f1f5f9;
}

@media (max-width: 768px) {
  .flex-mb { margin-bottom: 24px; }
  .welcome-subtitle { line-height: 1.6; }
  .stat-card { padding: 16px; }
  .stat-value { font-size: 24px; }
}
</style>
