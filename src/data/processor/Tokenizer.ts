import type { Token } from '../types';

/**
 * 分词器类，支持中英文分词和停用词过滤
 */
export class Tokenizer {
  private nodejieba: any;
  private stopwords: Set<string>;
  private customDict: Map<string, string>;
  private initialized: boolean;
  private initPromise: Promise<void> | null;

  constructor() {
    // 懒加载nodejieba，只在需要时导入
    this.nodejieba = null;
    this.stopwords = new Set();
    this.customDict = new Map();
    this.initialized = false;
    this.initPromise = null;
    
    // 同步初始化停用词
    this.addStopwords(['的', '了', '和', '是', '在', '我', '有', '个', '这', '那', '而', '与', '或', '但', '就', '都', '要', '也', '很', '更', '不', '在', '了', '吧', '啊', '呢']);
  }

  private async init() {
    if (this.initialized || this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        // 尝试加载nodejieba（在Node.js环境下）
        if (typeof window === 'undefined' || (window as any).require) {
          try {
            this.nodejieba = await import('nodejieba').then(m => m.default);
            // 初始化nodejieba
            if (this.nodejieba && typeof this.nodejieba.load === 'function') {
              this.nodejieba.load();
            }
          } catch (error) {
            console.warn('Nodejieba could not be loaded, falling back to regex分词:', error);
          }
        }
      } catch (error) {
        console.error('Error during tokenizer initialization:', error);
      } finally {
        this.initialized = true;
      }
    })();

    return this.initPromise;
  }

  /**
   * 添加自定义词典
   */
  addCustomDict(words: Array<{word: string, type: string}>): void {
    words.forEach(item => {
      this.customDict.set(item.word, item.type);
    });
    
    // 如果nodejieba已加载，添加到词典
    if (this.nodejieba && typeof this.nodejieba.addWord === 'function') {
      words.forEach(item => {
        this.nodejieba.addWord(item.word);
      });
    }
  }

  /**
   * 添加停用词
   */
  addStopwords(words: string[]): void {
    words.forEach(word => this.stopwords.add(word));
  }

  /**
   * 移除停用词
   */
  removeStopwords(words: string[]): void {
    words.forEach(word => this.stopwords.delete(word));
  }

  /**
   * 分词主方法
   */
  async tokenize(text: string): Promise<Token[]> {
    if (!text || typeof text !== 'string') {
      return [];
    }

    // 确保初始化完成
    await this.init();

    const tokens: Token[] = [];
    
    // 先检查文本中是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(text);
    
    if (hasChinese && this.nodejieba && typeof this.nodejieba.cut === 'function') {
      try {
        // 使用nodejieba进行中文分词
        const jiebaResult = this.nodejieba.cut(text, true); // true表示启用HMM
        
        let currentPos = 0;
        jiebaResult.forEach((word: string) => {
          const start = text.indexOf(word, currentPos);
          if (start !== -1) {
            const token: Token = {
              text: word,
              start: start,
              end: start + word.length,
              type: this.customDict.get(word) || 'unknown'
            };
            
            // 过滤停用词
            if (!this.stopwords.has(word)) {
              tokens.push(token);
            }
            
            currentPos = start + word.length;
          }
        });
      } catch (error) {
        console.error('Error using nodejieba for tokenization:', error);
        // 出错时使用备用方法
        return this.fallbackTokenize(text);
      }
    } else {
      // 使用备用分词方法
      return this.fallbackTokenize(text);
    }
    } else {
      // 使用正则表达式进行英文分词（同时处理混合文本）
      // 匹配中英文单词、数字、中文标点和英文标点
      const regex = /([\u4e00-\u9fa5]+)|([a-zA-Z0-9]+)|([^\s\w\u4e00-\u9fa5]+)/g;
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const word = match[0];
        const token: Token = {
          text: word,
          start: match.index,
          end: match.index + word.length,
          type: this.determineTokenType(word)
        };
        
        // 过滤停用词和空字符串
        if (word.trim() && !this.stopwords.has(word.trim())) {
          tokens.push(token);
        }
      }
    }
    
    return tokens;
  }

  /**
   * 确定词元类型
   */
  private determineTokenType(word: string): string {
    // 检查是否在自定义词典中
    if (this.customDict.has(word)) {
      return this.customDict.get(word)!;
    }
    
    // 数字
    if (/^\d+(\.\d+)?$/.test(word)) {
      return 'number';
    }
    
    // 英文单词
    if (/^[a-zA-Z]+$/.test(word)) {
      return 'english';
    }
    
    // 中文字符
    if (/^[\u4e00-\u9fa5]+$/.test(word)) {
      return 'chinese';
    }
    
    // 标点符号
    if (/^[^\w\s\u4e00-\u9fa5]+$/.test(word)) {
      return 'punctuation';
    }
    
    // 混合
    return 'mixed';
  }

  /**
   * 备用分词方法，当nodejieba不可用时使用
   */
  private fallbackTokenize(text: string): Token[] {
    const tokens: Token[] = [];
    
    // 简单的中英文混合分词
    // 中文按字符分词，英文按空格分词
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    const numbers = text.match(/\d+(\.\d+)?/g) || [];
    
    // 处理中文
    let currentPos = 0;
    chineseChars.forEach(char => {
      const start = text.indexOf(char, currentPos);
      if (start !== -1 && !this.stopwords.has(char)) {
        tokens.push({
          text: char,
          start,
          end: start + 1,
          type: 'unknown'
        });
        currentPos = start + 1;
      }
    });
    
    // 处理英文
    currentPos = 0;
    englishWords.forEach(word => {
      const start = text.indexOf(word, currentPos);
      if (start !== -1 && !this.stopwords.has(word.toLowerCase())) {
        tokens.push({
          text: word,
          start,
          end: start + word.length,
          type: this.determineTokenType(word)
        });
        currentPos = start + word.length;
      }
    });
    
    // 处理数字
    currentPos = 0;
    numbers.forEach(num => {
      const start = text.indexOf(num, currentPos);
      if (start !== -1) {
        tokens.push({
          text: num,
          start,
          end: start + num.length,
          type: 'number'
        });
        currentPos = start + num.length;
      }
    });
    
    // 按位置排序
    tokens.sort((a, b) => a.start - b.start);
    
    return tokens;
  }

  /**
   * 获取词频统计
   */
  getWordFrequency(tokens: Token[]): Map<string, number> {
    const frequency = new Map<string, number>();
    
    tokens.forEach(token => {
      if (token && token.text) {
        const word = token.text;
        if (frequency.has(word)) {
          frequency.set(word, frequency.get(word)! + 1);
        } else {
          frequency.set(word, 1);
        }
      }
    });
    
    return frequency;
  }

  /**
   * 计算TF-IDF（简化版，需要全局文档统计）
   */
  calculateTFIDF(token: Token, docFrequency: number, totalDocs: number): number {
    if (!token || !token.text) return 0;
    
    const tf = token.weight || 1;
    const idf = Math.log(totalDocs / (docFrequency + 1)) + 1;
    return tf * idf;
  }
}