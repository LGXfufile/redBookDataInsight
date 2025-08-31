<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <el-container class="app-container">
    <el-header>
      <div class="header-content">
        <h1>小红书需求洞察工具</h1>
        <p>AI驱动的用户痛点挖掘与商业机会发现</p>
        
        <div class="nav-menu">
          <el-menu mode="horizontal" :default-active="route.path" router background-color="transparent" text-color="#fff" active-text-color="#ffd04b">
            <el-menu-item index="/">
              <el-icon><House /></el-icon>
              首页
            </el-menu-item>
            <el-menu-item index="/settings">
              <el-icon><Setting /></el-icon>
              设置
            </el-menu-item>
          </el-menu>
        </div>
      </div>
    </el-header>
    <el-main>
      <RouterView />
    </el-main>
  </el-container>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.el-header {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  height: auto !important;
  padding: 20px 0;
}

.header-content {
  text-align: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.header-content h1 {
  color: white;
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 8px;
}

.header-content p {
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin-bottom: 20px;
}

.nav-menu {
  display: flex;
  justify-content: center;
}

.nav-menu .el-menu {
  border: none;
}

.nav-menu .el-menu-item {
  border-bottom: 2px solid transparent !important;
}

.nav-menu .el-menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-bottom: 2px solid rgba(255, 208, 75, 0.5) !important;
}

.nav-menu .el-menu-item.is-active {
  border-bottom: 2px solid #ffd04b !important;
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.el-main {
  padding: 40px 20px;
}
</style>
