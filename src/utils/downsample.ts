/**
 * 波形抽稀与数据精简工具 (Downsampling & Data Binning)
 * 专为高频大批量 CSV/示波器 数据设计，致力于突破浏览器与 ECharts 渲染极限，并防止波形失真。
 */

/**
 * 极值包络分箱抽稀算法 (Min-Max Envelope Binning)
 * 将一维时序数据划分为多个区间(Bucket)，仅仅保留每个区间里的最低点与最高点。
 * 在大幅削减数据体积的高性能场景下，完美维持视觉最外层的“轮廓、脉冲、毛刺”外观，科学展现真实峰峰值。
 *
 * @param data 原始的二维数组 [[x1, y1], [x2, y2], ...]
 * @param targetPoints 期望返回的最大折线点数（默认 4000 个，适配 ECharts 大数据防卡顿最佳实践）
 */
export function envelopeDownsample(data: number[][], targetPoints: number = 4000): number[][] {
  // 如果原数据量本来就很小，不进入复杂运算直接放行
  if (!data || data.length <= targetPoints) {
    return data;
  }
  
  // 按照期望保留的极值点对量（每个区抽 2 个极值），推算需要的区间数量
  const numBins = Math.floor(targetPoints / 2);
  const bucketSize = Math.floor(data.length / numBins);
  
  const result: number[][] = [];
  
  for (let i = 0; i < data.length; i += bucketSize) {
    const chunk = data.slice(i, i + bucketSize);
    if (chunk.length === 0) continue;
    
    let minPt = chunk[0];
    let maxPt = chunk[0];
    
    for (let j = 1; j < chunk.length; j++) {
      const pt = chunk[j];
      // pt[1] 是电压值 Y
      if (pt[1] < minPt[1]) minPt = pt;
      if (pt[1] > maxPt[1]) maxPt = pt;
    }
    
    // 按原始 x 轴时间戳还原压入先后顺序（防止折线回拉扭曲）
    if (minPt[0] <= maxPt[0]) {
      result.push(minPt);
      // 有时一个区间内电平不变，min==max，去重
      if (minPt !== maxPt) result.push(maxPt);
    } else {
      result.push(maxPt);
      if (minPt !== maxPt) result.push(minPt);
    }
  }
  
  return result;
}
