import axios from 'axios';
import { ElMessage, ElNotification } from 'element-plus';
import router from '@/router';

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '', // 从环境变量读取后端地址
  timeout: 50000 // 考虑到后台 DSP 有运算开销，给足一定的时间
});

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 每次请求前动态提取 localStorage 里的 token
    const token = localStorage.getItem('token');
    if (token) {
      // 标准的 OAuth2.0 / JWT 头部注入
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    // 假设正常业务走到此，直接返回业务层需要的数据或者整个 response 均可
    return response.data;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        ElMessage.error('登录秘钥失效或无权访问，请重新认证接入');
        // 主动清空遗留垃圾
        localStorage.removeItem('token');
        // 因为没在组件内，直接使用原生 router 实例强行拉客流踢回
        router.push('/login');
      } 
      else if (error.response.status === 422) {
        const detail = error.response.data?.detail;
        
        console.group('%c🚨 发现后端 Pydantic 数据规范核验冲撞 [422 Unprocessable Entity]', 'color: white; background: #e74c3c; padding: 4px 8px; border-radius: 4px; font-size: 13px;');
        console.log('%c💥 【前端出包接口】', 'font-weight: bold; color: #e67e22;', error.config.url);
        console.log('%c📦 【前端携带报文】', 'font-weight: bold; color: #3498db;', error.config.data);
        console.log('%c🎯 【后端拒绝接收原因（请完整复制此段提供给后台重写）】', 'font-weight: bold; color: #e74c3c;', JSON.stringify(detail, null, 2));
        console.groupEnd();

        let errorMsg = '上传报文引发了后端警报！请按 F12 打开控制台提取诊断书反馈给后端！';
        if (Array.isArray(detail)) {
          const msgs = detail.map((err: any) => {
            const loc = err.loc ? err.loc.join('.') : '未知字段';
            return `[${loc}] ${err.msg}`;
          });
          errorMsg = `参数校验失败:\n${msgs.join('\n')}`;
        }
        
        ElNotification.error({
          title: '后端 Pydantic 数据规范核验冲撞 (422)',
          message: errorMsg,
          duration: 8000,
          position: 'bottom-right'
        });
      } else {
        // 其他常见的 HTTP 抛错通配
        const errMsg = typeof error.response.data?.detail === 'string' 
            ? error.response.data.detail 
            : error.response.data?.message;
        ElMessage.error(`服务器开小差了: ${errMsg || '未知异常'}`);
      }
    } else {
      ElMessage.error('网络通讯失联，请检查服务器 8000 端口存活状态');
    }
    return Promise.reject(error);
  }
);

export default service;
