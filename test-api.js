// 测试API功能的简单脚本
import axios from 'axios';

async function testAnalyzeAPI() {
  console.log('🔍 测试分析API...');
  
  try {
    const response = await axios.post('http://localhost:5173/api/analyze', {
      keywords: ['护肤'],
      monitorEnabled: true,
      notifyFrequency: 6
    });
    
    console.log('✅ API响应成功:');
    console.log(`- 关键词: ${response.data.keyword}`);
    console.log(`- 总帖子数: ${response.data.totalPosts}`);
    console.log(`- 痛点数量: ${response.data.painPoints.length}`);
    console.log(`- 高价值痛点: ${response.data.painPoints.filter(p => p.businessValue > 70).length}`);
    
    if (response.data.painPoints.length > 0) {
      console.log('\n🎯 主要痛点:');
      response.data.painPoints.slice(0, 3).forEach((point, index) => {
        console.log(`${index + 1}. ${point.content} (价值: ${point.businessValue}分)`);
      });
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ API错误:', error.response.status, error.response.data);
    } else {
      console.error('❌ 网络错误:', error.message);
    }
  }
}

async function testMonitorAPI() {
  console.log('\n⚙️ 测试监控API...');
  
  const taskId = `test_task_${Date.now()}`;
  
  try {
    // 添加监控任务
    const addResponse = await axios.post('http://localhost:5173/api/monitor', {
      action: 'add',
      taskId: taskId,
      config: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/8d4df83a-07d0-48a2-83ac-cf8e3b163c3e',
        keywords: ['测试关键词'],
        frequency: 6
      }
    });
    
    console.log('✅ 监控任务添加成功:', addResponse.data.message);
    
    // 查看监控列表
    const listResponse = await axios.post('http://localhost:5173/api/monitor', {
      action: 'list'
    });
    
    console.log(`✅ 监控列表获取成功，共 ${listResponse.data.tasks.length} 个任务`);
    
    // 移除监控任务
    const removeResponse = await axios.post('http://localhost:5173/api/monitor', {
      action: 'remove',
      taskId: taskId
    });
    
    console.log('✅ 监控任务移除成功:', removeResponse.data.message);
    
  } catch (error) {
    if (error.response) {
      console.error('❌ 监控API错误:', error.response.status, error.response.data);
    } else {
      console.error('❌ 网络错误:', error.message);
    }
  }
}

// 等待服务器启动后再测试
setTimeout(async () => {
  console.log('🚀 开始API功能测试...\n');
  await testAnalyzeAPI();
  await testMonitorAPI();
  console.log('\n✨ 测试完成！');
}, 3000);