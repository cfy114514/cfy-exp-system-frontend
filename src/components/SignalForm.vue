<template>
  <el-card class="signal-form-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span>信号发生器参数配置</span>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      label-position="right"
      @validate="handleValidate"
    >
      <!-- 波形选择 -->
      <el-form-item label="波形类型" prop="wave_type">
        <el-select v-model="formData.wave_type" placeholder="请选择输出波形" style="width: 100%">
          <el-option label="正弦波 (Sine)" value="Sine" />
          <el-option label="方波 (Square)" value="Square" />
          <el-option label="三角波 (Triangle)" value="Triangle" />
          <el-option label="脉冲波 (Pulse)" value="Pulse" />
        </el-select>
      </el-form-item>

      <!-- 频率设定 (带单位换算) -->
      <el-form-item label="频率" prop="freq_value">
        <el-input
          v-model.number="formData.freq_value"
          type="number"
          placeholder="请输入频率数值"
          min="0"
          class="input-with-select"
        >
          <template #append>
            <el-select v-model="formData.freq_unit" style="width: 90px">
              <el-option label="Hz" value="Hz" />
              <el-option label="kHz" value="kHz" />
              <el-option label="MHz" value="MHz" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>

      <!-- 峰峰值 -->
      <el-form-item label="峰峰值 (Vpp)" prop="amplitude_vpp">
        <el-input-number
          v-model="formData.amplitude_vpp"
          :min="0"
          :step="0.1"
          placeholder="V"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 直流偏置 -->
      <el-form-item label="直流偏置 (V)" prop="offset_v">
        <el-input-number
          v-model="formData.offset_v"
          :step="0.1"
          placeholder="V"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 占空比 (条件渲染：仅方波或脉冲波显示) -->
      <el-form-item
        v-if="['Square', 'Pulse'].includes(formData.wave_type)"
        label="占空比 (%)"
        prop="duty_cycle"
      >
        <el-input-number
          v-model="formData.duty_cycle"
          :min="0"
          :max="100"
          :step="1"
          placeholder="0-100"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, watch} from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import type { WaveType, SignalConfig } from '../types';

// 通过 emit 暴露计算好后的标准数据，或给父组件暴露一个获取/校验数据的方法
const emit = defineEmits<{
  (e: 'change', data: Partial<SignalConfig>): void;
}>();

const formRef = ref<FormInstance>();

// 内部数据模型：方便处理单位换算
const formData = reactive({
  wave_type: '' as WaveType | '',
  freq_value: undefined as number | undefined,
  freq_unit: 'Hz' as 'Hz' | 'kHz' | 'MHz',
  amplitude_vpp: undefined as number | undefined,
  offset_v: 0,
  duty_cycle: 50
});

// 表单校验规则：改为非必填，由父组件在需要强校检时处理
const rules = reactive<FormRules>({
  wave_type: [
    { required: false, message: '请选择波形类型', trigger: 'change' }
  ],
  freq_value: [
    { required: false, message: '请输入频率', trigger: 'blur' },
    { type: 'number', min: 0.0001, message: '频率必须大于0', trigger: 'blur' }
  ],
  amplitude_vpp: [
    { required: false, message: '请输入峰峰值', trigger: 'blur' },
    { type: 'number', min: 0, message: '峰峰值不能为负数', trigger: 'blur' }
  ],
  offset_v: [
    { required: false, message: '请输入直流偏置', trigger: 'blur' },
    { type: 'number', message: '直流偏置必须是数字', trigger: 'blur' }
  ],
  duty_cycle: [
    { required: false, message: '请输入占空比', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '占空比必须在 0 到 100 之间', trigger: 'blur' }
  ]
});

// 当波形切换时，如果不是方波和脉冲波，自动将占空比重置或不处理，但校验规则里的 require 自动通过 v-if 控制了。
const handleValidate = () => {};

// 获取真实的赫兹值 (自动换算)
const getRealFrequencyHz = (): number => {
  if (formData.freq_value === undefined) return 0;
  let multiplier = 1;
  if (formData.freq_unit === 'kHz') multiplier = 1000;
  if (formData.freq_unit === 'MHz') multiplier = 1000000;
  return formData.freq_value * multiplier;
};

// 监听内部数据变化，随时对外暴露干净的 SignalConfig
watch(
  () => ({ ...formData }),
  (newVal) => {
    emit('change', {
      wave_type: newVal.wave_type === '' ? undefined : newVal.wave_type,
      frequency_hz: getRealFrequencyHz(),
      amplitude_vpp: newVal.amplitude_vpp,
      offset_v: newVal.offset_v,
      duty_cycle: ['Square', 'Pulse'].includes(newVal.wave_type) ? newVal.duty_cycle : undefined
    });
  },
  { deep: true }
);

// 给父组件提供的获取校验后数据的方法，用于点击“提交”时的防线
const validateAndGetForm = async (): Promise<Omit<SignalConfig, 'record_id'> | null | false> => {
  if (!formRef.value) return false;
  
  // 如果一个字段都没填，直接返回 null 表示“跳过配置”
  if (!formData.wave_type && formData.freq_value === undefined && formData.amplitude_vpp === undefined) {
    return null;
  }

  try {
    await formRef.value.validate();
    return {
      wave_type: formData.wave_type as WaveType,
      frequency_hz: getRealFrequencyHz(),
      amplitude_vpp: formData.amplitude_vpp!,
      offset_v: formData.offset_v,
      duty_cycle: ['Square', 'Pulse'].includes(formData.wave_type) ? formData.duty_cycle : undefined
    };
  } catch (err) {
    // 只有在填了一半且填错的情况下才返回 false（阻断提交）
    return false;
  }
};

defineExpose({
  validateAndGetForm
});
</script>

<style scoped>
.signal-form-card {
  max-width: 600px;
  margin: 0 auto;
}
.card-header {
  font-weight: bold;
  font-size: 16px;
}
.input-with-select :deep(.el-input-group__append) {
  background-color: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
}
</style>
