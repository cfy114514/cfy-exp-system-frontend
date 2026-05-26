<template>
  <div class="admin-page-container animate-fade-in">
    <el-row :gutter="20" class="mb-6">
      <el-col :xs="24" :sm="6" v-for="stat in stats" :key="stat.label">
        <div class="glass-card stat-item shadow-premium" :class="stat.color">
          <div class="stat-content">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-value">{{ stat.value }}</div>
          </div>
          <div class="stat-icon-bg">
            <el-icon><component :is="stat.icon" /></el-icon>
          </div>
        </div>
      </el-col>
    </el-row>

    <div class="glass-header mb-6">
      <div class="h-left">
        <h2 class="title">人员资产管理</h2>
        <p class="subtitle">穿透式管理全系统账户权限与科研档案</p>
      </div>
      <div class="h-right search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索用户名/真实姓名..."
          :prefix-icon="Search"
          clearable
          class="premium-search"
        />
        <el-button type="primary" :icon="Plus" class="ml-4" @click="handleCreateUser">快捷导流</el-button>
      </div>
    </div>

    <el-card class="glass-table-card shadow-premium">
      <el-table 
        :data="filteredUsers" 
        v-loading="loading" 
        style="width: 100%" 
        :header-cell-style="{ background: 'transparent', fontWeight: 'bold', color: '#64748b' }"
      >
        <el-table-column label="人员画像" width="250">
          <template #default="{ row }">
            <div class="user-profile">
              <el-avatar :size="42" :src="formatAvatar(row.avatar_path)" class="profile-avatar" />
              <div class="profile-info">
                <div class="real-name">{{ row.real_name || row.username }}</div>
                <div class="username-tag">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="department" label="所属单位/院系">
          <template #default="{ row }">
            <span class="dept-text">{{ row.department || '待录入' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="权限阶梯" width="140">
          <template #default="{ row }">
            <el-tag :type="getRoleTag(row.role)" effect="dark" size="small" class="role-tag">
              {{ row.role.toUpperCase() }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="账号状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.is_active"
              :active-value="1"
              :inactive-value="0"
              active-color="#10b981"
              @change="(val: any) => handleStatusChange(row, val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作资产" align="right" width="220">
          <template #default="{ row }">
            <el-button-group class="action-group">
              <el-button size="small" :icon="Edit" @click="handleOpenEdit(row)">编辑资料</el-button>
              <el-button size="small" :icon="RefreshLeft" type="warning" @click="handleResetPwd(row)">重置</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" title="核心人员档案修改" width="550px" class="premium-dialog">
      <el-tabs v-model="activeEditTab">
        <el-tab-pane label="基本详勘" name="profile">
          <el-form :model="editForm" label-position="top" class="mt-4">
            <el-form-item label="真实姓名">
              <el-input v-model="editForm.real_name" placeholder="请输入真实姓名" />
            </el-form-item>
            <el-form-item label="所属单位">
              <el-input v-model="editForm.department" placeholder="请输入实验室或课题组" />
            </el-form-item>
            <el-form-item label="权限角色授权">
              <el-radio-group v-model="editForm.role" class="role-selector">
                <el-radio-button value="student">学生/研究员</el-radio-button>
                <el-radio-button value="teacher">导师/领队</el-radio-button>
                <el-radio-button value="admin">系统管理员</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="形象载入 (Avatar)" name="avatar">
          <div class="avatar-upload-base mt-4">
            <el-upload
              class="avatar-uploader"
              action=""
              :show-file-list="false"
              :auto-upload="false"
              @change="handleAvatarChange"
            >
              <img v-if="avatarPreview" :src="avatarPreview" class="avatar-preview-img" />
              <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
            </el-upload>
            <p class="upload-tip">点击画布上传物理头像文件 (支持 .jpg/.png)</p>
          </div>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="editVisible = false">放弃修改</el-button>
          <el-button type="primary" :loading="submitting" @click="submitGlobalEdit">持久化保存</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, Edit, RefreshLeft, Search, User, Stamp, Timer, Lock } from '@element-plus/icons-vue';
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus';
import { AdminAPI } from '@/api';

const loading = ref(false);
const users = ref<any[]>([]);
const searchQuery = ref('');
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png';

const stats = computed(() => [
  { label: '科研总人数', value: users.value.length, icon: User, color: 'blue' },
  { label: '活跃研究员', value: users.value.filter(u => u.is_active === 1).length, icon: Timer, color: 'green' },
  { label: '特权导师', value: users.value.filter(u => u.role === 'teacher').length, icon: Stamp, color: 'orange' },
  { label: '受限账号', value: users.value.filter(u => u.is_active === 0).length, icon: Lock, color: 'red' },
]);

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value;
  const q = searchQuery.value.toLowerCase();
  return users.value.filter(u => 
    u.username.toLowerCase().includes(q) || 
    (u.real_name && u.real_name.toLowerCase().includes(q))
  );
});

const formatAvatar = (path: string) => {
  if (!path) return defaultAvatar;
  if (path.startsWith('http')) return path;
  return `/api/${path.replace(/\\/g, '/')}`;
};

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res: any = await AdminAPI.getAllUsers();
    users.value = Array.isArray(res) ? res : (res.data || []);
  } catch (err: any) {
    ElMessage.error('无法拉取全局人员列表，请确认 Admin 权限');
  } finally {
    loading.value = false;
  }
};

onMounted(fetchUsers);

const handleStatusChange = async (row: any, val: any) => {
  try {
    await AdminAPI.updateUserStatus(row.id, val);
    ElNotification({
      title: '指令下达成功',
      message: `${row.username} 账号已处以${val === 1 ? '解封' : '封禁'}`,
      type: val === 1 ? 'success' : 'warning',
      position: 'bottom-right'
    });
  } catch (e) {
    row.is_active = val === 1 ? 0 : 1; 
  }
};

const handleResetPwd = async (row: any) => {
  let newPassword;
  try {
    const result = await ElMessageBox.prompt(
      `请输入用户 @${row.username} 的新密码`,
      '重置密码',
      {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        inputPattern: /^.{6,}$/,
        inputErrorMessage: '密码长度不能少于 6 位',
        inputType: 'password'
      }
    );
    newPassword = result.value;
  } catch (cancel) {
    return; // 用户点击取消，直接退出
  }

  if (newPassword) {
    try {
      await AdminAPI.resetUserPassword(row.id, newPassword);
      ElMessage.success({ message: `用户 @${row.username} 的密码已成功重置`, showClose: true });
    } catch (error: any) {
      // 捕捉后端报错并显示，避免错误被静默吞掉
      const errMsg = error.response?.data?.detail || '密码修改失败，请检查网络或后端服务';
      ElMessage.error({ message: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg), showClose: true });
    }
  }
};

const editVisible = ref(false);
const activeEditTab = ref('profile');
const editingUser = ref<any>(null);
const submitting = ref(false);
const avatarPreview = ref('');
const selectedAvatarFile = ref<File | null>(null);

const editForm = ref({
  real_name: '',
  department: '',
  role: ''
});

const handleOpenEdit = (row: any) => {
  editingUser.value = row;
  editForm.value = {
    real_name: row.real_name || '',
    department: row.department || '',
    role: row.role
  };
  avatarPreview.value = formatAvatar(row.avatar_path);
  selectedAvatarFile.value = null;
  editVisible.value = true;
};

const handleAvatarChange = (file: any) => {
  selectedAvatarFile.value = file.raw;
  avatarPreview.value = URL.createObjectURL(file.raw);
};

const submitGlobalEdit = async () => {
  if (!editingUser.value) return;
  submitting.value = true;
  try {
    const uId = editingUser.value.id;
    const tasks = [];
    tasks.push(AdminAPI.updateUserProfile(uId, {
      real_name: editForm.value.real_name,
      department: editForm.value.department
    }));
    
    if (editForm.value.role !== editingUser.value.role) {
      tasks.push(AdminAPI.updateUserRole(uId, editForm.value.role));
    }
    
    if (selectedAvatarFile.value) {
      tasks.push(AdminAPI.uploadAvatar(uId, selectedAvatarFile.value));
    }
    
    await Promise.all(tasks);
    ElMessage.success('人员档案已完成全量更新');
    editVisible.value = false;
    fetchUsers();
  } catch (e) {
    console.error(e);
  } finally {
    submitting.value = false;
  }
};

const getRoleTag = (role: string) => {
  const map: any = { admin: 'danger', teacher: 'warning', student: 'success' };
  return map[role] || 'info';
};

const handleCreateUser = () => {
  ElMessage.info('快捷通道仅对内测开放，目前请使用注册页面');
};
</script>

<style scoped>
.admin-page-container { max-width: 1300px; margin: 0 auto; padding-bottom: 50px; }

/* 统计卡片样式 */
.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}
.stat-item:hover { transform: translateY(-8px); }
.stat-label { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 32px; font-weight: 800; color: #1e293b; margin-top: 4px; }
.stat-icon-bg { font-size: 48px; opacity: 0.1; position: absolute; right: -10px; bottom: -10px; transform: rotate(-15deg); }

.blue { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); color: #2563eb; }
.green { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); color: #16a34a; }
.orange { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); color: #ea580c; }
.red { background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); color: #dc2626; }

.glass-header { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.title { font-size: 28px; font-weight: 800; color: #1e293b; margin: 0; }
.subtitle { color: #64748b; margin-top: 6px; font-size: 15px; }

.search-box { display: flex; align-items: center; }
.premium-search { width: 300px; }
.premium-search :deep(.el-input__wrapper) { border-radius: 12px; background: rgba(255,255,255,0.8); backdrop-filter: blur(4px); }

.glass-table-card { border-radius: 24px; background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5); }

.user-profile { display: flex; align-items: center; gap: 14px; }
.profile-avatar { border: 2px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.real-name { font-weight: 700; color: #1e293b; font-size: 15px; }
.username-tag { font-size: 12px; color: #94a3b8; font-family: monospace; }
.dept-text { color: #475569; font-weight: 500; }

.role-tag { border-radius: 6px; font-weight: 800; letter-spacing: 0.5px; border: none; padding: 0 10px; }

/* 对话框与上传 */
.avatar-upload-base { text-align: center; }
.avatar-uploader { 
  display: inline-block; 
  border: 2px dashed #d9d9d9; 
  border-radius: 50%; 
  cursor: pointer; 
  overflow: hidden; 
  transition: 0.3s;
}
.avatar-uploader:hover { border-color: #409eff; }
.avatar-uploader-icon { font-size: 28px; color: #8c939d; width: 120px; height: 120px; line-height: 120px; text-align: center; }
.avatar-preview-img { width: 120px; height: 120px; object-fit: cover; }
.upload-tip { margin-top: 15px; color: #94a3b8; font-size: 13px; }

.role-selector { width: 100%; display: flex; }
.role-selector :deep(.el-radio-button) { flex: 1; }
.role-selector :deep(.el-radio-button__inner) { width: 100%; }

.animate-fade-in { animation: fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.shadow-premium { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); }

@media (max-width: 768px) {
  .glass-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  .h-right.search-box {
    width: 100%;
    flex-direction: row;
  }
  .premium-search {
    flex: 1;
    width: auto;
  }
  .ml-4 {
    margin-left: 8px !important;
  }
  .title {
    font-size: 22px;
  }
  .subtitle {
    font-size: 13px;
  }
  .stat-item {
    padding: 16px;
  }
  .stat-value {
    font-size: 24px;
  }
}
</style>
