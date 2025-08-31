<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'
import { provide } from 'vue'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

provide(THEME_KEY, 'light')

interface AnalysisResult {
  keyword: string
  totalPosts: number
  painPoints: Array<{
    content: string
    frequency: number
    sentiment: number
    businessValue: number
  }>
  trends: Array<{
    date: string
    count: number
  }>
  userProfiles: {
    ageDistribution: Record<string, number>
    locationDistribution: Record<string, number>
  }
}

const keyword = ref('')
const loading = ref(false)
const analysisResult = ref<AnalysisResult | null>(null)
const activeTab = ref('painpoints')
const form = reactive({
  keywords: [''],
  monitorEnabled: false,
  notifyFrequency: 6
})

const addKeyword = () => {
  if (form.keywords.length < 10) {
    form.keywords.push('')
  } else {
    ElMessage.warning('最多支持10个关键词')
  }
}

const removeKeyword = (index: number) => {
  if (form.keywords.length > 1) {
    form.keywords.splice(index, 1)
  }
}

const analyzeKeywords = async () => {
  const validKeywords = form.keywords.filter(k => k.trim())
  if (validKeywords.length === 0) {
    ElMessage.error('请输入至少一个关键词')
    return
  }

  loading.value = true
  try {
    const response = await axios.post('/api/analyze', {
      keywords: validKeywords,
      monitorEnabled: form.monitorEnabled,
      notifyFrequency: form.notifyFrequency
    })
    analysisResult.value = response.data
    ElMessage.success('分析完成！')
  } catch (error) {
    console.log('API调用失败，使用模拟数据', error)
    
    // 使用模拟数据作为演示
    analysisResult.value = {
      keyword: validKeywords[0],
      totalPosts: Math.floor(Math.random() * 200) + 50,
      painPoints: [
        { content: '价格太贵了', frequency: 23, sentiment: 85, businessValue: 92 },
        { content: '效果不如宣传', frequency: 19, sentiment: 78, businessValue: 88 },
        { content: '包装简陋', frequency: 15, sentiment: 65, businessValue: 72 },
        { content: '物流太慢', frequency: 12, sentiment: 60, businessValue: 68 },
        { content: '客服态度差', frequency: 11, sentiment: 82, businessValue: 75 },
        { content: '质量不好', frequency: 10, sentiment: 88, businessValue: 85 },
        { content: '使用不方便', frequency: 8, sentiment: 55, businessValue: 60 },
        { content: '颜色不正', frequency: 7, sentiment: 52, businessValue: 55 },
        { content: '尺码不准', frequency: 6, sentiment: 48, businessValue: 52 },
        { content: '容易过敏', frequency: 5, sentiment: 90, businessValue: 78 }
      ],
      trends: [
        { date: '2024-08-25', count: 45 },
        { date: '2024-08-26', count: 38 },
        { date: '2024-08-27', count: 52 },
        { date: '2024-08-28', count: 41 },
        { date: '2024-08-29', count: 47 },
        { date: '2024-08-30', count: 55 },
        { date: '2024-08-31', count: 62 }
      ],
      userProfiles: {
        ageDistribution: {
          '18-25': 32,
          '26-35': 45,
          '36-45': 18,
          '46+': 5
        },
        locationDistribution: {
          '北京': 22,
          '上海': 20,
          '广州': 15,
          '深圳': 18,
          '杭州': 8,
          '其他': 17
        }
      }
    }
    
    ElMessage.success('分析完成！(演示数据)')
  } finally {
    loading.value = false
  }
}

// 图表配置
const trendChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  return {
    title: {
      text: '趋势分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: analysisResult.value.trends.map(t => t.date)
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: analysisResult.value.trends.map(t => t.count),
      type: 'line',
      smooth: true,
      lineStyle: {
        color: '#667eea'
      },
      areaStyle: {
        color: 'rgba(102, 126, 234, 0.3)'
      }
    }]
  }
})

const painPointChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  const top10PainPoints = analysisResult.value.painPoints.slice(0, 10)
  
  return {
    title: {
      text: '痛点分析',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '10%',
      right: '10%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value'
    },
    yAxis: {
      type: 'category',
      data: top10PainPoints.map(p => p.content.length > 10 ? p.content.slice(0, 10) + '...' : p.content)
    },
    series: [{
      name: '商业价值',
      type: 'bar',
      data: top10PainPoints.map(p => p.businessValue),
      itemStyle: {
        color: function(params: any) {
          const value = params.value
          if (value > 70) return '#f56c6c'
          if (value > 40) return '#e6a23c'
          return '#67c23a'
        }
      }
    }]
  }
})

const userProfileChartOption = computed(() => {
  if (!analysisResult.value) return {}
  
  return {
    title: {
      text: '用户画像',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [{
      name: '年龄分布',
      type: 'pie',
      radius: '50%',
      data: Object.entries(analysisResult.value.userProfiles.ageDistribution).map(([age, count]) => ({
        value: count,
        name: age
      })),
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
    }]
  }
})
</script>

<template>
  <div class="home-container">
    <el-card class="main-card">
      <div class="input-section">
        <h2>关键词分析</h2>
        <p class="description">输入您想要分析的关键词，发现小红书用户的真实痛点和商业机会</p>
        
        <el-form :model="form" label-width="120px">
          <el-form-item label="关键词">
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
                :icon="'Delete'"
              />
            </div>
            <el-button 
              @click="addKeyword" 
              type="primary" 
              plain 
              size="small" 
              :icon="'Plus'"
              style="margin-top: 10px"
            >
              添加关键词
            </el-button>
          </el-form-item>

          <el-form-item label="定时监控">
            <el-switch v-model="form.monitorEnabled" />
            <span class="form-help">开启后将定期检测新的用户反馈</span>
          </el-form-item>

          <el-form-item v-if="form.monitorEnabled" label="监控频率">
            <el-select v-model="form.notifyFrequency" style="width: 200px">
              <el-option label="每2小时" :value="2" />
              <el-option label="每6小时" :value="6" />
              <el-option label="每12小时" :value="12" />
              <el-option label="每24小时" :value="24" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button 
              type="primary" 
              @click="analyzeKeywords"
              :loading="loading"
              size="large"
            >
              {{ loading ? '分析中...' : '开始分析' }}
            </el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <el-card v-if="analysisResult" class="result-card" style="margin-top: 20px">
      <h3>分析结果</h3>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-statistic title="总帖子数" :value="analysisResult.totalPosts" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="发现痛点" :value="analysisResult.painPoints.length" />
        </el-col>
        <el-col :span="8">
          <el-statistic title="商业机会" :value="analysisResult.painPoints.filter(p => p.businessValue > 70).length" />
        </el-col>
      </el-row>

      <el-divider />

      <!-- 数据可视化图表 -->
      <el-tabs v-model="activeTab" type="border-card">
        <el-tab-pane label="痛点分析" name="painpoints">
          <el-row :gutter="20">
            <el-col :span="16">
              <VChart :option="painPointChartOption" style="height: 400px;" />
            </el-col>
            <el-col :span="8">
              <h4>主要痛点详情</h4>
              <el-table :data="analysisResult.painPoints.slice(0, 5)" style="width: 100%" size="small">
                <el-table-column prop="content" label="痛点内容" show-overflow-tooltip />
                <el-table-column prop="businessValue" label="价值" width="80">
                  <template #default="scope">
                    <el-tag 
                      :type="scope.row.businessValue > 70 ? 'danger' : scope.row.businessValue > 40 ? 'warning' : 'success'"
                      size="small"
                    >
                      {{ scope.row.businessValue }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="趋势分析" name="trends">
          <VChart :option="trendChartOption" style="height: 400px;" />
        </el-tab-pane>

        <el-tab-pane label="用户画像" name="userprofile">
          <el-row :gutter="20">
            <el-col :span="12">
              <VChart :option="userProfileChartOption" style="height: 400px;" />
            </el-col>
            <el-col :span="12">
              <h4>地域分布</h4>
              <el-table :data="Object.entries(analysisResult.userProfiles.locationDistribution).map(([location, count]) => ({ location, count }))" style="width: 100%" size="small">
                <el-table-column prop="location" label="地区" />
                <el-table-column prop="count" label="用户数" />
                <el-table-column label="占比" width="100">
                  <template #default="scope">
                    {{ ((scope.row.count / Object.values(analysisResult!.userProfiles.locationDistribution).reduce((a, b) => a + b, 0)) * 100).toFixed(1) }}%
                  </template>
                </el-table-column>
              </el-table>
            </el-col>
          </el-row>
        </el-tab-pane>

        <el-tab-pane label="详细表格" name="table">
          <el-table :data="analysisResult.painPoints" style="width: 100%">
            <el-table-column prop="content" label="痛点内容" min-width="200" show-overflow-tooltip />
            <el-table-column prop="frequency" label="提及频次" width="100" sortable />
            <el-table-column prop="sentiment" label="情感强度" width="120" sortable>
              <template #default="scope">
                <el-progress 
                  :percentage="scope.row.sentiment" 
                  :color="scope.row.sentiment > 70 ? '#f56c6c' : scope.row.sentiment > 40 ? '#e6a23c' : '#67c23a'"
                  :show-text="false"
                />
                <span style="margin-left: 10px; font-size: 12px;">{{ scope.row.sentiment.toFixed(1) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="businessValue" label="商业价值" width="120" sortable>
              <template #default="scope">
                <el-tag 
                  :type="scope.row.businessValue > 70 ? 'danger' : scope.row.businessValue > 40 ? 'warning' : 'success'"
                >
                  {{ scope.row.businessValue }}分
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <div class="feature-cards" v-if="!analysisResult">
      <el-row :gutter="20">
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>精准痛点挖掘</h3>
            <p>AI智能分析用户评论，识别高频痛点和情感强度</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>商业价值评估</h3>
            <p>基于市场需求和竞争情况，量化每个痛点的商业价值</p>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="feature-card">
            <div class="feature-icon">🔔</div>
            <h3>实时监控通知</h3>
            <p>定时监控新增内容，第一时间发现市场机会</p>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
}

.main-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.input-section h2 {
  color: #333;
  margin-bottom: 8px;
}

.description {
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.keyword-input {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.form-help {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}

.result-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.feature-cards {
  margin-top: 40px;
}

.feature-card {
  text-align: center;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  margin-bottom: 12px;
  color: white;
}

.feature-card p {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}
</style>
