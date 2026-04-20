import * as Papa from 'papaparse';

export interface CSVParseResult {
  /** 识别出的通道名称（如 CH1, CH2） */
  channel_name: string;
  /** 经过处理得到的峰峰值 (单位 V) */
  measured_vpp: number;
  /** 提取出的最大电压值 */
  max_v: number;
  /** 提取出的最小电压值 */
  min_v: number;
  /** 平均电压 (单位 V) */
  avg_v: number;
  /** 估算频率 (单位 Hz) */
  frequency: number;
  /** 有效的电压采样点总数 */
  data_points: number;
  /** 供前端 ECharts 等大屏图表组件直接消费的二维数组：[时间, 电压][] */
  rawData: [number, number][];
}

/**
 * 核心工具函数：纯前端原生日解析示波器导出的 CSV 文件
 * - 优势：不依赖服务器性能，直接在浏览器内存完成重型分析。
 * @param file 用户通过文件选择器传入的 CSV File 对象
 * @returns 解析出的各类强相关参数
 */
export function parseOscilloscopeCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      // 使用 Worker 开启多线程解析应对可能存在的数百万条海量数据点
      worker: true, 
      complete: (results: Papa.ParseResult<unknown>) => {
        try {
          // 由于 ts 的 Papa 类型化宽泛，将其转化为二维字符串数组方便操作
          const rows = results.data as string[][];

          if (rows.length < 3) {
            return reject(new Error("文件数据行数不足，请确认是否为合法的示波器CSV导出文件"));
          }

          // ===== 亮点：智能探嗅通道名称 (截取前5行内扫描，涵盖大部分厂商牌局) =====
          let channelGuess = 'CH1';
          const headersStr = rows.slice(0, 5).map(row => row.join(',')).join(',').toUpperCase();
          
          if (headersStr.includes('CH2')) channelGuess = 'CH2';
          else if (headersStr.includes('CH3')) channelGuess = 'CH3';
          else if (headersStr.includes('CH4')) channelGuess = 'CH4';

          // 按照指令，跳过前两行无用的机型、日期等头信息。不同的示波器情况不同，
          // 用切片抛弃前两行，剩下的在循环时增加非数字过滤 (容错：即便第3行是表头也无影响)
          const dataRows = rows.slice(2);
          
          let maxV = -Infinity;
          let minV = Infinity;
          let sumV = 0;
          const rawData: [number, number][] = [];

          for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            
            const timeStr = row[0];
            const voltageStr = row[1];

            const time = parseFloat(timeStr);
            const voltage = parseFloat(voltageStr);

            if (!isNaN(time) && !isNaN(voltage)) {
              rawData.push([time, voltage]);
              sumV += voltage;
              if (voltage > maxV) maxV = voltage;
              if (voltage < minV) minV = voltage;
            }
          }

          if (rawData.length === 0) {
            return reject(new Error("未能从 CSV 中提取并清洗出有效的 [Time, Voltage] 浮点数据段。"));
          }

          // 计算基础统计指标
          const vpp = Number((maxV - minV).toFixed(4));
          const avgV = Number((sumV / rawData.length).toFixed(4));
          
          // ===== 频率计算 (零点交叉法) =====
          let frequency = 0;
          if (rawData.length > 10) {
            let crossings: number[] = [];
            // 使用平均电压作为“零位”基准
            for (let i = 1; i < rawData.length; i++) {
              const prevV = rawData[i-1][1];
              const currV = rawData[i][1];
              // 检测正向交叉 (从下方穿过均值线往上)
              if (prevV <= avgV && currV > avgV) {
                crossings.push(rawData[i][0]);
              }
            }
            
            if (crossings.length > 1) {
              const totalTime = crossings[crossings.length - 1] - crossings[0];
              const periods = crossings.length - 1;
              frequency = Number((periods / totalTime).toFixed(2));
            }
          }

          resolve({
            channel_name: channelGuess,
            max_v: Number(maxV.toFixed(4)),
            min_v: Number(minV.toFixed(4)),
            avg_v: avgV,
            measured_vpp: vpp,
            frequency: frequency,
            data_points: rawData.length,
            rawData
          });
        } catch (err) {
          reject(new Error("解析清洗 CSV 文件时发生未预期的异常: " + String(err)));
        }
      },
      error: (error: Error) => {
        reject(new Error("利用 Papaparse 文件扫描直接报错: " + error.message));
      }
    });
  });
}
