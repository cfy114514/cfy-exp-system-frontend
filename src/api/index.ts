import request from '@/utils/request';

/**
 * 核心 Auth 层
 */
export const AuthAPI = {
  // 注意，OAuth2 的标准是要传 FormEncoded
  login(data: { username: string; password: string }) {
    const params = new URLSearchParams();
    params.append('username', data.username);
    params.append('password', data.password);

    return request.post('/api/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },
  
  // 注册新用户
  register(data: { username: string; password: string; role: 'student' | 'teacher'; real_name?: string; department?: string }) {
    return request.post('/api/auth/register', data);
  },
  
  // 拉取登录者的 RBAC 权限等级联数据
  me() {
    return request.get('/api/auth/me');
  }
};

/**
 * 项目池级联查询层
 */
export const ProjectAPI = {
  // 获取当前角色的所有管理与参与层级的科研项目
  getMyProjects() {
    return request.get('/api/projects/my');
  },
  
  // 按照 ID 获取特定下属科目所管辖的所有瘦身压缩波形数组
  getProjectRecords(projectId: string) {
    return request.get(`/api/projects/${projectId}/records`);
  },

  // 发起新的立项审批
  createProject(data: any) {
    return request.post('/api/projects', data);
  },

  // 按特定 ID 从后端直接拉取清洗完成的波形供重放展现
  getRecordWaveform(recordId: number) {
    return request.get(`/api/records/${recordId}/waveform`);
  }
};

/**
 * 仪表盘与大屏看表
 */
export const DashboardAPI = {
  getSummary() {
    return request.get('/api/dashboard/summary');
  }
};

/**
 * 实验数据管道与历史查询
 */
export const ExperimentAPI = {
  // 原有的波形上传
  uploadRecord(formData: FormData) {
    return request.post('/api/experiment/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // 综合高级检索引擎
  searchRecords(searchCondition: any) {
    return request.post('/api/records/search', searchCondition);
  },

  // 单点详细点播（带全量元数据）
  getRecordDetail(recordId: number) {
    return request.get(`/api/records/${recordId}`);
  },

  // 以流式拉取需授权下载的文件资源（原 CSV、PDF、现场照片）
  downloadFileAsBlob(fileId: string) {
    // 根据安全要求，需要借助 Axios 自动填入 Header 中的 Bearer Token
    return request.get(`/api/files/download/${fileId}`, {
      responseType: 'blob'
    });
  },

  // (🔥新增) 新通道并发提取服务：接收组列 ID 并请求后端调用微服务计算矩阵组合比对波形
  compareRecords(recordIds: number[]) {
    return request.post('/api/records/compare', { record_ids: recordIds });
  },

  // (🔥新增) 删除指定实验记录
  deleteRecord(recordId: number) {
    return request.delete(`/api/records/${recordId}`);
  }
};

/**
 * (🔥 Admin-Only) 管理员中心 API
 */
export const AdminAPI = {
  // 获取系统中所有用户的详勘信息
  getAllUsers() {
    return request.get('/api/admin/users');
  },
  // 修改用户角色 (admin/teacher/student)
  updateUserRole(userId: number, role: string) {
    return request.put(`/api/admin/users/${userId}/role`, { role });
  },
  // 切换账号状态 (1: 正常, 0: 封禁)
  updateUserStatus(userId: number, isActive: number) {
    return request.put(`/api/admin/users/${userId}/status`, { is_active: isActive });
  },
  // 强制重置用户密码
  resetUserPassword(userId: number, newPassword: string) {
    return request.post(`/api/admin/users/${userId}/reset-password`, { new_password: newPassword });
  },
  // 修改基本详勘信息 (真实姓名、部门)
  updateUserProfile(userId: number, data: { real_name?: string; department?: string }) {
    return request.patch(`/api/admin/users/${userId}/profile`, data);
  },
  // 上传头像物理文件
  uploadAvatar(userId: number, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request.post(`/api/admin/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
};

/**
 * (🔥 NEW) 分组与协同申请 API
 */
export const GroupAPI = {
  // 获取所有分组 (Admin 模式下获取全量，Teacher 模式下获取所辖)
  getGroups() {
    return request.get('/api/groups/all');
  },
  // 教师/Admin 创建新课题组
  createGroup(data: { name: string; subject_id: number; group_type: string }) {
    return request.post('/api/groups', data);
  },
  // 获取待处理的入组申请清单
  getPendingApplications() {
    return request.get('/api/groups/applications');
  },
  // 处理申请 (approve/reject)
  handleApplication(appId: number, action: 'approve' | 'reject') {
    return request.post(`/api/groups/applications/${appId}`, { action });
  },
  // 学生申请加入分组
  applyToGroup(groupId: number) {
    return request.post(`/api/groups/apply/${groupId}`);
  }
};
