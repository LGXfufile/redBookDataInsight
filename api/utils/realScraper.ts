import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';

interface XHSPost {
  id: string;
  title: string;
  content: string;
  author: string;
  publishTime: string;
  likeCount: number;
  commentCount: number;
  tags: string[];
  url: string;
  comments: XHSComment[];
}

interface XHSComment {
  content: string;
  author: string;
  likeCount: number;
  publishTime: string;
}

interface ScrapingStats {
  keyword: string;
  totalPosts: number;
  totalComments: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
  successRate: number;
}

export class XiaohongshuRealScraper {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private stats: ScrapingStats | null = null;

  // MVP配置
  private config = {
    targetPosts: 50,          // 每关键词目标帖子数
    commentsPerPost: 20,      // 每帖子评论数
    requestDelay: 5000,       // 请求间隔5秒
    batchSize: 10,            // 每批处理10个帖子
    restTime: 300000,         // 批次间休息5分钟 
    timeout: 30000,           // 页面加载超时30秒
    retryAttempts: 3          // 重试次数
  };

  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  ];

  async initialize(): Promise<void> {
    console.log('🚀 启动小红书真实数据爬虫...');
    
    this.browser = await puppeteer.launch({
      headless: false, // 显示浏览器便于调试
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--lang=zh-CN'
      ]
    });

    this.page = await this.browser.newPage();
    
    // 设置随机User-Agent
    const randomUA = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    await this.page.setUserAgent(randomUA);
    
    // 设置额外请求头
    await this.page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    console.log('✅ 浏览器初始化完成');
  }

  async scrapeKeyword(keyword: string): Promise<XHSPost[]> {
    if (!this.page) throw new Error('浏览器未初始化');

    console.log(`\n🔍 开始爬取关键词: "${keyword}"`);
    
    this.stats = {
      keyword,
      totalPosts: 0,
      totalComments: 0,
      startTime: new Date(),
      errors: [],
      successRate: 0
    };

    const posts: XHSPost[] = [];

    try {
      // 访问小红书搜索页面
      const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_search_result_notes`;
      console.log(`📱 访问搜索页面: ${searchUrl}`);
      
      await this.page.goto(searchUrl, { 
        waitUntil: 'networkidle0', 
        timeout: this.config.timeout 
      });
      
      // 等待页面加载
      await this.randomDelay(3000, 5000);

      // 检查是否需要登录或验证
      await this.handleAntiBot();

      // 滚动加载更多内容
      await this.scrollToLoadMore();

      // 获取帖子链接列表
      const postLinks = await this.extractPostLinks();
      console.log(`📄 找到 ${postLinks.length} 个帖子链接`);

      // 限制数量到目标数
      const targetLinks = postLinks.slice(0, this.config.targetPosts);
      
      // 分批处理帖子
      for (let i = 0; i < targetLinks.length; i += this.config.batchSize) {
        const batch = targetLinks.slice(i, i + this.config.batchSize);
        console.log(`\n🔄 处理第 ${Math.floor(i / this.config.batchSize) + 1} 批 (${batch.length} 个帖子)`);

        for (let j = 0; j < batch.length; j++) {
          const link = batch[j];
          try {
            console.log(`  📖 爬取帖子 ${i + j + 1}/${targetLinks.length}: ${link.substring(0, 50)}...`);
            const post = await this.scrapePostDetail(link);
            if (post) {
              posts.push(post);
              this.stats.totalPosts++;
            }
          } catch (error) {
            const errorMsg = `爬取帖子失败 ${link}: ${error.message}`;
            console.error(`  ❌ ${errorMsg}`);
            this.stats.errors.push(errorMsg);
          }

          // 请求间隔
          await this.randomDelay(this.config.requestDelay - 1000, this.config.requestDelay + 1000);
        }

        // 批次间休息
        if (i + this.config.batchSize < targetLinks.length) {
          console.log(`  ⏱️  批次完成，休息 ${this.config.restTime / 1000} 秒...`);
          await this.delay(this.config.restTime);
        }
      }

    } catch (error) {
      const errorMsg = `爬取关键词 "${keyword}" 失败: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      this.stats.errors.push(errorMsg);
    }

    this.stats.endTime = new Date();
    this.stats.successRate = this.stats.totalPosts / Math.min(this.config.targetPosts, posts.length) * 100;
    this.stats.totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);

    console.log(`\n📊 爬取统计:`);
    console.log(`  关键词: ${keyword}`);
    console.log(`  成功帖子: ${this.stats.totalPosts}`);
    console.log(`  评论总数: ${this.stats.totalComments}`);
    console.log(`  成功率: ${this.stats.successRate.toFixed(1)}%`);
    console.log(`  耗时: ${((this.stats.endTime.getTime() - this.stats.startTime.getTime()) / 1000 / 60).toFixed(1)} 分钟`);

    return posts;
  }

  private async handleAntiBot(): Promise<void> {
    try {
      // 检查是否出现登录弹窗
      const loginModal = await this.page.$('.login-modal, .auth-modal, .verify-modal');
      if (loginModal) {
        console.log('🔐 检测到登录弹窗，尝试关闭...');
        await this.page.click('.close, .cancel, .skip', { timeout: 5000 }).catch(() => {});
        await this.delay(2000);
      }

      // 检查是否有验证码
      const captcha = await this.page.$('.captcha, .verify-code, .slider-verify');
      if (captcha) {
        console.log('🤖 检测到验证码，请手动处理...');
        console.log('⏰ 等待30秒供手动处理...');
        await this.delay(30000);
      }

    } catch (error) {
      console.log('⚠️  反爬检测处理异常，继续执行');
    }
  }

  private async scrollToLoadMore(): Promise<void> {
    console.log('📜 滚动加载更多内容...');
    
    for (let i = 0; i < 5; i++) {
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.delay(2000);
      
      // 检查是否有"加载更多"按钮
      const loadMore = await this.page.$('.load-more, .more-btn');
      if (loadMore) {
        await loadMore.click().catch(() => {});
        await this.delay(3000);
      }
    }
  }

  private async extractPostLinks(): Promise<string[]> {
    const links = await this.page.evaluate(() => {
      const linkElements = Array.from(document.querySelectorAll('a[href*="/explore/"]'));
      return linkElements
        .map(el => el.getAttribute('href'))
        .filter(href => href && href.includes('/explore/'))
        .map(href => href.startsWith('http') ? href : `https://www.xiaohongshu.com${href}`)
        .slice(0, 100); // 最多获取100个链接
    });

    return [...new Set(links)]; // 去重
  }

  private async scrapePostDetail(url: string): Promise<XHSPost | null> {
    if (!this.page) return null;

    const retries = this.config.retryAttempts;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.page.goto(url, { 
          waitUntil: 'networkidle0', 
          timeout: this.config.timeout 
        });
        
        await this.delay(2000);

        // 提取帖子基本信息
        const postData = await this.page.evaluate(() => {
          const getTextContent = (selector: string): string => {
            const element = document.querySelector(selector);
            return element ? element.textContent?.trim() || '' : '';
          };

          const getNumber = (selector: string): number => {
            const text = getTextContent(selector);
            const match = text.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
          };

          return {
            id: window.location.pathname.split('/').pop() || '',
            title: getTextContent('.note-detail-title, .title, h1') || '无标题',
            content: getTextContent('.note-detail-desc, .note-content, .desc') || '',
            author: getTextContent('.author-name, .user-name, .username') || '未知用户',
            publishTime: getTextContent('.publish-time, .time, .date') || '',
            likeCount: getNumber('.like-count, .likes-count, [class*="like"]'),
            commentCount: getNumber('.comment-count, .comments-count, [class*="comment"]'),
            tags: Array.from(document.querySelectorAll('.tag, .hashtag, [class*="tag"]'))
                    .map(el => el.textContent?.trim())
                    .filter(tag => tag && tag.length > 0)
                    .slice(0, 5),
            url: window.location.href
          };
        });

        // 获取评论
        const comments = await this.scrapeComments();

        const post: XHSPost = {
          ...postData,
          comments: comments.slice(0, this.config.commentsPerPost)
        };

        return post;

      } catch (error) {
        console.log(`    ⚠️ 尝试 ${attempt}/${retries} 失败: ${error.message}`);
        if (attempt === retries) throw error;
        await this.delay(5000); // 重试前等待
      }
    }

    return null;
  }

  private async scrapeComments(): Promise<XHSComment[]> {
    if (!this.page) return [];

    try {
      // 尝试展开评论区域
      const expandComments = await this.page.$('.expand-comments, .show-more-comments, [class*="展开"]');
      if (expandComments) {
        await expandComments.click();
        await this.delay(2000);
      }

      const comments = await this.page.evaluate(() => {
        const commentElements = Array.from(document.querySelectorAll('.comment-item, .comment, [class*="comment-"]'));
        
        return commentElements.map(element => {
          const getTextContent = (selector: string): string => {
            const el = element.querySelector(selector);
            return el ? el.textContent?.trim() || '' : '';
          };

          const getNumber = (selector: string): number => {
            const text = getTextContent(selector);
            const match = text.match(/[\d,]+/);
            return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
          };

          return {
            content: getTextContent('.comment-content, .content, .text') || 
                    element.textContent?.trim().substring(0, 200) || '',
            author: getTextContent('.comment-author, .author, .username') || '匿名用户',
            likeCount: getNumber('.like-count, [class*="like"]'),
            publishTime: getTextContent('.comment-time, .time, .date') || ''
          };
        }).filter(comment => comment.content.length > 5); // 过滤过短评论
      });

      return comments;

    } catch (error) {
      console.log('    ⚠️ 评论获取失败:', error.message);
      return [];
    }
  }

  async saveData(keyword: string, posts: XHSPost[]): Promise<void> {
    const dataDir = path.join(process.cwd(), 'scraped-data');
    await fs.ensureDir(dataDir);

    const filename = `${keyword}_${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(dataDir, filename);

    const saveData = {
      keyword,
      scrapedAt: new Date().toISOString(),
      stats: this.stats,
      posts
    };

    await fs.writeJSON(filepath, saveData, { spaces: 2 });
    console.log(`💾 数据已保存到: ${filepath}`);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('🔐 浏览器已关闭');
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.delay(delay);
  }
}

// 使用示例函数
export async function runRealDataScraping(keywords: string[] = ['副业', '需求挖掘', '海外产品']): Promise<void> {
  const scraper = new XiaohongshuRealScraper();
  
  try {
    await scraper.initialize();
    
    const allResults: { [keyword: string]: XHSPost[] } = {};
    
    for (const keyword of keywords) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🎯 处理关键词: ${keyword}`);
      console.log(`${'='.repeat(50)}`);
      
      const posts = await scraper.scrapeKeyword(keyword);
      allResults[keyword] = posts;
      
      // 保存单个关键词数据
      await scraper.saveData(keyword, posts);
      
      // 关键词间休息
      if (keywords.indexOf(keyword) < keywords.length - 1) {
        console.log('\n⏰ 关键词间休息10分钟...');
        await new Promise(resolve => setTimeout(resolve, 600000));
      }
    }

    // 汇总统计
    console.log('\n📈 总体统计:');
    Object.entries(allResults).forEach(([keyword, posts]) => {
      const totalComments = posts.reduce((sum, post) => sum + post.comments.length, 0);
      console.log(`  ${keyword}: ${posts.length} 帖子, ${totalComments} 评论`);
    });

  } catch (error) {
    console.error('❌ 爬取过程发生错误:', error);
  } finally {
    await scraper.close();
  }
}