import { defineStore } from 'pinia';
import { ref } from 'vue';
import { AuthAPI } from '@/api';
import type { User } from '../types';

export const useUserStore = defineStore('user', () => {
  // 核心认证标识
  const token = ref<string | null>(localStorage.getItem('token') || null);
  
  // 当前登录用户信息，包含 RBAC 角色
  const userInfo = ref<User | null>(null);

  // 登录成功后保存 Token
  const setToken = (newToken: string) => {
    token.value = newToken;
    localStorage.setItem('token', newToken);
  };

  // 彻底废除之前的伪造数据模型，引入真实 API 下方接口
  const loginAction = async (loginForm: any) => {
    // 1. 发起 OAuth2 式密码交换
    const res: any = await AuthAPI.login(loginForm);
    // FastAPI OAuth 通常返回 { access_token: "xxx", token_type: "bearer" }
    const validToken = res.access_token || res.data?.access_token;
    
    if (validToken) {
      setToken(validToken); // 将其锁入门禁
      
      // 2. 利用刚才刚生效的全局拦截器的 Header 自动带回当前人员详细数据
      await fetchUserInfo();
      
      return true;
    }
    return false;
  };

  // 独立暴露出获取个人信息的接口（用于 F5 刷新页面后从内存重建状态）
  const fetchUserInfo = async () => {
    try {
      const meRes: any = await AuthAPI.me();
      const userProfile = meRes.data || meRes;
      userInfo.value = userProfile;
    } catch (e) {
      // Token 如果已死，会由 request.ts 响应拦截器处理踢出
      console.error('自动重载人员凭据失败');
    }
  };

  // 登出/Token 失效时清除所有状态
  const clearAuth = () => {
    token.value = null;
    userInfo.value = null;
    localStorage.removeItem('token');
  };

  return {
    token,
    userInfo,
    setToken,
    clearAuth,
    loginAction,
    fetchUserInfo
  };
}, { persist: true });
