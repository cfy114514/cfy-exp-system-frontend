<template>
  <div class="login-container">
    <div class="glass-panel">
      <div class="brand">
        <el-icon :size="40" color="var(--el-color-primary)"><Platform /></el-icon>
        <h2>实验数据管理系统</h2>
        <p>Experimental Data Management</p>
      </div>
      
      <!-- 登录表单 -->
      <el-form 
        v-if="!isRegister"
        class="login-form" 
        :model="loginForm" 
        :rules="loginRules" 
        ref="loginFormRef"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="请输入登录名" 
            size="large"
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="loginForm.password" 
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
        <div class="switch-mode">
          没有账号？<el-link type="primary" @click="toggleMode(true)">立即注册</el-link>
        </div>
      </el-form>

      <!-- 注册表单 -->
      <el-form 
        v-else
        class="login-form" 
        :model="registerForm" 
        :rules="registerRules" 
        ref="registerFormRef"
      >
        <el-form-item prop="username">
          <el-input 
            v-model="registerForm.username" 
            placeholder="账号名 (3-50字符)" 
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="registerForm.password" 
            type="password" 
            placeholder="密码 (不少于6位)" 
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input 
            v-model="registerForm.confirmPassword" 
            type="password" 
            placeholder="确认密码" 
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="role">
          <el-radio-group v-model="registerForm.role" style="width: 100%; display: flex; justify-content: space-around;">
            <el-radio value="student">学生 (Student)</el-radio>
            <el-radio value="teacher">教师 (Teacher)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item prop="real_name">
          <el-input 
            v-model="registerForm.real_name" 
            placeholder="真实姓名 (选填)" 
            size="large"
            :prefix-icon="UserFilled"
          />
        </el-form-item>
        <el-form-item prop="department">
          <el-input 
            v-model="registerForm.department" 
            placeholder="部门/班级 (选填)" 
            size="large"
            :prefix-icon="Menu"
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="success" 
            size="large" 
            class="submit-btn" 
            :loading="loading" 
            @click="handleRegister"
          >
            注册账号 (Sign Up)
          </el-button>
        </el-form-item>
        <div class="switch-mode">
          已有账号？<el-link type="primary" @click="toggleMode(false)">返回登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/store/user';
import { AuthAPI } from '@/api';
import { ElMessage } from 'element-plus';
import { User, Lock, Platform, UserFilled, Menu } from '@element-plus/icons-vue';
import type { FormInstance } from 'element-plus';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const isRegister = ref(false);
const loading = ref(false);

const loginFormRef = ref<FormInstance>();
const registerFormRef = ref<FormInstance>();

// --- 登录数据 ---
const loginForm = reactive({
  username: '',
  password: ''
});

const loginRules = {
  username: [{ required: true, message: '账户名不可为空', trigger: 'blur' }],
  password: [{ required: true, message: '身份鉴权密钥不可为空', trigger: 'blur' }]
};

// --- 注册数据 ---
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: 'student' as 'student' | 'teacher',
  real_name: '',
  department: ''
});

const validateConfirmPassword = (_rule: any, value: any, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== registerForm.password) {
    callback(new Error('两次输入密码不一致!'));
  } else {
    callback();
  }
};

const registerRules = {
  username: [
    { required: true, message: '账户名不可为空', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度需在 3 到 50 个字符之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '密码不可为空', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '确认密码不可为空', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择注册角色', trigger: 'change' }
  ]
};

const toggleMode = (val: boolean) => {
  isRegister.value = val;
  if (loginFormRef.value) loginFormRef.value.clearValidate();
  if (registerFormRef.value) registerFormRef.value.clearValidate();
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;

  let valid = false;
  try {
    valid = await loginFormRef.value.validate();
  } catch (e) {
    return;
  }

  if (valid) {
    loading.value = true;
    try {
      const success = await userStore.loginAction({ 
        username: loginForm.username, 
        password: loginForm.password 
      });

      if (!success) {
        ElMessage.error('账号或密码错误，请重新输入。');
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

const handleRegister = async () => {
  if (!registerFormRef.value) return;

  let valid = false;
  try {
    valid = await registerFormRef.value.validate();
  } catch (e) {
    return;
  }

  if (valid) {
    loading.value = true;
    try {
      await AuthAPI.register({
        username: registerForm.username,
        password: registerForm.password,
        role: registerForm.role,
        real_name: registerForm.real_name || undefined,
        department: registerForm.department || undefined
      });
      
      ElMessage.success('注册成功！正在切换到登录界面，请使用新账号登录。');
      isRegister.value = false;
      loginForm.username = registerForm.username;
      loginForm.password = '';
      
    } catch (err: any) {
      ElMessage.error(`注册失败: ${err.response?.data?.detail || err.message || '未知错误'}`);
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
  background: linear-gradient(135deg, #0f2027, #203a43, #2c5364);
}

.glass-panel {
  width: 90%;
  max-width: 440px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
}

.brand {
  text-align: center;
  margin-bottom: 20px;
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
  margin-top: 20px;
}

.submit-btn {
  width: 100%;
  font-weight: bold;
  letter-spacing: 2px;
  border-radius: 8px;
}

.switch-mode {
  text-align: center;
  margin-top: 15px;
  font-size: 14px;
  color: #666;
}

@media (max-width: 480px) {
  .glass-panel {
    padding: 30px 20px;
    border-radius: 12px;
  }
  .brand h2 {
    font-size: 18px;
  }
}
</style>
