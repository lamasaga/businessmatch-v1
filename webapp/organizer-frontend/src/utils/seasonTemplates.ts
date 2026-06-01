export interface MilestoneTemplate {
  title: string;
  milestone_type: 'lecture' | 'practice_match' | 'formal_match' | 'debrief' | 'assignment' | 'discussion';
}

export interface SeasonTemplate {
  name: string;
  description: string;
  milestones: MilestoneTemplate[];
}

export const SEASON_TEMPLATES: Record<string, SeasonTemplate> = {
  '4-week-intro': {
    name: '4 周商赛入门',
    description: '适合学期社团课，从理论到实践再到复盘',
    milestones: [
      { title: '第1周：理论课', milestone_type: 'lecture' },
      { title: '练习赛 #1', milestone_type: 'practice_match' },
      { title: '练习赛 #2', milestone_type: 'practice_match' },
      { title: '班级正式赛', milestone_type: 'formal_match' },
      { title: '复盘与作业', milestone_type: 'debrief' },
      { title: '课后反思作业', milestone_type: 'assignment' },
    ],
  },
  'single-week': {
    name: '单周体验课',
    description: '适合开放日/试听课，快速体验',
    milestones: [
      { title: '理论课：商业基础', milestone_type: 'lecture' },
      { title: '练习赛', milestone_type: 'practice_match' },
      { title: '复盘', milestone_type: 'debrief' },
    ],
  },
  'summer-bootcamp': {
    name: '暑期集训',
    description: '适合夏令营，密集训练',
    milestones: [
      { title: '理论课', milestone_type: 'lecture' },
      { title: '练习赛 #1', milestone_type: 'practice_match' },
      { title: '练习赛 #2', milestone_type: 'practice_match' },
      { title: '练习赛 #3', milestone_type: 'practice_match' },
      { title: '班级正式赛 #1', milestone_type: 'formal_match' },
      { title: '班级正式赛 #2', milestone_type: 'formal_match' },
      { title: '复盘与作业', milestone_type: 'debrief' },
      { title: '路演作业', milestone_type: 'assignment' },
    ],
  },
};

export function generateMilestonesFromTemplate(templateId: string): MilestoneTemplate[] {
  const template = SEASON_TEMPLATES[templateId];
  if (!template) return [];
  return template.milestones.map((m, i) => ({
    ...m,
    title: m.title,
    milestone_type: m.milestone_type,
  }));
}

export function getTemplateOptions() {
  return Object.entries(SEASON_TEMPLATES).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    milestoneCount: t.milestones.length,
  }));
}

export const MILESTONE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  lecture: { label: '📖 理论课', icon: 'BookOpen', color: 'text-blue-400' },
  practice_match: { label: '🎮 练习赛', icon: 'Gamepad2', color: 'text-emerald-400' },
  formal_match: { label: '🏆 正式赛', icon: 'Trophy', color: 'text-amber-400' },
  debrief: { label: '📊 复盘', icon: 'BarChart3', color: 'text-purple-400' },
  assignment: { label: '📝 作业', icon: 'FileText', color: 'text-pink-400' },
  discussion: { label: '💬 讨论', icon: 'MessageCircle', color: 'text-cyan-400' },
};

export const SEASON_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'text-gray-400' },
  recruiting: { label: '招募中', color: 'text-blue-400' },
  ongoing: { label: '进行中', color: 'text-emerald-400' },
  final: { label: '收官', color: 'text-amber-400' },
  closed: { label: '已结束', color: 'text-gray-400' },
};
