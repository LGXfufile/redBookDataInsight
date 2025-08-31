<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

interface MonitorTask {
  id: string
  config: {
    webhookUrl: string
    keywords: string[]
    frequency: number
    lastChecked?: string
  }
}

const loading = ref(false)
const tasks = ref<MonitorTask[]>([])
const dialogVisible = ref(false)

const form = reactive({
  webhookUrl: '',
  keywords: [''],
  frequency: 6
})

const userPlan = ref('free') // free, premium, enterprise
const usageStats = reactive({
  keywordsUsed: 2,
  keywordsLimit: 3,
  analysisCount: 15,
  analysisLimit: 50
})

const addKeyword = () => {
  form.keywords.push('')
}

const removeKeyword = (index: number) => {
  if (form.keywords.length > 1) {
    form.keywords.splice(index, 1)
  }
}

const addMonitorTask = async () => {
  const validKeywords = form.keywords.filter(k => k.trim())
  
  if (!form.webhookUrl || validKeywords.length === 0) {
    ElMessage.error('请填写完整的配置信息')
    return
  }

  if (!/^https:\/\/open\.feishu\.cn\/open-apis\/bot\/v2\/hook\//.test(form.webhookUrl)) {
    ElMessage.error('请输入有效的飞书机器人Webhook地址')
    return
  }

  loading.value = true
  try {
    const taskId = `task_${Date.now()}`
    const response = await axios.post('/api/monitor', {
      action: 'add',
      taskId,
      config: {
        webhookUrl: form.webhookUrl,
        keywords: validKeywords,
        frequency: form.frequency
      }
    })

    if (response.data.success) {
      ElMessage.success('监控任务创建成功')
      dialogVisible.value = false
      resetForm()
      await loadTasks()
    }
  } catch (error) {
    ElMessage.error('创建监控任务失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const removeTask = async (taskId: string) => {
  try {
    const response = await axios.post('/api/monitor', {
      action: 'remove',
      taskId
    })

    if (response.data.success) {
      ElMessage.success('监控任务已移除')
      await loadTasks()
    }
  } catch (error) {
    ElMessage.error('移除任务失败')
    console.error(error)
  }
}

const loadTasks = async () => {
  try {
    const response = await axios.post('/api/monitor', {
      action: 'list'
    })

    if (response.data.success) {
      tasks.value = response.data.tasks
    }
  } catch (error) {
    console.error('加载任务失败:', error)
  }
}

const resetForm = () => {
  form.webhookUrl = ''
  form.keywords = ['']
  form.frequency = 6
}

const testWebhook = async () => {
  if (!form.webhookUrl) {
    ElMessage.error('请先输入Webhook地址')
    return
  }

  loading.value = true
  try {
    const testMessage = {
      msg_type: 'text',
      content: {
        text: '🎉 小红书痛点监控工具\n\nWebhook连接测试成功！\n监控功能已准备就绪。'
      }
    }

    const response = await fetch(form.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    if (response.ok) {
      ElMessage.success('Webhook测试成功！请检查飞书群消息')
    } else {
      ElMessage.error('Webhook测试失败，请检查地址是否正确')
    }
  } catch (error) {
    ElMessage.error('连接测试失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const upgradePlan = () => {
  ElMessage.info('付费功能开发中...')
}

onMounted(() => {
  loadTasks()
})
</script>

<template>
  <div class="settings-container">
    <!-- 用户套餐信息 -->
    <el-card class="plan-card">
      <h3>当前套餐</h3>
      <el-row :gutter="20">
        <el-col :span="16">
          <div class="plan-info">
            <el-tag :type="userPlan === 'free' ? 'info' : 'success'" size="large">
              {{ userPlan === 'free' ? '免费版' : '付费版' }}
            </el-tag>
            <div class="usage-stats">
              <el-progress 
                :percentage="(usageStats.keywordsUsed / usageStats.keywordsLimit) * 100"
                :format="() => `${usageStats.keywordsUsed}/${usageStats.keywordsLimit}`"
              >
                关键词使用情况
              </el-progress>
              <el-progress 
                :percentage="(usageStats.analysisCount / usageStats.analysisLimit) * 100"
                :format="() => `${usageStats.analysisCount}/${usageStats.analysisLimit}`"
                style="margin-top: 10px;"
              >
                分析次数
              </el-progress>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <el-button type="primary" @click="upgradePlan" v-if="userPlan === 'free'">
            升级到付费版
          </el-button>
          <div v-else class="premium-badge">
            <el-icon><Star /></el-icon>
            <span>付费用户</span>
          </div>
        </el-col>
      </el-row>
    </el-card>

    <!-- 监控任务管理 -->
    <el-card class="monitor-card" style="margin-top: 20px">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3>监控任务</h3>
        <el-button type="primary" @click="dialogVisible = true" :disabled="userPlan === 'free'">
          <el-icon><Plus /></el-icon>
          添加监控任务
        </el-button>
      </div>

      <div v-if="userPlan === 'free'" class="upgrade-prompt">
        <el-alert
          title="监控功能需要付费版"
          description="升级到付费版即可享受定时监控和飞书通知功能"
          type="warning"
          show-icon
          :closable="false"
        />
      </div>

      <el-table :data="tasks" style="width: 100%" v-else>
        <el-table-column label="任务ID" prop="id" width="200" />
        <el-table-column label="监控关键词" width="200">
          <template #default="scope">
            <el-tag v-for="keyword in scope.row.config.keywords" :key="keyword" size="small" style="margin-right: 5px;">
              {{ keyword }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="监控频率" width="100">
          <template #default="scope">
            每{{ scope.row.config.frequency }}小时
          </template>
        </el-table-column>
        <el-table-column label="最后检查">
          <template #default="scope">
            {{ scope.row.config.lastChecked ? new Date(scope.row.config.lastChecked).toLocaleString() : '未运行' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button type="danger" size="small" @click="removeTask(scope.row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="userPlan !== 'free' && tasks.length === 0" description="暂无监控任务" />
    </el-card>

    <!-- 添加监控任务对话框 -->
    <el-dialog v-model="dialogVisible" title="添加监控任务" width="600px">
      <el-form :model="form" label-width="120px">
        <el-form-item label="飞书Webhook">
          <el-input
            v-model="form.webhookUrl"
            placeholder="请输入飞书机器人Webhook地址"
            style="width: 100%;"
          />
          <div class="form-help">
            获取方式：飞书群 → 设置 → 机器人 → 添加机器人 → 自定义机器人
          </div>
        </el-form-item>

        <el-form-item label="监控关键词">
          <div v-for="(keyword, index) in form.keywords" :key="index" class="keyword-input">
            <el-input
              v-model="form.keywords[index]"
              placeholder="请输入关键词"
              style="width: 300px; margin-right: 10px"
            />
            <el-button 
              v-if="form.keywords.length > 1" 
              @click="removeKeyword(index)"
              type="danger"
              size="small"
            >
              删除
            </el-button>
          </div>
          <el-button 
            @click="addKeyword" 
            type="primary" 
            plain 
            size="small"
            style="margin-top: 10px"
          >
            添加关键词
          </el-button>
        </el-form-item>

        <el-form-item label="监控频率">
          <el-select v-model="form.frequency" style="width: 200px">
            <el-option label="每2小时" :value="2" />
            <el-option label="每6小时" :value="6" />
            <el-option label="每12小时" :value="12" />
            <el-option label="每24小时" :value="24" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="testWebhook" :loading="loading">测试连接</el-button>
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addMonitorTask" :loading="loading">
            创建任务
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 使用说明 -->
    <el-card class="help-card" style="margin-top: 20px">
      <h3>使用说明</h3>
      <el-steps direction="vertical" :active="3">
        <el-step title="创建飞书机器人">
          <template #description>
            在飞书群中添加自定义机器人，获取Webhook地址
          </template>
        </el-step>
        <el-step title="设置监控任务">
          <template #description>
            输入要监控的关键词和通知频率
          </template>
        </el-step>
        <el-step title="接收通知">
          <template #description>
            系统会定时分析数据，发现新痛点时自动通知
          </template>
        </el-step>
      </el-steps>
    </el-card>
  </div>
</template>

<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.plan-card, .monitor-card, .help-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.plan-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.usage-stats {
  margin-top: 15px;
}

.premium-badge {
  display: flex;
  align-items: center;
  color: #f56c6c;
  font-weight: bold;
}

.premium-badge .el-icon {
  margin-right: 5px;
}

.upgrade-prompt {
  margin-bottom: 20px;
}

.keyword-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.form-help {
  margin-top: 5px;
  color: #999;
  font-size: 12px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button {
  margin-left: 10px;
}
</style>