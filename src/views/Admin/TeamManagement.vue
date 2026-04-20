<template>
  <div class="admin-page-container animate-fade-in">
    <!-- 顶部状态统计 -->
    <el-row :gutter="24" class="mb-8">
      <el-col :xs="24" :sm="12">
        <div class="summary-card pending shadow-premium">
          <div class="card-glow"></div>
          <div class="card-inner">
            <div class="icon-wrap"><el-icon><Stamp /></el-icon></div>
            <div class="data">
              <div class="val">{{ applications.length }}</div>
              <div class="label">当前挂起的加组申请</div>
            </div>
            <el-button type="primary" round size="small" @click="activeTab = 'apps'">前往处理</el-button>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12">
        <div class="summary-card groups shadow-premium">
          <div class="card-glow"></div>
          <div class="card-inner">
            <div class="icon-wrap"><el-icon><OfficeBuilding /></el-icon></div>
            <div class="data">
              <div class="val">{{ groups.length }}</div>
              <div class="label">已存续课题组及实验室</div>
            </div>
            <el-button type="success" round size="small" @click="createVisible = true">新建分组</el-button>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="glass-header mb-6">
      <div class="h-left">
        <h2 class="title">加组审批与协同中心</h2>
        <p class="subtitle">打通导师审批申请、学子主动入组的闭环科研管理链路</p>
      </div>
    </div>

    <!-- 核心功能标签页 -->
    <el-tabs v-model="activeTab" class="glass-tabs shadow-premium">
      <el-tab-pane name="apps">
        <template #label>
          <div class="custom-tab-label">
            <el-icon><Check /></el-icon> 申请处理池
            <el-badge v-if="applications.length" :value="applications.length" class="tab-badge" />
          </div>
        </template>
        
        <el-table :data="applications" v-loading="loading" style="width: 100%">
          <el-table-column label="申请人员" width="220">
            <template #default="{ row }">
              <div class="applicant-info">
                <el-avatar :size="32" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />
                <span class="name">{{ row.username }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="目标课题组" min-width="200">
            <template #default="{ row }">
              <el-tag effect="plain" type="info">{{ row.group_name }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="发起时间" width="200">
            <template #default="{ row }">
              <div class="time-col">
                <el-icon class="mr-1"><Calendar /></el-icon>
                {{ new Date(row.created_at).toLocaleString() }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" align="right" width="220">
            <template #default="{ row }">
              <el-button type="success" size="small" :icon="Check" @click="handleApp(row, 'approve')">批准</el-button>
              <el-button type="danger" size="small" plain :icon="Close" @click="handleApp(row, 'reject')">驳回</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="applications.length === 0" description="清空了！所有申请已处理完毕" />
      </el-tab-pane>

      <el-tab-pane name="groups">
        <template #label>
          <div class="custom-tab-label"><el-icon><Menu /></el-icon> 课题组全景视图</div>
        </template>
        
        <el-table :data="groups" v-loading="loading">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="name" label="组名 / 实验室名称" min-width="180">
            <template #default="{ row }">
              <span class="group-name-text">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="隔离属性" width="140">
            <template #default="{ row }">
              <el-tag :type="row.group_type === 'private' ? 'info' : 'success'" effect="dark" size="small">
                {{ row.group_type === 'private' ? '个人私有域' : '公共课题组' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="subject_name" label="隶属二级学科" />
          <el-table-column label="管理权属 ID" width="120">
            <template #default="{ row }">
              <span class="manager-id">UID: {{ row.manager_id || 'SYSTEM' }}</span>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <!-- 新建对话框 -->
    <el-dialog v-model="createVisible" title="创建新科研组/实验室" width="480px" class="premium-dialog">
      <el-form :model="createForm" label-position="top">
        <el-form-item label="名称设定 (Name)">
          <el-input v-model="createForm.name" placeholder="请输入课题组或项目组名称" />
        </el-form-item>
        <el-form-item label="隶属学科节点 (Subject ID)">
          <el-input-number v-model="createForm.subject_id" :min="1" class="w-full" />
        </el-form-item>
        <el-form-item label="公开性策略">
          <el-radio-group v-model="createForm.group_type" class="w-full row-radio">
            <el-radio value="public">公共学术组 (支持学子申请)</el-radio>
            <el-radio value="private" disabled>私有实验区 (由系统自动关联)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="loading" @click="submitCreate">确认立项并发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Check, Close, Stamp, OfficeBuilding, Calendar, Menu } from '@element-plus/icons-vue';
import { ElMessage, ElNotification } from 'element-plus';
import { GroupAPI } from '@/api';

const loading = ref(false);
const activeTab = ref('apps');
const applications = ref<any[]>([]);
const groups = ref<any[]>([]);

const refreshData = async () => {
  loading.value = true;
  try {
    const [appRes, groupRes]: any = await Promise.all([
      GroupAPI.getPendingApplications(),
      GroupAPI.getGroups()
    ]);
    applications.value = appRes.data || [];
    groups.value = groupRes.data || [];
  } catch (err: any) {
    console.error(err);
  } finally {
    loading.value = false;
  }
};

onMounted(refreshData);

const handleApp = async (row: any, action: 'approve' | 'reject') => {
  try {
    await GroupAPI.handleApplication(row.app_id, action);
    ElNotification({
      title: action === 'approve' ? '入组许可已发放' : '申请已驳回',
      message: `已处理 ${row.username} 发往 ${row.group_name} 的加入请求`,
      type: action === 'approve' ? 'success' : 'info'
    });
    refreshData();
  } catch (e) {}
};

// 创建逻辑
const createVisible = ref(false);
const createForm = ref({
  name: '',
  subject_id: 1,
  group_type: 'public'
});

const submitCreate = async () => {
  if (!createForm.value.name) return ElMessage.warning('请输入分组名称');
  try {
    await GroupAPI.createGroup(createForm.value);
    ElMessage.success('全新课题组已成功立项并部署');
    createVisible.value = false;
    refreshData();
  } catch (e) {}
};
</script>

<style scoped>
.admin-page-container { max-width: 1200px; margin: 0 auto; padding-top: 10px; }

/* 磁贴卡片风格 */
.summary-card {
  height: 140px;
  border-radius: 24px;
  padding: 24px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  transition: all 0.3s ease;
}
.summary-card:hover { transform: scale(1.02); }
.summary-card.pending { background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; }
.summary-card.groups { background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%); color: white; }

.card-glow {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%);
  pointer-events: none;
}

.card-inner { position: relative; z-index: 1; display: flex; align-items: center; width: 100%; gap: 20px; }
.icon-wrap { font-size: 40px; opacity: 0.8; }
.data { flex: 1; }
.data .val { font-size: 38px; font-weight: 800; line-height: 1; }
.data .label { font-size: 14px; opacity: 0.9; margin-top: 5px; }

.glass-header { margin-top: 30px; }
.title { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
.subtitle { color: #64748b; margin-top: 6px; font-size: 15px; }

/* 玻璃态标签页 */
.glass-tabs {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.custom-tab-label { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.tab-badge { margin-left: 4px; }

.applicant-info { display: flex; align-items: center; gap: 12px; }
.applicant-info .name { font-weight: 700; color: #334155; }

.time-col { font-size: 13px; color: #64748b; display: flex; align-items: center; }
.group-name-text { font-weight: 600; color: #1e293b; }
.manager-id { font-family: monospace; font-size: 12px; color: #94a3b8; }

.w-full { width: 100%; }
.row-radio { display: flex; flex-direction: column; gap: 10px; }

.animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.shadow-premium { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); }
</style>
