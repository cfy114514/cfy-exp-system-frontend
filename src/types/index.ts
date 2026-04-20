// ========== 角色相关 (Roles) ==========
export type UserRole = 'admin' | 'teacher' | 'operator';

// ========== 2.2 用户数据模型 (User Model) ==========
export interface User {
  /** UUID */
  id: string;
  /** 登录名，必填 */
  username: string;
  /** 真实姓名，用于展示 */
  real_name: string;
  /** 系统角色 */
  role: UserRole;
  /** 所属院系/实验室名称 */
  department: string;
  /** 头像 URL */
  avatar?: string;
}

// ========== 3.1 实验项目模型 (Project Model) ==========
export type ProjectStatus = 'active' | 'completed';

export interface Project {
  /** 项目 UUID */
  id: string;
  /** 项目名称 (如：RC低通滤波器幅频特性测试) */
  project_name: string;
  /** 外键，关联导师的 User ID */
  teacher_id: string;
  /** 分配的实验员 ID 列表 */
  operator_ids: string[];
  /** 项目状态 */
  status: ProjectStatus;
}

// ========== 3.2 单次实验记录主表 (Experiment Record) ==========
/** 实验环境参数 */
export interface Environment {
  /** 温度 ℃ */
  temperature: number;
  /** 湿度 % */
  humidity: number;
}

export interface ExperimentRecord {
  /** 记录 UUID */
  id: string;
  /** 关联项目 ID */
  project_id: string;
  /** 录入的实验员 ID */
  operator_id: string;
  /** 实验时间 */
  test_date: Date;
  /** 实验环境参数 */
  environment: Environment;
}

// ========== 3.3 激励端：信号发生器参数设定 (Signal Config Model) ==========
export type WaveType = 'Sine' | 'Square' | 'Triangle' | 'Pulse';

export interface SignalConfig {
  /** 关联单次实验记录的 ID */
  record_id: string;
  /** 波形类型 */
  wave_type: WaveType;
  /** 频率，单位 Hz */
  frequency_hz: number;
  /** 峰峰值，单位 V */
  amplitude_vpp: number;
  /** 直流偏置，单位 V */
  offset_v: number;
  /** 占空比，0-100 (仅方波/脉冲波有效) */
  duty_cycle?: number;
}

// ========== 3.4 响应端：示波器数据模型 (Oscilloscope Data Model) ==========
export interface OscilloscopeData {
  /** 关联单次实验记录的 ID */
  record_id: string;
  /** 通道名称，如 'CH1' */
  channel_name: string;
  /** 后端保存 CSV 文件后返回的 OSS/本地路径 */
  file_url: string;
  /** 前端计算出的实际峰峰值 */
  measured_vpp: number;
  /** 采样点总数 */
  data_points: number;
}
