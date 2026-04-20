<template>
  <div class="wave-chart-container">
    <!-- ECharts 挂载节点 -->
    <div ref="chartRef" class="echarts-dom"></div>
    
    <!-- 核心亮点：悬浮测量数据面板 (Glassmorphism) -->
    <div v-if="metrics" class="measurement-overlay animate-slide-in">
      <div class="metrics-grid">
        <div class="metric-item">
          <span class="m-label">Vpp (极差)</span>
          <span class="m-valueHighlight">{{ metrics.vpp }} V</span>
        </div>
        <div class="metric-item">
          <span class="m-label">Vavg (均值)</span>
          <span class="m-value">{{ metrics.avg }} V</span>
        </div>
        <div class="metric-item">
          <span class="m-label">Freq (频率)</span>
          <span class="m-value">{{ metrics.freq > 0 ? metrics.freq + ' Hz' : '--' }}</span>
        </div>
        <div class="metric-item split-top">
          <span class="m-label">Max / Min</span>
          <span class="m-sub">{{ metrics.max }} / {{ metrics.min }} V</span>
        </div>
      </div>
    </div>

    <div v-if="!rawData || rawData.length === 0" class="empty-overlay">
      <el-empty description="暂无波形数据" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { envelopeDownsample } from '@/utils/downsample';

const props = defineProps<{
  /** 图表标题可外部定制，如 "CH1 电压/时间 波形图" */
  title?: string;
  /** 外界传入的通过 csvParser 解析好的海量二维数据组 */
  rawData?: [number, number][];
}>();

const chartRef = ref<HTMLElement>();
// 使用 shallowRef 优化底层性能，不让 Vue 去深度劫持庞大的复杂 ECharts 实例对象
const chartInstance = shallowRef<echarts.ECharts>();

const initChart = () => {
  if (!chartRef.value) return;
  // 初始化，若外部主题为暗色可以在这配置 'dark'
  chartInstance.value = echarts.init(chartRef.value);
};

const renderChart = () => {
  if (!chartInstance.value) return;

  // 核心！利用抽稀算法对外界传入的海量点阵（可能几百万）实行截断保护，极限渲染不超过 4000 个能代表形状波峰的点
  const rawPoints = (props.rawData as any) || [];
  const data = envelopeDownsample(rawPoints);

  // 同步计算实时统计指标
  calcMetrics(rawPoints);

  const option: any = {
    title: {
      text: props.title || '示波器波形视图',
      left: 'center',
      textStyle: {
        color: '#333',
        fontWeight: 'normal',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'axis',
      // 十字准星指示器对于信号对齐有很大帮助
      axisPointer: { type: 'cross' } 
    },
    grid: {
      left: '5%',
      right: '8%',
      bottom: '15%', // 留空间给下方的 slider
      containLabel: true
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' }, // 允许框选放大细节
        restore: {},                      // 还原
        saveAsImage: {}                   // 保存图片记录
      }
    },
    // 支持高级缩放游览
    dataZoom: [
      {
        type: 'inside', // 支持鼠标滚轮无级横向缩放 (核心痛点解决)
        xAxisIndex: [0],
        start: 0,
        end: 100
      },
      {
        type: 'slider', // 下方提供拖拽滑块方便全局概览定位
        xAxisIndex: [0],
        bottom: 10
      }
    ],
    xAxis: {
      type: 'value',
      name: 'Time (s)', // 时间轴
      nameLocation: 'middle',
      nameGap: 30,
      scale: true,      // 脱离0值比例，动态扩展
      // 优化渲染线性能
      splitLine: { show: false } 
    },
    yAxis: {
      type: 'value',
      name: 'Voltage (V)', // 电压轴
      scale: true,         // 根据极值自由适应
      splitLine: {
        lineStyle: { type: 'dashed', color: '#eee' }
      }
    },
    series: [
      {
        name: '电压值',
        type: 'line',
        data: data,
        // ====== 论文硬核防卡顿优化 ======
        showSymbol: false, // 数据过多时隐藏小圆点，避免密恐并极大增强性能
        large: true,       // 开启大规模点云渲染优化
        largeThreshold: 3000, // 超出 3000 点自动进入降采样视觉优化策略
        itemStyle: { color: '#409EFF' },
        lineStyle: { width: 1.5, opacity: 0.8 },
        // 增加极大极小值自动标注
        markPoint: {
          symbol: 'pin',
          symbolSize: 40,
          label: { fontSize: 10, offset: [0, 0] },
          data: [
            { type: 'max', name: '最大值' },
            { type: 'min', name: '最小值' }
          ]
        }
      }
    ]
  };

  chartInstance.value.setOption(option, true);
};

// 测量数据状态
const metrics = ref<{ vpp: number, avg: number, freq: number, max: number, min: number } | null>(null);

const calcMetrics = (rawData: [number, number][]) => {
  if (!rawData || rawData.length === 0) {
    metrics.value = null;
    return;
  }

  let max = -Infinity, min = Infinity, sum = 0;
  for (const [_, v] of rawData) {
    if (v > max) max = v;
    if (v < min) min = v;
    sum += v;
  }

  const avg = sum / rawData.length;
  
  // 简易频率计算 (Zero-crossing)
  let freq = 0;
  let crossings: number[] = [];
  for (let i = 1; i < rawData.length; i++) {
    if (rawData[i-1][1] <= avg && rawData[i][1] > avg) {
      crossings.push(rawData[i][0]);
    }
  }
  if (crossings.length > 1) {
    freq = (crossings.length - 1) / (crossings[crossings.length-1] - crossings[0]);
  }

  metrics.value = {
    vpp: Number((max - min).toFixed(3)),
    avg: Number(avg.toFixed(3)),
    max: Number(max.toFixed(3)),
    min: Number(min.toFixed(3)),
    freq: Number(freq.toFixed(1))
  };
};

// 监听数据源更新
watch(
  () => props.rawData,
  () => {
    renderChart();
  },
  { deep: false } // 因为只要数组引用变了才更新，不用 deep 否则海量数据时引发栈灾难
);

// 为保证图表缩放时的自适应
let resizeObserver: ResizeObserver | null = null;
const handleResize = () => {
  chartInstance.value?.resize();
};

onMounted(() => {
  initChart();
  if (props.rawData && props.rawData.length > 0) {
    renderChart();
  }
  window.addEventListener('resize', handleResize);

  // 核心修复点：使用 ResizeObserver，完美解决由外部 v-show、flex 变化引起的 chart 画布宽高获取失败
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartInstance.value?.resize();
    });
    resizeObserver.observe(chartRef.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  resizeObserver?.disconnect();
  chartInstance.value?.dispose();
});
</script>

<style scoped>
.wave-chart-container {
  position: relative;
  width: 100%;
  height: 500px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #EBEEF5;
}

.echarts-dom {
  width: 100%;
  height: 100%;
}

/* 测量面板毛玻璃样式 */
.measurement-overlay {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 160px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  z-index: 20;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.metrics-grid { display: flex; flex-direction: column; gap: 8px; }
.metric-item { display: flex; flex-direction: column; }
.metric-item.split-top { border-top: 1px dashed rgba(0,0,0,0.1); padding-top: 8px; }
.m-label { font-size: 11px; color: #909399; margin-bottom: 2px; }
.m-value { font-size: 16px; font-weight: bold; color: #303133; }
.m-valueHighlight { font-size: 18px; font-weight: bold; color: #409EFF; }
.m-sub { font-size: 11px; color: #606266; }

.animate-slide-in {
  animation: slideIn 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.empty-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.9);
  z-index: 10;
}
</style>
