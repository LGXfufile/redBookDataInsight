import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 模拟Vercel请求和响应对象
function createMockReq(body) {
  return {
    method: 'POST',
    body
  };
}

function createMockRes() {
  let response = {};
  let statusCode = 200;
  
  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          response = { statusCode, data };
          return response;
        }
      };
    },
    json: (data) => {
      response = { statusCode, data };
      return response;
    },
    getResponse: () => response
  };
}

async function testEnhancedMockData() {
  console.log('🧪 测试增强模拟数据功能...');
  
  try {
    // 动态导入API处理函数
    const { default: handler } = await import('./api/analyze.js');
    
    // 测试副业关键词
    console.log('📊 测试副业关键词...');
    const req1 = createMockReq({
      keywords: ['副业'],
      monitorEnabled: false,
      notifyFrequency: 6,
      useRealData: false
    });
    const res1 = createMockRes();
    
    await handler(req1, res1);
    const result1 = res1.getResponse();
    console.log(`✅ 副业: ${result1.data.totalPosts} 帖子, ${result1.data.painPoints.length} 痛点`);
    
    // 测试需求挖掘关键词
    console.log('📊 测试需求挖掘关键词...');
    const req2 = createMockReq({
      keywords: ['需求挖掘'],
      monitorEnabled: false,
      notifyFrequency: 6,
      useRealData: false
    });
    const res2 = createMockRes();
    
    await handler(req2, res2);
    const result2 = res2.getResponse();
    console.log(`✅ 需求挖掘: ${result2.data.totalPosts} 帖子, ${result2.data.painPoints.length} 痛点`);
    
    // 测试海外产品关键词
    console.log('📊 测试海外产品关键词...');
    const req3 = createMockReq({
      keywords: ['海外产品'],
      monitorEnabled: false,
      notifyFrequency: 6,
      useRealData: false
    });
    const res3 = createMockRes();
    
    await handler(req3, res3);
    const result3 = res3.getResponse();
    console.log(`✅ 海外产品: ${result3.data.totalPosts} 帖子, ${result3.data.painPoints.length} 痛点`);
    
    // 验证数据质量
    console.log('\n🔍 验证数据质量...');
    [result1, result2, result3].forEach((result, index) => {
      const keywords = ['副业', '需求挖掘', '海外产品'];
      const data = result.data;
      
      console.log(`\n${keywords[index]} 数据质量检查:`);
      console.log(`  - 痛点数量: ${data.painPoints.length}`);
      console.log(`  - 商业价值>70的痛点: ${data.painPoints.filter(p => p.businessValue > 70).length}`);
      console.log(`  - 趋势数据点: ${data.trends.length}`);
      console.log(`  - 年龄分布: ${Object.keys(data.userProfiles.ageDistribution).length} 个分组`);
      console.log(`  - 地域分布: ${Object.keys(data.userProfiles.locationDistribution).length} 个城市`);
      
      // 展示前3个痛点
      console.log('  前3个痛点:');
      data.painPoints.slice(0, 3).forEach((point, i) => {
        console.log(`    ${i+1}. ${point.content} (价值:${point.businessValue}, 频次:${point.frequency})`);
      });
    });
    
    console.log('\n✅ 增强模拟数据测试完成!');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

async function testNLPAnalysis() {
  console.log('\n🔬 测试NLP分析功能...');
  
  try {
    const { EnhancedNLPAnalyzer } = await import('./api/utils/nlp.js');
    const analyzer = new EnhancedNLPAnalyzer();
    
    // 测试情感分析
    const testTexts = [
      '副业赚不到钱，浪费时间',
      '需求挖掘市场太小，竞争激烈',
      '海外产品物流太慢，税费太高',
      '这个产品真的很好，强烈推荐',
      '一般般吧，还行'
    ];
    
    console.log('情感分析测试:');
    testTexts.forEach(text => {
      const sentiment = analyzer.analyzeSentiment(text);
      console.log(`  "${text}" → 分数:${sentiment.score.toFixed(2)}, 情感:${sentiment.emotion}, 置信度:${sentiment.confidence.toFixed(2)}`);
    });
    
    // 测试痛点提取
    const mockPosts = [
      {
        id: '1',
        title: '副业三个月没赚到钱',
        content: '做副业三个月了，投入很多时间，但收入微薄。市场竞争激烈，客户很难获得。',
        author: '用户1',
        publishTime: '2024-01-01',
        likeCount: 50,
        commentCount: 10,
        tags: ['副业'],
        url: 'test',
        comments: [
          { content: '同感，副业确实难做，投入成本太高了', author: '评论者1', likeCount: 5, publishTime: '2024-01-01' },
          { content: '我也被坑过，现在很谨慎', author: '评论者2', likeCount: 3, publishTime: '2024-01-01' }
        ]
      }
    ];
    
    console.log('\n痛点提取测试:');
    const painPoints = analyzer.extractPainPointsFromRealData(mockPosts);
    console.log(`提取到 ${painPoints.length} 个痛点:`);
    painPoints.forEach((point, i) => {
      console.log(`  ${i+1}. ${point.content} (价值:${point.businessValue}, 情感:${point.sentiment.toFixed(1)}, 频次:${point.frequency})`);
    });
    
    console.log('✅ NLP分析功能测试完成!');
    
  } catch (error) {
    console.error('❌ NLP测试失败:', error.message);
  }
}

// 运行测试
console.log('🚀 开始API功能自测试...\n');
await testEnhancedMockData();
await testNLPAnalysis();
console.log('\n🎉 所有测试完成!');