<template>
  <el-card class="project-list-page" shadow="never">
    <template #header>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold; font-size: 16px;">实验项目列表</span>
        <div style="display: flex; gap: 12px;" v-if="userStore.userInfo?.role === 'admin' || userStore.userInfo?.role === 'teacher'">
          <el-button 
            type="success" 
            :icon="Plus" 
            @click="createGroupVisible = true"
          >
            新建课题组
          </el-button>
          <el-button 
            type="primary" 
            :icon="Plus" 
            @click="createDialogVisible = true"
          >
            创建新项目
          </el-button>
        </div>
      </div>
    </template>

    <el-table :data="realProjectList" style="width: 100%" border stripe v-loading="loading">
      <el-table-column prop="project_name" label="项目名称" min-width="250" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag :type="row.status === 'completed' ? 'info' : 'primary'">
            {{ row.status === 'completed' ? '已归档' : '进行中' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operator_ids" label="参与成员" width="140">
        <template #default="{ row }">
          <el-avatar-group>
            <!-- 占位示意图 -->
            <el-avatar size="small" v-for="i in (row.operator_ids || ['模拟占位']).slice(0,3)" :key="i" src="https://cube.elemecdn.com/e/fd/0fc7d20532fdaf769a25683617711png.png" />
          </el-avatar-group>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" align="center">
        <template #default="{ row }">
          <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
            <el-button 
              type="primary" 
              size="small" 
              :disabled="row.status === 'completed'"
              @click="jumpToEntry(row.project_id, row.project_name)"
            >
              录入实验数据
            </el-button>
            
            <el-button 
              type="info" 
              size="small" 
              plain
              @click="jumpToRecords(row.project_id)"
            >
              查看历史记录
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <!-- 发起新科研课题的表单抽屉弹窗 -->
    <el-dialog v-model="createDialogVisible" title="创建新项目" width="500px">
      <el-form :model="createForm" label-width="120px">
        <el-form-item label="项目名称" required>
          <el-input v-model="createForm.project_name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目描述">
          <el-input type="textarea" v-model="createForm.description" placeholder="请输入实验的相关描述" />
        </el-form-item>
        <el-form-item label="关联分组" required>
          <el-select v-model="createForm.group_id" placeholder="请选择关联课题组" style="width: 100%;">
            <el-option
              v-for="g in myGroups"
              :key="g.group_id || g.id"
              :label="g.name"
              :value="String(g.group_id || g.id)"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="creating" @click="submitNewProject">确认部署</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新建课题组对话框 -->
    <el-dialog v-model="createGroupVisible" title="创建新课题组/实验室" width="480px">
      <el-form :model="createGroupForm" label-position="top">
        <el-form-item label="课题组名称" required>
          <el-input v-model="createGroupForm.name" placeholder="请输入课题组或项目组名称" />
        </el-form-item>
        <el-form-item label="隶属学科节点 ID" required>
          <el-input-number v-model="createGroupForm.subject_id" :min="1" style="width: 100%;" />
        </el-form-item>
        <el-form-item label="公开性策略">
          <el-radio-group v-model="createGroupForm.group_type" style="display: flex; flex-direction: column; gap: 8px;">
            <el-radio value="public">公共学术组 (支持学子自主申请)</el-radio>
            <el-radio value="private" disabled>私有实验区 (由系统自动关联)</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createGroupVisible = false">取消</el-button>
        <el-button type="primary" :loading="creatingGroup" @click="submitNewGroup">确认部署</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/store/user';
import { ProjectAPI, GroupAPI } from '@/api';
import { Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const router = useRouter();
const userStore = useUserStore();

const realProjectList = ref<any[]>([]);
const loading = ref(false);

// ---- 创建项目表单的变量代理 ----
const createDialogVisible = ref(false);
const creating = ref(false);
const myGroups = ref<any[]>([]);
const createForm = ref({
  project_name: '',
  description: '',
  group_id: ''
});

// ---- 新建课题组表单的变量代理 ----
const createGroupVisible = ref(false);
const creatingGroup = ref(false);
const createGroupForm = ref({
  name: '',
  subject_id: 1,
  group_type: 'public'
});

const submitNewGroup = async () => {
  if (!createGroupForm.value.name) {
    ElMessage.warning('请输入课题组名称');
    return;
  }
  creatingGroup.value = true;
  try {
    await GroupAPI.createGroup(createGroupForm.value);
    ElMessage.success('全新课题组已成功立项并部署');
    createGroupVisible.value = false;
    createGroupForm.value = { name: '', subject_id: 1, group_type: 'public' };
    loadGroups(); // 重新加载下拉框
  } catch (err: any) {
    ElMessage.error('课题组创建失败');
  } finally {
    creatingGroup.value = false;
  }
};

const loadGroups = async () => {
  if (userStore.userInfo?.role === 'admin' || userStore.userInfo?.role === 'teacher') {
    try {
      const res: any = await GroupAPI.getGroups();
      myGroups.value = (res.data || res).filter((g: any) => g.group_type !== 'private');
      if (myGroups.value.length > 0) {
        createForm.value.group_id = String(myGroups.value[0].group_id || myGroups.value[0].id);
      }
    } catch (e) {
      console.error('无法拉取课题组列表');
    }
  }
};

const loadProjects = async () => {
  loading.value = true;
  try {
    const res: any = await ProjectAPI.getMyProjects();
    // 兼容后端可能是平铺的也可能包在 data 层里
    realProjectList.value = res.data || res;
  } catch (e) {
    ElMessage.error('无法获取项目列表，请检查网络连接或权限状态。');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  loadProjects();
  loadGroups();
});

const jumpToEntry = (projectId: string, projectName: string) => {
  // 传参跳转（后续将改造 Entry.vue 取出该值）
  router.push({
    path: '/experiment/entry',
    query: { projectId, projectName }
  });
};

const jumpToRecords = (projectId: string) => {
  router.push({
    path: '/records',
    query: { projectId }
  });
};

const submitNewProject = async () => {
  if (!createForm.value.project_name) {
    ElMessage.warning('项目名称不能为空！');
    return;
  }
  
  creating.value = true;
  try {
    await ProjectAPI.createProject(createForm.value);
    ElMessage.success('项目创建成功。');
    createDialogVisible.value = false; // 退出弹窗
    createForm.value = { project_name: '', description: '', group_id: '' }; //清空缓存
    
    // 自发重新进行渲染检索
    loadProjects();
  } catch (e: any) {
    ElMessage.error(`项目创建投递失败: ${e.response?.data?.detail || '参数不符合校验约束'}`);
  } finally {
    creating.value = false;
  }
};
</script>
