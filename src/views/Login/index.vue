<template>
  <div class="login-container">
    <div class="glass-panel">
      <div class="brand">
        <el-icon :size="40" color="var(--el-color-primary)"><Platform /></el-icon>
        <h2>实验数据管理系统</h2>
        <p>Experimental Data Management</p>
      </div>
      
      <el-form 
        class="login-form" 
        :model="form" 
        :rules="rules" 
        ref="formRef"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="form.username" 
            placeholder="请输入登录名" 
            size="large"
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码" 
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            class="submit-btn" 
            :loading="loading" 
            @click="handleLogin"
          >
            登录系统 (Sign In)
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { ElMessage } from 'element-plus';
import { User, Lock, Platform } from '@element-plus/icons-vue';
import type { FormInstance } from 'element-plus';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: '',
  password: ''
});

const rules = {
  username: [{ required: true, message: '账户名不可为空', trigger: 'blur' }],
  password: [{ required: true, message: '身份鉴权密钥不可为空', trigger: 'blur' }]
};

const handleLogin = async () => {
  if (!formRef.value) return;

  // 避免将 async 函数传入 Element Plus 的旧版 Validate 回调，使用完全的 Promise 链
  let valid = false;
  try {
    valid = await formRef.value.validate();
  } catch (e) {
    return; // 验证没通过，红字会提示
  }

  if (valid) {
    loading.value = true;
    try {
      const success = await userStore.loginAction({ 
        username: form.username, 
        password: form.password 
      });

      if (!success) {
        ElMessage.error('账号或密码错误，请重新输入。');
        // loading 关闭由 finally 兜底
        return;
      }

      ElMessage.success(`登录成功！欢迎回来。`);
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);

    } catch (err: any) {
      ElMessage.error(`网络或系统异常: ${err.message || '未知错误'}`);
    } finally {
      loading.value = false;
    }
  }
};
</script>

<style scoped>
.login-container {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 现代感的深色星空或科技蓝色背景 */
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}

.glass-panel {
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  /* 毛玻璃轻微效果 */
  backdrop-filter: blur(10px);
}

.brand {
  text-align: center;
  margin-bottom: 30px;
}

.brand h2 {
  margin: 15px 0 5px;
  color: #1a1a1a;
  font-size: 22px;
}

.brand p {
  margin: 0;
  color: #666;
  font-size: 13px;
  letter-spacing: 1px;
}

.login-form {
  margin-top: 30px;
}

.submit-btn {
  width: 100%;
  font-weight: bold;
  letter-spacing: 2px;
  border-radius: 8px;
}
</style>
