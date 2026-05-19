import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Bot, Send, Shield, MessageSquare } from 'lucide-react';
import { RIVAL_NEGOTIATION_SCRIPT } from '../../data/mockPlatform';

export default function PracticeNegotiationPage() {
  const { id } = useParams<{ id: string }>();
  const [messages, setMessages] = useState(RIVAL_NEGOTIATION_SCRIPT);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [
      ...m,
      { role: 'user' as const, text: input },
      {
        role: 'rival' as const,
        text: '收到。若你方承担 30% 干线物流，我方维持 ¥41 单价并可签三季度量备忘录。',
      },
    ]);
    setInput('');
  };

  return (
    <section className="space-y-6 animate-fade-in-up max-w-3xl mx-auto">
      <header className="glass-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-orange-400 font-medium">谈判练习</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">产业链谈判</h1>
        <p className="text-sm text-foreground-muted mt-1">赛制：{id} · 对手人格：稳健型供应商</p>
      </header>

      <div className="glass-card p-4 flex items-center gap-3 text-sm text-foreground-muted border border-accent-teal/15 bg-accent-teal/5">
        <Shield className="w-5 h-5 text-accent-teal flex-shrink-0" />
        <span>练习模式：可暂停请教导师；成交条款将记录至个人档案</span>
      </div>

      <div className="glass-card p-4 flex flex-col h-[420px]">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-subtle">
          <MessageSquare className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">谈判记录</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {messages.map((msg, i) => (
            <div
              key={`${i}-${msg.role}`}
              className={`text-sm p-3 rounded-xl max-w-[90%] ${
                msg.role === 'rival'
                  ? 'bg-orange-500/10 mr-auto border border-orange-500/10'
                  : msg.role === 'athena'
                  ? 'bg-primary/10 mx-auto text-center border border-primary/10'
                  : 'bg-background-hover ml-auto'
              }`}
            >
              {msg.role === 'rival' && <span className="text-[10px] text-orange-400 block mb-1 font-medium uppercase tracking-wider">对手</span>}
              {msg.role === 'athena' && <span className="text-[10px] text-primary block mb-1 font-medium uppercase tracking-wider">导师提示</span>}
              <span className="text-foreground-secondary">{msg.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="输入还价或条款..."
          className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-border-subtle text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary transition-colors"
        />
        <button type="button" onClick={send} className="px-5 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-500/90 transition-colors">
          <Send className="w-5 h-5" />
        </button>
      </div>

      <div className="text-center text-sm flex items-center justify-center gap-3">
        <Link to={`/games/${id}/play`} className="text-primary hover:text-primary/80 font-medium transition-colors">
          返回对局
        </Link>
        <span className="text-border-subtle">|</span>
        <Link to="/career/debrief/demo" className="text-primary hover:text-primary/80 font-medium transition-colors">
          查看复盘
        </Link>
      </div>
    </section>
  );
}
