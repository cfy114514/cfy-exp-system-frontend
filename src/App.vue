<template>
  <el-config-provider namespace="el">
    <router-view />
  </el-config-provider>
</template>

<script setup lang="ts">
// 根组件：提供 Element Plus 的全局配置及路由视图挂载
</script>

<style>
/* 一些全局极简复位 */
body {
  margin: 0;
  padding: 0;
  background-color: #f5f7fa;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
