import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  Tag,
  Eye,
  Clock,
  ChevronLeft,
  Share2,
  Bookmark,
} from 'lucide-react';

const articlesData: Record<string, {
  title: string;
  category: string;
  content: string;
  tags: string[];
  viewCount: number;
  readTime: number;
  relatedArticles: { id: string; title: string }[];
}> = {
  'wealth-of-nations': {
    title: '《国富论》导读',
    category: '经济学经典',
    content: `# 《国富论》导读

## 作品概述

《国富论》（The Wealth of Nations）全名为《国民财富的性质和原因的研究》，是苏格兰经济学家亚当·斯密于1776年出版的巨著。这本书被誉为现代经济学的奠基之作，对后世的经济学、政治学、哲学产生了深远影响。

## 核心思想

### 1. 劳动分工（Division of Labor）

斯密以**别针厂**为例，生动地说明了分工的威力：

> "一个工人独自工作，一天可能连1枚别针都做不出来。但如果将制作过程分为18道工序，由10个工人分别负责，一天可以生产48000枚别针。"

分工提高效率的三个原因：
- **技能提升**：工人专注于单一任务，熟练度迅速提高
- **时间节约**：减少了在不同任务之间切换的时间损失
- **机器发明**：专业化促进了工具和机器的创新

### 2. 看不见的手（Invisible Hand）

斯密提出了市场自我调节的著名隐喻：

> "每个人都在力图应用他的资本，来使其生产品能得到最大的价值。一般来说，他并不企图增进公共福利，也不知道他所增进的公共福利为多少。他所追求的仅仅是他个人的安乐，仅仅是他个人的利益。在这样做时，有一只**看不见的手**引导他去促进一种目标，而这种目标决不是他所追求的东西。"

这意味着：个人追求私利的行为，通过市场机制，无意中促进了社会整体福利。

### 3. 自由市场与有限政府

斯密主张：
- **自由贸易**：取消关税和贸易壁垒，让各国专注于自己具有比较优势的产业
- **有限政府**：政府的角色应限于国防、司法和公共设施
- **自然价格**：市场价格围绕自然价格（生产成本+合理利润）波动

## 工资与财富

### 工资的决定

斯密认为工资由以下因素决定：

1. **劳动力供需**：当劳动力需求大于供给时，工资上升；反之则下降
2. **生活必需品成本**：工资必须足以维持劳动者及其家庭的基本生活
3. **经济增长**：繁荣的经济体中，工资水平更高

> "工资是劳动的报酬，是劳动者维持生活所必需的收入。"

### 财富的来源

斯密认为国民财富来源于：
- **劳动生产力**：分工和专业化提高生产效率
- **资本积累**：储蓄转化为投资，扩大生产规模
- **土地与资源**：自然资源的有效利用

## 现代意义

《国富论》虽然出版于240多年前，但其核心思想至今仍然适用：

- **全球化**：自由贸易的理念推动了WTO等国际组织的建立
- **市场经济**：看不见的手仍是理解市场机制的核心框架
- **企业家精神**：个人追求利润与社会福利的和谐统一

## 思考题

1. 在现代社会中，劳动分工是否已经过度？专业化是否带来了新的问题？
2. "看不见的手"是否总是有效？市场失灵时政府应如何干预？
3. 斯密的工资理论如何解释当今的收入不平等问题？
`,
    tags: ['亚当·斯密', '古典经济学', '劳动分工', '自由市场'],
    viewCount: 3420,
    readTime: 15,
    relatedArticles: [
      { id: 'division-of-labor', title: '劳动分工理论' },
      { id: 'wage-theory', title: '工资理论' },
      { id: 'invisible-hand', title: '看不见的手' },
    ],
  },
  'division-of-labor': {
    title: '劳动分工理论',
    category: '经济学经典',
    content: `# 劳动分工理论

## 斯密的别针厂

亚当·斯密在《国富论》第一章就以**别针厂**为例，阐述了劳动分工的巨大威力。

### 原始生产方式

一个工人独自完成制作别针的全部工序：
- 拉直铁丝
- 切断
- 磨尖
- 制作针头
- 装配

**日产量：最多20枚别针**

### 分工后的生产方式

将工序分为18道，由10个工人分别负责：
- 工人1：拉直铁丝
- 工人2：切断
- 工人3：磨尖一端
- 工人4：磨尖另一端
- 工人5-6：制作针头
- 工人7：装配
- 工人8：抛光
- 工人9：包装
- 工人10：质量检查

**日产量：48000枚别针**

> "分工使劳动生产力提高了2400倍。"

## 分工提高效率的原因

### 1. 技能提升（Dexterity）

工人专注于单一任务，手眼协调和技巧迅速提高。从新手到专家的时间大大缩短。

### 2. 时间节约（Time Saving）

避免了在不同任务之间切换的时间损失：
- 不需要更换工具
- 不需要调整姿势
- 不需要重新集中注意力

### 3. 机器发明（Innovation）

专业化促进了工具和机器的改进：
- 工人对工序的深入理解，更容易想到改进方法
- 简单重复的任务更容易被机器替代

## 分工的局限

### 市场规模的限制

斯密指出：**"分工受市场范围的限制"**（The division of labor is limited by the extent of the market）。

- 小城镇的裁缝需要自己制作整件衣服
- 大城市的裁缝可以专注于扣眼、领子等单一工序

### 现代问题

分工也带来了一些负面影响：
- **工作单调**：重复性工作导致倦怠
- **技能狭窄**：过度专业化限制了职业发展
- **协调成本**：分工需要复杂的协调机制

## 游戏中的体现

在《国富论》教学游戏中，玩家可以亲身体验分工的效果：

- **阶段1**：1名工人完成全部工序，日产量10件
- **阶段2**：将工序分为3道，效率提升50%
- **阶段3**：进一步细分到6道工序，效率再提升80%
- **阶段4**：引入简单工具，效率翻倍

通过游戏，学生可以直观感受分工的收益递减和协调成本。
`,
    tags: ['效率', '专业化', '生产理论', '斯密'],
    viewCount: 2850,
    readTime: 12,
    relatedArticles: [
      { id: 'wealth-of-nations', title: '《国富论》导读' },
      { id: 'wage-theory', title: '工资理论' },
    ],
  },
  'wage-theory': {
    title: '工资理论',
    category: '微观经济学',
    content: `# 工资理论

## 斯密的工资观

亚当·斯密在《国富论》第八章"论劳动工资"中，系统阐述了工资的决定机制。

### 自然工资（Natural Wage）

斯密认为存在一个"自然工资"水平：

> "劳动工资有一定的标准，在相当长的时期内，即使是最低级的劳动，其工资也似乎不能低于这一标准。"

自然工资由以下因素决定：
1. **生活必需品成本**：维持劳动者及其家庭基本生活的费用
2. **社会习俗**：不同社会对生活水平的期望不同
3. **气候与地理**：寒冷地区需要更多的衣物和燃料

### 市场工资（Market Wage）

实际工资由劳动力市场的供需决定：

**工资上升的情况**：
- 经济繁荣，资本积累增加
- 新产业出现，劳动力需求大增
- 人口减少（如战争、瘟疫后）

**工资下降的情况**：
- 经济衰退，企业裁员
- 人口快速增长，劳动力供给过剩
- 技术替代，机器取代人工

> "工资的最低水平必须足以维持劳动者的生活，否则劳动力无法持续供给。"

## 工资与财富的关系

### 工资是财富的分配

斯密认为：
- **国民财富增加** → 资本积累 → 劳动力需求增加 → **工资上升**
- **工资上升** → 劳动者生活水平提高 → 消费能力增强 → **经济进一步繁荣**

这是一个**正反馈循环**。

### 三种收入形式

斯密将国民收入分为三种：
1. **工资**：劳动的报酬
2. **利润**：资本的报酬（承担风险的回报）
3. **地租**：土地的报酬

> "工资、利润和地租，是一切收入和一切可交换价值的三个根本来源。"

## 现代工资理论

### 边际生产力工资理论

现代经济学认为，工资等于劳动的边际生产力：

> 企业雇佣工人直到：最后一单位劳动的产出价值 = 工资

### 效率工资理论

高于市场均衡工资可能提高效率：
- 减少员工流失
- 提高工作积极性
- 吸引更高质量的劳动力

## 游戏中的体现

在《国富论》教学游戏中，工资机制如下：

- **基础工资**：每名工人每天需要支付维持生活的最低工资
- **市场波动**：当劳动力供给充足时，工资下降；当需求旺盛时，工资上升
- **技能溢价**：分工后的专业化工人可以要求更高工资
- **财富积累**：支付工资后的剩余利润，可用于再投资

玩家需要在**雇佣更多工人**和**支付更高工资**之间找到平衡。
`,
    tags: ['工资', '劳动力市场', '收入分配', '斯密'],
    viewCount: 2100,
    readTime: 14,
    relatedArticles: [
      { id: 'wealth-of-nations', title: '《国富论》导读' },
      { id: 'division-of-labor', title: '劳动分工理论' },
    ],
  },
};

export default function WikiArticlePage() {
  const { id } = useParams<{ id: string }>();
  const article = articlesData[id || ''];

  if (!article) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
        <p className="text-foreground-muted">文章不存在</p>
        <Link to="/wiki" className="text-primary hover:underline mt-2 inline-block">
          返回知识图谱
        </Link>
      </div>
    );
  }

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inQuote = false;
    let quoteContent = '';

    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <h1 key={index} className="text-3xl font-bold text-foreground mt-8 mb-4">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <h2 key={index} className="text-2xl font-bold text-foreground mt-8 mb-4">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <h3 key={index} className="text-xl font-bold text-foreground mt-6 mb-3">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        inQuote = true;
        quoteContent += line.replace('> ', '') + ' ';
      } else if (line.startsWith('- ')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <li key={index} className="ml-6 text-foreground-secondary leading-relaxed">
            {line.replace('- ', '')}
          </li>
        );
      } else if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <li key={index} className="ml-6 text-foreground-secondary leading-relaxed list-decimal">
            {line.replace(/^\d+\. /, '')}
          </li>
        );
      } else if (line.trim() === '') {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(<div key={index} className="h-4" />);
      } else if (line.startsWith('**') && line.endsWith('**')) {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <p key={index} className="text-foreground-secondary leading-relaxed">
            <strong className="text-foreground">{line.replace(/\*\*/g, '')}</strong>
          </p>
        );
      } else {
        if (inQuote) {
          elements.push(
            <blockquote key={`quote-${index}`} className="border-l-4 border-primary pl-4 py-2 my-4 bg-primary-soft/30 rounded-r-lg">
              <p className="text-foreground-secondary italic">{quoteContent.trim()}</p>
            </blockquote>
          );
          inQuote = false;
          quoteContent = '';
        }
        elements.push(
          <p key={index} className="text-foreground-secondary leading-relaxed">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <div className="animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted mb-6">
        <Link to="/wiki" className="hover:text-primary transition-colors">知识图谱</Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span>{article.category}</span>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-foreground">{article.title}</span>
      </div>

      {/* Article Header */}
      <div className="glass-card p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            {article.category}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-muted">
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {article.viewCount} 阅读
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {article.readTime} 分钟阅读
          </span>
          <div className="flex items-center gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-full bg-background-hover text-xs flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-foreground-secondary hover:bg-background-hover transition-colors text-sm">
            <Share2 className="w-4 h-4" />
            分享
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-subtle text-foreground-secondary hover:bg-background-hover transition-colors text-sm">
            <Bookmark className="w-4 h-4" />
            收藏
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Article Content */}
        <div className="lg:col-span-3">
          <div className="glass-card p-8">
            <div className="prose prose-invert max-w-none">
              {renderContent(article.content)}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Articles */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-foreground mb-4">相关文章</h3>
            <div className="space-y-3">
              {article.relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  to={`/wiki/${related.id}`}
                  className="block p-3 rounded-lg bg-background-hover/50 hover:bg-background-hover transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{related.title}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-foreground mb-4">学习路径</h3>
            <div className="space-y-3">
              <Link
                to="/wealth-of-nations"
                className="block p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <p className="text-sm font-medium text-primary">体验国富论游戏</p>
                <p className="text-xs text-foreground-muted mt-1">在工坊经营中理解分工与工资</p>
              </Link>
              <Link
                to="/games"
                className="block p-3 rounded-lg bg-background-hover/50 hover:bg-background-hover transition-colors"
              >
                <p className="text-sm font-medium text-foreground">参加商赛模拟</p>
                <p className="text-xs text-foreground-muted mt-1">将理论应用于实践</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
