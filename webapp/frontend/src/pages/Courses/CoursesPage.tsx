import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Star,
  Users,
  Clock,
  ChevronRight,
  Filter,
  BookOpen,
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail: string;
  category: string;
  tags: string[];
  instructor: string;
  rating: number;
  studentCount: number;
  lessonCount: number;
  duration: number;
  level: string;
}

const courses: Course[] = [
  {
    id: '1',
    title: '国富论入门：从分工到财富',
    description: '以亚当·斯密的经典著作为线索，通过游戏化体验理解劳动分工、工资决定与财富积累的基本原理',
    price: 99,
    originalPrice: 199,
    thumbnail: '📚',
    category: '经济学基础',
    tags: ['国富论', '斯密', '分工'],
    instructor: '经济学教研组',
    rating: 4.8,
    studentCount: 1250,
    lessonCount: 12,
    duration: 360,
    level: '入门',
  },
  {
    id: '2',
    title: '商业模拟实战：回合制策略',
    description: '完整体验回合制策略商赛，学习资源分配、战略预判与博弈推理',
    price: 149,
    thumbnail: '🎯',
    category: '商赛实战',
    tags: ['策略', '博弈', '决策'],
    instructor: '商赛教练团队',
    rating: 4.9,
    studentCount: 890,
    lessonCount: 8,
    duration: 240,
    level: '中级',
  },
  {
    id: '3',
    title: '创业生存：现金流管理',
    description: '模拟真实创业环境，理解现金流为王的核心法则，训练风险意识与危机决策',
    price: 129,
    thumbnail: '🔥',
    category: '创业管理',
    tags: ['现金流', '创业', '风险'],
    instructor: '创业导师',
    rating: 4.7,
    studentCount: 650,
    lessonCount: 10,
    duration: 300,
    level: '中级',
  },
  {
    id: '4',
    title: '博弈论基础与商业应用',
    description: '从囚徒困境到纳什均衡，理解博弈论在商业竞争中的核心应用',
    price: 199,
    originalPrice: 299,
    thumbnail: '♟️',
    category: '经济学基础',
    tags: ['博弈论', '竞争', '策略'],
    instructor: '数学建模团队',
    rating: 4.9,
    studentCount: 2100,
    lessonCount: 15,
    duration: 450,
    level: '进阶',
  },
  {
    id: '5',
    title: 'ESG 与可持续经营',
    description: '引入环保、社会、治理三维指标，理解可持续发展与商业成功的共生关系',
    price: 179,
    thumbnail: '🌱',
    category: 'ESG 专题',
    tags: ['ESG', '可持续', '伦理'],
    instructor: 'ESG 研究中心',
    rating: 4.6,
    studentCount: 420,
    lessonCount: 12,
    duration: 360,
    level: '进阶',
  },
  {
    id: '6',
    title: '宏观经济沙盘推演',
    description: '作为央行行长调控经济，理解通胀、紧缩、政策工具对微观企业的影响',
    price: 159,
    thumbnail: '🌊',
    category: '宏观经济学',
    tags: ['宏观', '政策', '周期'],
    instructor: '宏观经济学组',
    rating: 4.8,
    studentCount: 780,
    lessonCount: 10,
    duration: 300,
    level: '进阶',
  },
];

const categories = ['全部', '经济学基础', '商赛实战', '创业管理', 'ESG 专题', '宏观经济学'];
const levels = ['全部', '入门', '中级', '进阶'];

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');
  const [activeLevel, setActiveLevel] = useState('全部');

  const filteredCourses = courses.filter((course) => {
    const matchesCategory = activeCategory === '全部' || course.category === activeCategory;
    const matchesLevel = activeLevel === '全部' || course.level === activeLevel;
    const matchesSearch =
      searchQuery === '' ||
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesLevel && matchesSearch;
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}小时`;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <header className="text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10 mb-2">
          <GraduationCap className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">课程学院</h1>
        <p className="text-foreground-muted max-w-md mx-auto text-sm">
          从经济学基础到高阶商赛策略，系统化的商业教育课程体系
        </p>
      </header>

      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索课程..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Filter className="w-4 h-4" />
          <span>筛选</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-primary text-background'
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setActiveLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeLevel === level
                  ? 'bg-primary text-background'
                  : 'bg-background-secondary text-foreground-secondary hover:bg-background-hover'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCourses.map((course) => (
          <Link
            key={course.id}
            to={`/courses/${course.id}`}
            className="glass-card overflow-hidden hover:bg-background-hover/30 transition-all duration-300 group card-hover"
          >
            <div className="h-44 bg-gradient-to-br from-primary/10 to-amber-500/10 flex items-center justify-center text-5xl relative overflow-hidden">
              <span className="relative z-10">{course.thumbnail}</span>
              <div className="absolute inset-0 bg-gradient-to-t from-background-card to-transparent" />
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-lg bg-background-card/80 text-[10px] font-medium text-foreground">
                  {course.level}
                </span>
              </div>
              {course.originalPrice && (
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-1 rounded-lg bg-accent-rose/15 text-[10px] font-medium text-accent-rose">
                    限时优惠
                  </span>
                </div>
              )}
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {course.category}
                </span>
              </div>

              <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {course.title}
              </h3>
              <p className="text-sm text-foreground-secondary leading-relaxed mb-4 line-clamp-2">
                {course.description}
              </p>

              <div className="flex items-center gap-4 text-xs text-foreground-muted mb-4">
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  {course.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {course.studentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(course.duration)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-primary">¥{course.price}</span>
                  {course.originalPrice && (
                    <span className="text-xs text-foreground-muted line-through">
                      ¥{course.originalPrice}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-xs text-primary group-hover:translate-x-0.5 transition-transform font-medium">
                  查看详情
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
          <p className="text-foreground-muted">没有找到匹配的课程</p>
        </div>
      )}
    </div>
  );
}
