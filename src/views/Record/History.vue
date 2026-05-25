<template>
  <el-card shadow="never">
    <template #header>
      <div class="header-container">
        <span style="font-weight: bold; font-size: 16px;">历史记录台账</span>
        <el-select 
          v-model="currentProjectId" 
          placeholder="请选择需要查看的实验项目" 
          size="small" 
          style="width: 300px"
          @change="loadRecords"
        >
          <el-option 
            v-for="proj in availableProjects" 
            :key="proj.project_id" 
            :label="proj.project_name" 
            :value="proj.project_id" 
          />
        </el-select>
      </div>
      <div class="search-bar animate-fade" v-if="currentProjectId">
        <el-form :inline="true" :model="searchForm" size="default" class="search-form-flex">
          <div class="form-left-group">
            <el-form-item label="时间跨度">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="-"
                start-placeholder="开始"
                end-placeholder="结束"
                style="width: 240px"
              />
            </el-form-item>
          </div>
          <div class="form-actions">
            <el-button type="primary" @click="triggerSearch" :icon="Search">执行检索</el-button>
            <el-button @click="searchFormRef">重置</el-button>
          </div>
        </el-form>
      </div>
    </template>

    <el-table :data="realRecords" style="width: 100%" v-loading="loading">
      <el-table-column prop="created_at" label="采样日期" width="180">
        <template #default="{ row }">
          <div class="time-cell">
            <el-icon class="mr-1"><Calendar /></el-icon>
            {{ row.created_at }}
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="记录类型" width="140">
        <template #default="{ row }">
          <el-tag v-if="row.file_path" type="success" effect="plain" size="small">
            <el-icon><DataLine /></el-icon> 波形数据
          </el-tag>
          <el-tag v-else type="info" effect="plain" size="small">
            <el-icon><Document /></el-icon> 纯图文录入
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="measured_vpp" label="特征 Vpp" width="140">
        <template #default="{ row }">
          <el-tooltip :content="row.file_path ? '基于波形提取' : '无波形源'" placement="top">
            <el-tag :type="row.measured_vpp > 0 ? 'warning' : 'info'" effect="dark">
              {{ row.measured_vpp > 0 ? row.measured_vpp + ' V' : '--' }}
            </el-tag>
          </el-tooltip>
        </template>
      </el-table-column>

      <el-table-column prop="notes" label="内容摘要 / 备注" min-width="200">
        <template #default="{ row }">
          <div class="notes-preview" v-if="row.notes">
            {{ row.notes.length > 30 ? row.notes.slice(0, 30) + '...' : row.notes }}
          </div>
          <el-text v-else type="info" size="small">暂无备注</el-text>
        </template>
      </el-table-column>

      <el-table-column prop="operator_id" label="操作员/UID" width="150" />

      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button-group>
            <el-button 
              :type="row.file_path ? 'success' : 'primary'" 
              size="small" 
              plain 
              @click="openPlayback(row)"
            >
              {{ row.file_path ? '波形回放' : '详情查看' }}
            </el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleDownload(cmd, row)">
              <el-button type="primary" size="small" :icon="ArrowDown" plain>
                资源下载
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="csv" :disabled="!row.file_path">原始波形 CSV</el-dropdown-item>
                  <el-dropdown-item command="pdf" :disabled="!row.report_pdf_path">实验报告 PDF</el-dropdown-item>
                  <el-dropdown-item command="photo" :disabled="!row.photos_count || row.photos_count === 0">现场照片集</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 记录详情/波形回放 Dialog -->
    <el-dialog v-model="dialogVisible" :title="activeRow?.file_path ? '记录回放 - 波形详勘' : '实验详情 - 图文存证'" width="80%" destroy-on-close>
      <div v-loading="loadingPlayback" element-loading-text="正在提取档案资源...">
        
        <!-- 核心备注展示区 -->
        <div class="detail-info-grid mb-4" v-if="activeRow">
          <div class="info-item">
            <span class="label">实验备注:</span>
            <span class="content">{{ activeRow.notes || '暂无文字记录' }}</span>
          </div>
        </div>

        <!-- 情况 A: 有波形，展示图表 -->
        <DualWaveChart 
          v-if="activeRecord && chartPlaybackData"
          :time-axis="chartPlaybackData.timeAxis" 
          :raw-data="chartPlaybackData.rawData" 
          :cleaned-data="chartPlaybackData.cleanedData"
          height="450px"
        />

        <!-- 情况 B: 纯图文，展示照片墙 -->
        <div v-else-if="!loadingPlayback" class="photo-viewer">
          <div v-if="activeRow && activeRow.photos_count > 0" class="image-gallery">
            <div class="gallery-title">
              <el-icon><Picture /></el-icon> 现场取证照片 ({{ activeRow.photos_count }}张)
            </div>
            <div class="image-grid">
              <el-image 
                v-for="(path, index) in activeRow.site_photos_paths" 
                :key="index"
                :src="formatStorageUrl(path)" 
                :preview-src-list="currentPreviewList"
                :initial-index="index"
                preview-teleported
                fit="cover"
                class="gallery-item shadow-premium"
              >
                <template #placeholder>
                  <div class="image-loading">准备预览...</div>
                </template>
              </el-image>
            </div>
          </div>
          <div v-else style="height: 200px; display: flex; align-items: center; justify-content: center">
            <el-empty description="该记录暂无关联波形及照片资产" />
          </div>
        </div>
      </div>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage } from 'element-plus';
import { ProjectAPI, ExperimentAPI } from '@/api';
import DualWaveChart from '@/components/DualWaveChart.vue';
import { ArrowDown, Search, Calendar, DataLine, Document, Picture } from '@element-plus/icons-vue';

const route = useRoute();
const loading = ref(false);
const currentProjectId = ref((route.query.projectId as string) || '');
const realRecords = ref<any[]>([]);
const availableProjects = ref<any[]>([]);

const searchForm = reactive({
  dateRange: null as [Date, Date] | null
});

const searchFormRef = () => {
  searchForm.dateRange = null;
  triggerSearch();
};

const triggerSearch = async () => {
  if (!currentProjectId.value) return;
  loading.value = true;
  try {
    const payload: any = { project_id: currentProjectId.value };
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      payload.date_start = searchForm.dateRange[0].toISOString();
      payload.date_end = searchForm.dateRange[1].toISOString();
    }
    
    // 调用真正的后端聚合检索引擎
    const res: any = await ExperimentAPI.searchRecords(payload);
    realRecords.value = res.data || res;
  } catch (e) {
    ElMessage.error('高级复合记录检索失败。');
    realRecords.value = [];
  } finally {
    loading.value = false;
  }
};

const loadRecords = async () => {
  if (!currentProjectId.value) return; 
  triggerSearch(); // 默认切进来或者不带条件时直接用复合搜引擎作为兜底拉取全量
};

const fetchProjectDict = async () => {
  // 如果下拉框需要数据，我们就去后台请求列表（重用这口子接口保障复用性）
  try {
    const res: any = await ProjectAPI.getMyProjects();
    availableProjects.value = res.data || res;
    // 如果 URL 没带且下来拉取有项目数据，则自发定位到第一个并调取波形
    if (!currentProjectId.value && availableProjects.value.length > 0) {
      currentProjectId.value = availableProjects.value[0].project_id;
      loadRecords();
    } else if (currentProjectId.value) {
      loadRecords();
    }
  } catch (e) {
    ElMessage.warning('未能获取项目列表');
  }
};

onMounted(() => {
  fetchProjectDict();
});

// 假如用户在当前组件内切换路由 query，重新获取
watch(() => route.query.projectId, (newId) => {
  if (newId !== currentProjectId.value) {
    currentProjectId.value = newId as string;
    loadRecords();
  }
});

const formatStorageUrl = (path: string) => {
  if (!path) return '';
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const cleanPath = path.replace(/\\/g, '/');
  return `${base}/api/${cleanPath}`;
};

// 稳定预览列表，防止闪烁
const currentPreviewList = computed(() => {
  if (!activeRow.value?.site_photos_paths) return [];
  return activeRow.value.site_photos_paths.map((p: string) => formatStorageUrl(p));
});

// 动态解析后端返回的波形数据通道键值，防止因列名为 Voltage 等其他名称时找不到 CH1_raw 崩溃
const chartPlaybackData = computed(() => {
  if (!activeRecord.value?.chart_data) return null;
  const cd = activeRecord.value.chart_data;
  
  // 寻获第一个以 _raw 结尾的原始通道数据键
  const rawKey = Object.keys(cd).find(key => key.endsWith('_raw'));
  if (!rawKey) return null;
  
  const channelPrefix = rawKey.slice(0, -4); // 剔除 '_raw' 获取如 'CH1' 或 'Voltage' 的通道前缀
  
  return {
    timeAxis: cd.time_axis || [],
    rawData: cd[rawKey] || [],
    cleanedData: cd[`${channelPrefix}_cleaned`] || []
  };
});

const dialogVisible = ref(false);
const loadingPlayback = ref(false);
const activeRecord = ref<any>(null);
const activeRow = ref<any>(null);

const openPlayback = async (row: any) => {
  activeRow.value = row;
  dialogVisible.value = true;
  
  // 只有存在物理文件时才请求波形
  if (row.file_path) {
    loadingPlayback.value = true;
    activeRecord.value = null;
    try {
      const res: any = await ExperimentAPI.getRecordDetail(row.record_id);
      activeRecord.value = res.data || res;
    } catch(e) {
      ElMessage.error('波形源文件点播失败，请检查 OSS 存储状态！');
    } finally {
      loadingPlayback.value = false;
    }
  } else {
    activeRecord.value = null;
  }
};

const handleDownload = async (type: string, row: any) => {
  const fileIdForBackend = row.record_id || row.id;
  if (!fileIdForBackend) {
    ElMessage.error('异常资源标识无法拉取！');
    return;
  }

  // 根据 type 告知后台意图 (假设后端可接收查询 params ?type=xx 来支持异源，如果没有就全量给)
  try {
    const res: any = await ExperimentAPI.downloadFileAsBlob(`${fileIdForBackend}?type=${type}`);
    if (!res) throw new Error('流为空');

    // Blob 落盘
    const blob = new Blob([res]);
    const url = window.URL.createObjectURL(blob);
    const tmpLink = document.createElement('a');
    tmpLink.href = url;
    
    const extMap: any = { csv: 'csv', pdf: 'pdf', photo: 'zip' };
    const ext = extMap[type] || 'bin';
    tmpLink.download = `experiment_data_${type}_${fileIdForBackend}.${ext}`; 
    document.body.appendChild(tmpLink);
    tmpLink.click();
    tmpLink.remove();
    window.URL.revokeObjectURL(url);
    
    ElMessage.success('特权资源拉取并下载成功。');
  } catch (e) {
    ElMessage.error('权限受阻或服务端资源游标不存在。');
  }
};
</script>

<style scoped>
.header-container { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.time-cell { display: flex; align-items: center; color: #64748b; font-size: 13px; }
.notes-preview { font-size: 13px; color: #334155; }
.mr-1 { margin-right: 4px; }

.detail-info-grid {
  background: #f1f5f9;
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid #3b82f6;
}
.info-item { display: flex; gap: 10px; align-items: flex-start; }
.info-item .label { font-weight: 800; color: #475569; white-space: nowrap; }
.info-item .content { color: #1e293b; line-height: 1.6; font-size: 14px; }

.photo-viewer { padding: 30px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; }
.image-gallery { width: 100%; }
.gallery-title { font-weight: 700; color: #475569; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; font-size: 16px; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
.gallery-item { 
  width: 100%; 
  aspect-ratio: 4 / 3; 
  border-radius: 12px; 
  cursor: zoom-in; 
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease;
  border: 3px solid white;
}
.gallery-item:hover { transform: scale(1.05); z-index: 10; cursor: pointer; }
.image-loading { 
  background: #f1f5f9; 
  width: 100%; 
  height: 100%; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #94a3b8;
  font-size: 13px;
}

.search-bar {
  margin-top: 16px;
  background: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}
.search-form-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
}
.form-left-group { display: flex; flex-wrap: wrap; gap: 16px; }

.animate-fade {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .search-form-flex { flex-direction: column; }
  .form-left-group { flex-direction: column; width: 100%; }
  .form-left-group :deep(.el-form-item) { margin-right: 0; width: 100%; }
  .form-actions { width: 100%; display: flex; }
  .form-actions .el-button { flex: 1; }
}
</style>
