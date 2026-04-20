<template>
  <el-card class="dsp-debug-container" shadow="hover">
    <template #header>
      <div class="header-title">
        <el-icon><Cpu /></el-icon>
        <span style="margin-left: 8px">在线 DSP 滤波联调控制台</span>
      </div>
    </template>

    <div class="flex-layout">
      <!-- 左侧：联调表单区 -->
      <div class="form-section">
        <el-form label-position="top">
          <el-form-item label="模拟 measured_vpp 传参">
            <el-input-number v-model="mockVpp" :step="0.1" :min="0" style="width: 100%" />
          </el-form-item>
          
          <el-form-item label="模拟 config_json 传参">
            <el-input
              v-model="mockConfigJSON"
              type="textarea"
              :rows="4"
              placeholder='例如: {"freq": "1kHz"}'
            />
          </el-form-item>

          <el-form-item label="选择 CSV 源文件上传处理">
            <el-upload
              class="csv-uploader"
              drag
              action=""
              :auto-upload="false"
              :show-file-list="true"
              :limit="1"
              accept=".csv"
              @change="handleFileChange"
              @remove="handleFileRemove"
            >
              <el-icon class="el-icon--upload"><upload-filled /></el-icon>
              <div class="el-upload__text">拖拽 CSV 或者 <em>点击选取</em></div>
            </el-upload>
          </el-form-item>
          
          <el-button 
            type="primary" 
            style="width: 100%; margin-top: 10px;" 
            :loading="isUploading" 
            :disabled="!selectedFile"
            @click="triggerOnlineDSP"
          >
            <el-icon><Upload /></el-icon> 发送至 FastAPI 进行云端滤波
          </el-button>
        </el-form>
      </div>

      <!-- 右侧：双曲线对比图展示区 -->
      <div class="chart-section" v-loading="isUploading" element-loading-text="后端发力滤波中...">
        <div ref="chartRef" class="echarts-dom"></div>
        <el-empty v-if="!hasData" description="等待后端响应数据..." />
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Cpu, UploadFilled, Upload } from '@element-plus/icons-vue';
import axios from 'axios';
import * as echarts from 'echarts';
import { envelopeDownsample } from '@/utils/downsample';

// --- 表单与文件状态 ---
const mockVpp = ref(3.14);
const mockConfigJSON = ref(JSON.stringify({ freq: "1kHz", wave_type: "Sine" }, null, 2));
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);

const handleFileChange = (file: any) => {
  selectedFile.value = file.raw;
};

const handleFileRemove = () => {
  selectedFile.value = null;
  hasData.value = false;
  chartInstance.value?.clear();
};

// --- ECharts 状态与逻辑 ---
const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts>();
let resizeObserver: ResizeObserver | null = null;
const hasData = ref(false);

const initChart = () => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value);
    
    // 自适应大小
    resizeObserver = new ResizeObserver(() => {
      chartInstance.value?.resize();
    });
    resizeObserver.observe(chartRef.value);
  }
};

const renderDualLineChart = (timeAxis: number[], rawData: number[], cleanedData: number[]) => {
  if (!chartInstance.value) return;
  hasData.value = true;

  // 将分离的数组转换为 ECharts value 轴所需的 [x, y] 矩阵格式，并通过包络抽稀防止上万点卡死首屏
  const rawPoints = timeAxis.map((t, i) => [t, rawData[i]]);
  const cleanedPoints = timeAxis.map((t, i) => [t, cleanedData[i]]);
  
  const seriesRaw = envelopeDownsample(rawPoints);
  const seriesCleaned = envelopeDownsample(cleanedPoints);

  const option: any = {
    title: { text: 'DSP 效果实时对照 (实时频域对冲滤波)', left: 'center', top: 5 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['原始波形 (带毛刺)', 'Butterworth 滤波波形'],
      bottom: 0
    },
    grid: { left: '5%', right: '5%', bottom: '15%', containLabel: true },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, bottom: 30 }
    ],
    xAxis: {
      type: 'value',
      name: 'Time (s)',
      nameLocation: 'middle',
      nameGap: 25,
      scale: true,
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      name: 'Voltage (V)',
      scale: true
    },
    series: [
      {
        name: '原始波形 (带毛刺)',
        type: 'line',
        data: seriesRaw,
        showSymbol: false,
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: '#aaaaaa' },
        lineStyle: { width: 1, opacity: 0.6 } // 灰色底层半透明显示原始数据
      },
      {
        name: 'Butterworth 滤波波形',
        type: 'line',
        data: seriesCleaned,
        showSymbol: false,
        large: true,
        largeThreshold: 2000,
        itemStyle: { color: '#ef4444' }, // 亮红色高亮滤波结果
        lineStyle: { width: 2, opacity: 1 }
      }
    ]
  };

  chartInstance.value.setOption(option, true);
};

// --- 发送后端请求逻辑 ---
// 此处我们按指令严格拼装 API
const triggerOnlineDSP = async () => {
  if (!selectedFile.value) return;
  
  // 校验 JSON 格式
  try {
    JSON.parse(mockConfigJSON.value);
  } catch (e) {
    ElMessage.error('JSON 格式不合法，请检查标点或内容');
    return;
  }

  isUploading.value = true;
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  formData.append('measured_vpp', String(mockVpp.value));
  formData.append('config_json', mockConfigJSON.value);

  try {
    // 真实发包：指向 FastAPI 开发后端的 /api/experiment/upload
    const res = await axios.post('/api/experiment/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // 兼容后端可能没包额外的 data 层，直接返回 { chart_data: ... }，甚至直接就是 chart_data 本身的情况
    const actualData = res.data || {};
    const chartData = actualData.chart_data || actualData.data?.chart_data || actualData;

    if (chartData && chartData.time_axis && chartData.CH1_raw && chartData.CH1_cleaned) {
      ElMessage.success('后端处理完毕！双曲线成功分离。');
      renderDualLineChart(chartData.time_axis, chartData.CH1_raw, chartData.CH1_cleaned);
    } else {
      console.error("【前台探针】后端实际返回的完整 Payload:", JSON.stringify(actualData, null, 2));
      alert(`为了快速排错，请把弹出框里的下面这段内容发给 AI 助手：\n\n${JSON.stringify(actualData).substring(0, 500)}...`);
      ElMessage.error({
        message: `匹配异常！实际收到的外层数据键名为: [ ${Object.keys(actualData).join(', ')} ]。`,
        duration: 8000
      });
    }
  } catch (err: any) {
    console.error(err);
    ElMessage.error(`请求后端 API 失败: ${err.message || '未知错误'}`);
  } finally {
    isUploading.value = false;
  }
};

onMounted(() => {
  initChart();
});

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  chartInstance.value?.dispose();
});
</script>

<style scoped>
.dsp-debug-container {
  margin: 20px auto;
  max-width: 1400px;
}
.header-title {
  font-weight: bold;
  font-size: 16px;
  display: flex;
  align-items: center;
}
.flex-layout {
  display: flex;
  gap: 30px;
  min-height: 500px;
}
.form-section {
  flex: 0 0 350px;
  padding-right: 20px;
  border-right: 1px solid var(--el-border-color-light);
}
.chart-section {
  flex: 1;
  position: relative;
  min-width: 0;
}
.echarts-dom {
  width: 100%;
  height: 500px;
}

/* 移动端/小屏 响应式适配 */
@media (max-width: 768px) {
  .flex-layout {
    flex-direction: column;
    gap: 20px;
  }
  .form-section {
    flex: none;
    width: 100%;
    padding-right: 0;
    border-right: none;
    border-bottom: 1px solid var(--el-border-color-light);
    padding-bottom: 20px;
  }
  .echarts-dom {
    height: 350px;
  }
}
</style>
