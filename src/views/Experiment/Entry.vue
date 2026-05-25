<template>
  <div class="experiment-entry-page">
    <el-card shadow="never" class="main-card">
      <template #header>
        <div class="page-title">
          <h2>实验数据录入</h2>
          <span class="subtitle">所属项目: {{ currentProjectName }} (创建人: {{ userStore.userInfo?.real_name }})</span>
        </div>
      </template>

      <!-- 核心步骤条：对调顺序，文件优先 -->
      <el-steps :active="activeStep" finish-status="success" align-center class="mb-8">
        <el-step title="步骤 1" description="核心物证录入" />
        <el-step title="步骤 2" description="测控参数配置" />
        <el-step title="步骤 3" description="检查并提交" />
      </el-steps>

      <div class="step-container">
        <!-- 第 1 步：物证上传 -->
        <div v-if="activeStep === 0" class="step-panel animate-fade flex-row-layout">
          <div class="upload-section">
            <el-upload
              class="csv-uploader"
              drag
              action=""
              :auto-upload="false"
              :show-file-list="false"
              accept=".csv"
              @change="handleCsvUpload"
            >
              <el-icon class="el-icon--upload" color="var(--el-color-primary)"><upload-filled /></el-icon>
              <div class="el-upload__text">
                将示波器文件拖到此处，或 <em>点击选取文件</em>
              </div>
            </el-upload>

            <div class="extra-uploads mt-4">
              <el-upload
                action=""
                :auto-upload="false"
                accept="image/*"
                :limit="3"
                list-type="picture"
                @change="handlePhotoUpload"
                @remove="handlePhotoRemove"
              >
                <el-button type="primary" plain size="small">上传实验现场照片 (选填)</el-button>
              </el-upload>

              <el-upload
                class="mt-2"
                action=""
                :auto-upload="false"
                accept=".pdf"
                :limit="1"
                @change="handlePdfUpload"
                @remove="handlePdfRemove"
              >
                <el-button type="success" plain size="small">上传 PDF 实验报告 (选填)</el-button>
              </el-upload>

              <!-- 新增：文字备注 -->
              <div class="mt-4">
                <el-input
                  v-model="notes"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入实验心得或现场文字备注..."
                  maxlength="1000"
                  show-word-limit
                />
              </div>
            </div>

            <transition name="el-zoom-in-top">
              <el-card v-if="parseResult" class="mt-4 summary-card" shadow="always">
                <el-descriptions :column="1" border size="small">
                  <el-descriptions-item label="Vpp(测量)">
                    <el-tag type="danger" effect="dark">{{ parseResult.measured_vpp }} V</el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="采样点">{{ parseResult.data_points }}</el-descriptions-item>
                </el-descriptions>
              </el-card>
            </transition>
          </div>

          <div class="chart-section">
            <WaveChart 
              v-loading="isParsing"
              :raw-data="parseResult?.rawData" 
              :title="parseResult ? `${parseResult.channel_name} - 波形快速预览` : '请先上传 CSV 文件...'" 
            />
          </div>
        </div>

        <!-- 第 2 步：环境与激励配置 -->
        <div v-show="activeStep === 1" class="step-panel animate-fade">
          <el-row :gutter="40">
            <el-col :span="10">
              <div class="sub-section-title">环境参数 (自动记忆)</div>
              <el-form :model="envForm" :rules="envRules" ref="envFormRef" label-width="100px" style="margin-top: 20px">
                <el-form-item label="温度(℃)" prop="temperature">
                  <el-input-number v-model="envForm.temperature" :step="0.5" style="width: 100%" />
                </el-form-item>
                <el-form-item label="湿度(%)" prop="humidity">
                  <el-input-number v-model="envForm.humidity" :step="1" style="width: 100%" />
                </el-form-item>
              </el-form>
              <div class="inherit-tip">提示：系统已自动加载该项目上一次的温湿度设定。</div>
            </el-col>
            <el-col :span="14">
              <div class="sub-section-title">激励源配置 (选填)</div>
              <div style="margin-top: 20px">
                <SignalForm ref="signalFormRef" />
              </div>
            </el-col>
          </el-row>
        </div>

        <!-- 第 3 步：确认提交 -->
        <div v-if="activeStep === 2" class="step-panel animate-fade center-review">
          <el-result
            icon="info"
            title="数据就绪"
            sub-title="请核对以下解析结果，确认无误后点击提交落盘"
          >
            <template #extra>
              <div class="review-stats">
                <p><strong>文件:</strong> {{ currentCsvFile?.name }}</p>
                <p><strong>测量 Vpp:</strong> {{ parseResult?.measured_vpp }}V</p>
                <p><strong>环境:</strong> {{ envForm.temperature }}℃ / {{ envForm.humidity }}%</p>
                <p><strong>备注条目:</strong> {{ notes ? '已录入' : '无' }}</p>
              </div>
            </template>
          </el-result>
        </div>
      </div>

      <!-- 底部控制按钮台 -->
      <div class="action-footer">
        <el-button v-if="activeStep > 0" @click="activeStep--">上一步</el-button>
        <el-button v-if="activeStep < 2" type="primary" @click="goNextStep">下一步</el-button>
        <el-button v-if="activeStep === 2" type="success" :loading="isSubmitting" @click="finalSubmit">
          确认提交
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { ElMessage } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';

import SignalForm from '../../components/SignalForm.vue';
import WaveChart from '../../components/WaveChart.vue';
import { parseOscilloscopeCSV } from '../../utils/csvParser';
import { ExperimentAPI } from '@/api';
import type { CSVParseResult } from '../../utils/csvParser';
import type { FormInstance } from 'element-plus';

const route = useRoute();
const userStore = useUserStore();

const currentProjectId = ref((route.query.projectId as string) || 'PROJ-DEFAULT-000');
const currentProjectName = ref((route.query.projectName as string) || '临时本地试验沙箱');

const activeStep = ref(0);
const isParsing = ref(false);
const isSubmitting = ref(false);

const notes = ref('');
const CACHE_KEY_PREFIX = 'exp_env_';

const loadEnvCache = () => {
  const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}${currentProjectId.value}`);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      envForm.temperature = data.temperature;
      envForm.humidity = data.humidity;
    } catch (e) { console.warn('环境缓存解析失败'); }
  }
};

const saveEnvCache = () => {
  localStorage.setItem(
    `${CACHE_KEY_PREFIX}${currentProjectId.value}`, 
    JSON.stringify({ temperature: envForm.temperature, humidity: envForm.humidity })
  );
};

// 监听项目 ID 变化重新加载
onMounted(loadEnvCache);

const envFormRef = ref<FormInstance>();
const envForm = reactive({ temperature: 25.0, humidity: 50 });
const envRules = {
  temperature: [{ required: true, message: '录入温度', trigger: 'blur' }],
  humidity: [{ required: true, message: '录入湿度', trigger: 'blur' }]
};

const signalFormRef = ref<InstanceType<typeof SignalForm>>();
const parseResult = ref<CSVParseResult | null>(null);
const currentCsvFile = ref<File | null>(null);
const sitePhotos = ref<File[]>([]);
const reportPdf = ref<File | null>(null);

const goNextStep = async () => {
  if (activeStep.value === 0) {
    if (!parseResult.value) {
      ElMessage.info('未检测到波形数据，记录将作为纯文字/图片档案保存。');
    }
    activeStep.value++;
  } else if (activeStep.value === 1) {
    if (!envFormRef.value) return;
    try {
      await envFormRef.value.validate();
      activeStep.value++;
    } catch {
      ElMessage.warning('请补全环境参数（温度/湿度）。');
    }
  }
};

const handleCsvUpload = async (uploadFile: any) => {
  const rawFile = uploadFile.raw as File;
  if (!rawFile) return;
  if (!rawFile.name.toLowerCase().endsWith('.csv')) {
    ElMessage.error('仅限上传采用标准 .csv 格式的文件！');
    return;
  }

  currentCsvFile.value = rawFile;
  isParsing.value = true;
  parseResult.value = null;

  try {
    const result = await parseOscilloscopeCSV(rawFile);
    parseResult.value = result;
    ElMessage.success(`读取完成。共识别有效记录 ${result.data_points} 条。`);
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    isParsing.value = false;
  }
};

const handlePhotoUpload = (uploadFile: any) => {
  if (uploadFile.raw) {
    // 防止重复UID导致的异常上传
    if (!sitePhotos.value.find(f => (f as any).uid === uploadFile.raw.uid)) {
        sitePhotos.value.push(uploadFile.raw);
    }
  }
};
const handlePhotoRemove = (uploadFile: any) => {
  sitePhotos.value = sitePhotos.value.filter(file => (file as any).uid !== uploadFile.raw.uid);
};

const handlePdfUpload = (uploadFile: any) => {
  if (uploadFile.raw) {
    reportPdf.value = uploadFile.raw;
  }
};
const handlePdfRemove = () => {
  reportPdf.value = null;
};
const finalSubmit = async () => {
  if (!parseResult.value && !notes.value && sitePhotos.value.length === 0) {
    ElMessage.error('请至少录入一项波形、备注或现场照片，不可提交全空记录。');
    return;
  }

  const signalData = await signalFormRef.value?.validateAndGetForm();
  if (signalData === false) {
      ElMessage.error('信号源参数格式错误（若不填写请清空所有信号源字段）。');
      return;
  }

  isSubmitting.value = true;

  try {
    const formData = new FormData();
    
    if (currentCsvFile.value) {
      formData.append('oscilloscope_file', currentCsvFile.value);
    }
    
    formData.append('env_temperature', String(envForm.temperature));
    formData.append('env_humidity', String(envForm.humidity));
    
    formData.append('signal_config', signalData ? JSON.stringify(signalData) : '');
    formData.append('notes', notes.value);
    
    formData.append('measured_vpp', parseResult.value ? String(parseResult.value.measured_vpp) : '0.0');
    formData.append('channel_name', parseResult.value ? parseResult.value.channel_name : '');
    formData.append('data_points', parseResult.value ? String(parseResult.value.data_points) : '0');

    formData.append('operator_id', userStore.userInfo?.id || '');
    formData.append('project_id', currentProjectId.value);

    sitePhotos.value.forEach(photo => {
      formData.append('site_photos', photo);
    });
    if (reportPdf.value) {
      formData.append('report_pdf', reportPdf.value);
    }

    await ExperimentAPI.uploadRecord(formData);
    
    ElMessage({
      message: `操作记录已落盘。`,
      type: 'success',
      duration: 3000
    });
    
    // 提交成功后持久化环境参数
    saveEnvCache();
    
    // 成功后重置
    activeStep.value = 0;
    parseResult.value = null;
    notes.value = '';
    
  } catch (e) {
    ElMessage.error('传输出错或通讯受阻，请稍后刷新重试。');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.experiment-entry-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}
.page-title h2 { margin: 0; padding-bottom: 5px; color: var(--el-text-color-primary); }
.subtitle { color: var(--el-text-color-secondary); font-size: 13px; }
.mb-8 { margin-bottom: 32px; }
.mt-4 { margin-top: 16px; }
.text-center { text-align: center; }
.text-success { color: var(--el-color-success); }
.font-bold { font-weight: bold; }
.mr-2 { margin-right: 8px; }
.flex { display: flex; }
.items-center { align-items: center; }

.step-container {
  min-height: 500px;
  background: var(--el-bg-color-page);
  padding: 30px;
  border-radius: 8px;
  margin-bottom: 30px;
}
.central-form { max-width: 400px; margin: 40px auto; }
.flex-row-layout { display: flex; gap: 30px; align-items: flex-start; }
.upload-section { flex: 0 0 350px; }
.chart-section { flex: 1; min-width: 0; }

.summary-card {
  /* 渐变修饰 */
  background: linear-gradient(145deg, #ffffff, #f0f4f8);
  border: none;
}

.action-footer {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}
.sub-section-title { font-weight: bold; font-size: 16px; color: #303133; margin-bottom: 10px; }
.inherit-tip { font-size: 12px; color: #909399; margin-top: 10px; font-style: italic; }
.center-review { text-align: center; max-width: 600px; margin: 0 auto; }
.review-stats { text-align: left; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
.review-stats p { margin: 8px 0; }
.animate-fade { animation: fadeIn 0.4s ease forwards; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 极限压缩移动端视图断点 */
@media (max-width: 768px) {
  .flex-row-layout {
    flex-direction: column;
    gap: 15px;
  }
  .upload-section {
    flex: none;
    width: 100%;
  }
  .central-form {
    margin: 20px 0;
    width: 100%;
  }
  .step-container {
    padding: 15px;
    margin-bottom: 15px;
    min-height: auto;
  }
  .experiment-entry-page {
    padding: 10px;
  }
  .extra-uploads .el-button {
    width: 100%;
    margin-left: 0 !important;
  }
  .mt-2 {
    margin-top: 8px !important;
  }
  :deep(.el-step__description) {
    display: none !important;
  }
  :deep(.el-step__title) {
    font-size: 12px !important;
  }
}
</style>
