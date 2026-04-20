<template>
  <div class="chart-container">
    <div style="margin-bottom: 10px; display: flex; justify-content: flex-end;" v-if="props.cleanedData && props.cleanedData.length > 0">
      <el-radio-group v-model="displayMode" size="small">
        <el-radio-button value="all">双轨对比</el-radio-button>
        <el-radio-button value="raw">原始底噪</el-radio-button>
        <el-radio-button value="cleaned">纯净波形</el-radio-button>
      </el-radio-group>
    </div>
    <div ref="chartRef" class="echarts-dom" :style="{ height: props.height || '500px' }"></div>

    <!-- 双轨测量对比面板 -->
    <div v-if="metricsRaw" class="dual-metrics-overlay animate-slide-in">
      <div class="metrics-column">
        <div class="column-title raw">原始通道</div>
        <div class="metric-row"><span class="l">Vpp</span><span class="v">{{ metricsRaw.vpp }}V</span></div>
        <div class="metric-row"><span class="l">Freq</span><span class="v">{{ metricsRaw.freq > 0 ? metricsRaw.freq + 'Hz' : '--' }}</span></div>
      </div>
      <div class="metrics-divider" v-if="metricsCleaned"></div>
      <div class="metrics-column" v-if="metricsCleaned">
        <div class="column-title cleaned">DSP 净化</div>
        <div class="metric-row"><span class="l">Vpp</span><span class="v">{{ metricsCleaned.vpp }}V</span></div>
        <div class="metric-row"><span class="l">Freq</span><span class="v">{{ metricsCleaned.freq > 0 ? metricsCleaned.freq + 'Hz' : '--' }}</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue';
import * as echarts from 'echarts';
import { envelopeDownsample } from '@/utils/downsample';

const props = defineProps<{
  timeAxis: number[];
  rawData: number[];
  cleanedData?: number[];
  title?: string;
  height?: string;
}>();

const chartRef = ref<HTMLElement | null>(null);
const chartInstance = shallowRef<echarts.ECharts | null>(null);
let resizeObserver: ResizeObserver | null = null;
const displayMode = ref('all');

// 内部测量状态
const metricsRaw = ref<any>(null);
const metricsCleaned = ref<any>(null);

const calcSingleMetrics = (timeAxis: number[], data: number[]) => {
  if (!data?.length) return null;
  let max = -Infinity, min = Infinity, sum = 0;
  for (const v of data) {
    if (v > max) max = v;
    if (v < min) min = v;
    sum += v;
  }
  const avg = sum / data.length;
  let freq = 0;
  let crossings = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i-1] <= avg && data[i] > avg) crossings.push(timeAxis[i]);
  }
  if (crossings.length > 1) {
    freq = (crossings.length - 1) / (crossings[crossings.length-1] - crossings[0]);
  }
  return { vpp: (max-min).toFixed(3), avg: avg.toFixed(3), freq: freq.toFixed(1) };
};

const renderChart = () => {
  if (!chartInstance.value) return;

  const rawPoints = props.timeAxis.map((t, i) => [t, props.rawData[i]]);
  const seriesRaw = envelopeDownsample(rawPoints);
  
  let seriesCleaned: number[][] = [];
  if (props.cleanedData && props.cleanedData.length > 0) {
    seriesCleaned = envelopeDownsample(props.timeAxis.map((t, i) => [t, props.cleanedData![i]]));
    metricsCleaned.value = calcSingleMetrics(props.timeAxis, props.cleanedData);
  }
  
  metricsRaw.value = calcSingleMetrics(props.timeAxis, props.rawData);

  const series: any[] = [];
  
  // MarkPoint 公共极值标注
  const markPointCommon = {
    data: [
      { type: 'max', name: 'Max' },
      { type: 'min', name: 'Min' }
    ]
  };

  if (displayMode.value === 'all' || displayMode.value === 'raw') {
    series.push({
      name: '原始采集波形',
      type: 'line',
      data: seriesRaw,
      showSymbol: false,
      itemStyle: { color: seriesCleaned.length && displayMode.value === 'all' ? '#aaaaaa' : '#3b82f6' },
      lineStyle: { 
        width: seriesCleaned.length && displayMode.value === 'all' ? 1 : 2, 
        opacity: seriesCleaned.length && displayMode.value === 'all' ? 0.6 : 1 
      },
      markPoint: displayMode.value === 'raw' ? markPointCommon : undefined
    });
  }

  if ((displayMode.value === 'all' || displayMode.value === 'cleaned') && seriesCleaned.length) {
    series.push({
      name: 'DSP 降噪/回放波形',
      type: 'line',
      data: seriesCleaned,
      showSymbol: false,
      itemStyle: { color: '#ef4444' },
      lineStyle: { width: 2, opacity: 1 },
      markPoint: markPointCommon
    });
  }

  chartInstance.value.setOption({
    title: { text: props.title || '波形图', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      data: series.map(s => s.name),
      bottom: 0
    },
    grid: { left: '5%', right: '5%', bottom: '15%', containLabel: true },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0, bottom: 30 }
    ],
    xAxis: { type: 'value', name: 'Time (s)', nameLocation: 'middle', nameGap: 25, scale: true },
    yAxis: { type: 'value', name: 'Voltage (V)', scale: true },
    series
  }, true);
};

onMounted(() => {
  if (chartRef.value) {
    chartInstance.value = echarts.init(chartRef.value);
    resizeObserver = new ResizeObserver(() => {
      chartInstance.value?.resize();
    });
    resizeObserver.observe(chartRef.value);
    
    if (props.timeAxis.length) renderChart();
  }
});

watch([() => props.timeAxis, displayMode], () => {
  renderChart();
}, { deep: true });

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect();
  chartInstance.value?.dispose();
});
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
}
.echarts-dom {
  width: 100%;
}

.dual-metrics-overlay {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  z-index: 10;
}

.metrics-column { min-width: 80px; }
.column-title { font-size: 10px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
.column-title.raw { color: #888; }
.column-title.cleaned { color: #ef4444; }
.metric-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px; }
.metric-row .l { color: #909399; margin-right: 8px; }
.metric-row .v { font-weight: bold; }

.metrics-divider { width: 1px; background: rgba(0,0,0,0.05); margin: 0 12px; }

.animate-slide-in {
  animation: slideIn 0.4s ease-out forwards;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
