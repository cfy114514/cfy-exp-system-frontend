<template>
  <div class="wave-chart-container">
    <div ref="chartRef" class="echarts-dom"></div>
    
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
  title?: string;
  rawData?: [number, number][];
}>();

const chartRef = ref<HTMLElement>();
const chartInstance = shallowRef<echarts.ECharts>();

const initChart = () => {
  if (!chartRef.value) return;
  chartInstance.value = echarts.init(chartRef.value);
};

const renderChart = () => {
  if (!chartInstance.value) return;

  const rawPoints = (props.rawData as any) || [];
  const data = envelopeDownsample(rawPoints);

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
      axisPointer: { type: 'cross' } 
    },
    grid: {
      left: '5%',
      right: '8%',
      bottom: '15%',
      containLabel: true
    },
    toolbox: {
      feature: {
        dataZoom: { yAxisIndex: 'none' }, 
        restore: {},                      
        saveAsImage: {}                   
      }
    },
    dataZoom: [
      {
        type: 'inside', 
        xAxisIndex: [0],
        start: 0,
        end: 100
      },
      {
        type: 'slider', 
        xAxisIndex: [0],
        bottom: 10
      }
    ],
    xAxis: {
      type: 'value',
      name: 'Time (s)', 
      nameLocation: 'middle',
      nameGap: 30,
      scale: true,      
      splitLine: { show: false } 
    },
    yAxis: {
      type: 'value',
      name: 'Voltage (V)', 
      scale: true,         
      splitLine: {
        lineStyle: { type: 'dashed', color: '#eee' }
      }
    },
    series: [
      {
        name: '电压值',
        type: 'line',
        data: data,
        showSymbol: false,
        large: true,
        largeThreshold: 3000,
        itemStyle: { color: '#409EFF' },
        lineStyle: { width: 1.5, opacity: 0.8 },
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
  { deep: false } 
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
