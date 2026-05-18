import { useState } from 'react';
import { Bot, Send, X, Sparkles } from 'lucide-react';

const quickReplies = [
  '如何提升战略能力？',
  '本周计划怎么安排？',
  'Daily Quest 有什么奖励？',
];

const athenaReplies: Record<string, string> = {
  default:
    '你好，我是 Athena，你的商业学习 AI 导师。有任何关于生涯规划、赛后复盘或学习建议的问题，都可以问我。',
  '如何提升战略能力？':
    '建议从三方面入手：1）完成「博弈论基础」课程；2）多参与回合制策略赛；3）每次对局后认真复盘，关注资源分配时机。',
  '本周计划怎么安排？':
    '根据你的五维雷达，协作能力相对较弱。本周建议：周一图谱学习、周三谈判练习、周五组队商赛。',
  'Daily Quest 有什么奖励？':
    '完成每日任务可获得经验值和连续打卡奖励。连续 7 天完成可解锁「持之以恒」徽章，经验加成 10%。',
};

interface AthenaPanelProps {
  floating?: boolean;
  defaultOpen?: boolean;
}

export default function AthenaPanel({ floating = true, defaultOpen = false }: AthenaPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'athena'; text: string }[]>([
    { role: 'athena', text: athenaReplies.default },
  ]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const reply = athenaReplies[text] ?? athenaReplies.default;
    setMessages((m) => [...m, { role: 'user', text }, { role: 'athena', text: reply }]);
    setInput('');
  };

  const panel = (
    <div
      className={`flex flex-col bg-background-secondary border border-border-subtle rounded-xl shadow-2xl overflow-hidden ${floating ? 'w-[360px] max-h-[480px]' : 'w-full min-h-[320px]'}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Athena</p>
            <p className="text-[10px] text-primary/80">AI 生涯导师</p>
          </div>
        </div>
        {floating && (
          <button type="button" onClick={() => setOpen(false)} className="p-1 rounded hover:bg-background-hover">
            <X className="w-4 h-4 text-foreground-muted" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[280px]">
        {messages.map((msg, i) => (
          <div
            key={`${i}-${msg.text.slice(0, 12)}`}
            className={`text-sm leading-relaxed px-3 py-2.5 rounded-lg max-w-[95%] ${
              msg.role === 'athena'
                ? 'bg-primary/8 text-foreground-secondary mr-auto border border-primary/10'
                : 'bg-background-hover text-foreground ml-auto'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {quickReplies.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="text-[11px] px-2.5 py-1 rounded-full bg-background-hover text-foreground-muted hover:text-primary hover:bg-primary/10 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
      <div className="p-3 border-t border-border-subtle flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="输入问题..."
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-border-subtle text-sm text-foreground focus:outline-none focus:border-primary"
        />
        <button type="button" onClick={() => send(input)} className="p-2 rounded-lg bg-primary text-background hover:bg-primary/90 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (!floating) return panel;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-primary to-amber-600 text-background shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-medium text-sm">Athena</span>
        </button>
      )}
      {open && <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">{panel}</div>}
    </>
  );
}
