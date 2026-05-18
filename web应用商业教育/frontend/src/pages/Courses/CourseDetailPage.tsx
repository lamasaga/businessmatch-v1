import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Star,
  Users,
  Clock,
  BookOpen,
  CheckCircle,
  ShoppingCart,
  ChevronLeft,
  Play,
  Lock,
} from 'lucide-react';

const coursesData: Record<string, {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  instructor: string;
  rating: number;
  studentCount: number;
  duration: number;
  level: string;
  lessons: { id: string; title: string; duration: number; type: string; isPreview: boolean }[];
  syllabus: string[];
}> = {
  '1': {
    title: '国富论入门：从分工到财富',
    description: '以亚当·斯密的经典著作为线索，通过游戏化体验理解劳动分工、工资决定与财富积累的基本原理。课程包含理论讲解、案例分析、互动游戏三个模块，适合经济学初学者。',
    price: 99,
    originalPrice: 199,
    category: '经济学基础',
    instructor: '经济学教研组',
    rating: 4.8,
    studentCount: 1250,
    duration: 360,
    level: '入门',
    lessons: [
      { id: '1-1', title: '课程导论：为什么读《国富论》', duration: 15, type: 'video', isPreview: true },
      { id: '1-2', title: '亚当·斯密的时代背景', duration: 20, type: 'video', isPreview: true },
      { id: '1-3', title: '劳动分工：别针厂的奇迹', duration: 25, type: 'video', isPreview: false },
      { id: '1-4', title: '互动游戏：工坊经营模拟', duration: 30, type: 'game', isPreview: false },
      { id: '1-5', title: '工资理论：劳动的报酬', duration: 20, type: 'video', isPreview: false },
      { id: '1-6', title: '看不见的手：市场机制', duration: 25, type: 'video', isPreview: false },
      { id: '1-7', title: '财富积累：储蓄与投资', duration: 20, type: 'video', isPreview: false },
      { id: '1-8', title: '案例讨论：现代分工体系', duration: 30, type: 'text', isPreview: false },
      { id: '1-9', title: '互动游戏：市场竞争模拟', duration: 30, type: 'game', isPreview: false },
      { id: '1-10', title: '课程总结与思考', duration: 15, type: 'video', isPreview: false },
    ],
    syllabus: [
      '理解劳动分工如何提高生产效率',
      '掌握工资决定的基本原理',
      '理解市场机制的自动调节功能',
      '体验工坊经营模拟游戏',
      '将理论应用于现代商业分析',
    ],
  },
};

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const course = coursesData[id || ''];
  const [activeTab, setActiveTab] = useState<'content' | 'syllabus'>('content');
  const [isPurchased] = useState(false);

  if (!course) {
    return (
      <div className="text-center py-20">
        <GraduationCap className="w-16 h-16 mx-auto text-foreground-muted mb-4" />
        <p className="text-foreground-muted">课程不存在</p>
        <Link to="/courses" className="text-primary hover:underline mt-2 inline-block">
          返回课程中心
        </Link>
      </div>
    );
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-foreground-muted">
        <Link to="/courses" className="hover:text-primary transition-colors">课程中心</Link>
        <ChevronLeft className="w-4 h-4 rotate-180" />
        <span className="text-foreground">{course.title}</span>
      </div>

      {/* Course Header */}
      <div className="glass-card p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                {course.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-background-hover text-sm text-foreground-muted">
                {course.level}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">{course.title}</h1>
            <p className="text-foreground-secondary leading-relaxed mb-6">{course.description}</p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-foreground-muted">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span className="text-foreground font-medium">{course.rating}</span>
                分
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {course.studentCount} 学员
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(course.duration)}
              </span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {course.lessons.length} 课时
              </span>
            </div>
          </div>

          {/* Purchase Card */}
          <div className="lg:w-80 glass-card p-6 h-fit">
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold text-primary">¥{course.price}</span>
              {course.originalPrice && (
                <span className="text-lg text-foreground-muted line-through">
                  ¥{course.originalPrice}
                </span>
              )}
            </div>
            {course.originalPrice && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-danger/10 text-danger text-sm">
                限时优惠，省 ¥{course.originalPrice - course.price}
              </div>
            )}
            <button className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5" />
              立即购买
            </button>
            <button className="w-full py-3 rounded-xl border border-border-subtle text-foreground font-semibold hover:bg-background-hover transition-colors">
              加入购物车
            </button>
            <p className="text-xs text-foreground-muted text-center mt-3">
              购买后可永久观看，支持7天无理由退款
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('content')}
          className={`pb-4 text-sm font-medium transition-colors relative ${
            activeTab === 'content'
              ? 'text-primary'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          课程内容
          {activeTab === 'content' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`pb-4 text-sm font-medium transition-colors relative ${
            activeTab === 'syllabus'
              ? 'text-primary'
              : 'text-foreground-muted hover:text-foreground'
          }`}
        >
          学习目标
          {activeTab === 'syllabus' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'content' ? (
        <div className="space-y-3">
          {course.lessons.map((lesson, index) => (
            <div
              key={lesson.id}
              className={`glass-card p-4 flex items-center gap-4 ${
                !lesson.isPreview && !isPurchased ? 'opacity-70' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-background-hover flex items-center justify-center flex-shrink-0">
                {lesson.isPreview || isPurchased ? (
                  lesson.type === 'video' ? (
                    <Play className="w-5 h-5 text-primary" />
                  ) : lesson.type === 'game' ? (
                    <span className="text-lg">🎮</span>
                  ) : (
                    <BookOpen className="w-5 h-5 text-primary" />
                  )
                ) : (
                  <Lock className="w-5 h-5 text-foreground-muted" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground-muted">{index + 1}.</span>
                  <span className="font-medium text-foreground">{lesson.title}</span>
                  {lesson.isPreview && (
                    <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-xs">
                      试看
                    </span>
                  )}
                </div>
                <span className="text-sm text-foreground-muted">
                  {lesson.duration} 分钟 · {lesson.type === 'video' ? '视频' : lesson.type === 'game' ? '互动游戏' : '图文'}
                </span>
              </div>
              {lesson.isPreview && (
                <button className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors">
                  试看
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-8">
          <h3 className="text-lg font-bold text-foreground mb-4">学完本课程，你将能够：</h3>
          <div className="space-y-4">
            {course.syllabus.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                <span className="text-foreground-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
