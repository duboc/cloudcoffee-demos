import React from 'react';
import { Clock, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface HistoryItem {
  id: string;
  title: string;
  subtitle?: string;
  timestamp: string;
  imageUrl?: string;
}

interface HistoryPanelProps {
  title: string;
  items: HistoryItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function HistoryPanel({ title, items, selectedId, onSelect, onDelete }: HistoryPanelProps) {
  if (items.length === 0) return null;

  const formatTimestamp = (ts: string) => {
    try {
      const date = new Date(ts);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="border-t border-[#dadce0] mt-4 pt-4">
      <h3 className="text-xs font-bold text-[#5f6368] uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Clock size={12} />
        {title}
      </h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={cn(
              "p-2.5 rounded-lg border text-left cursor-pointer transition-all group flex items-center gap-2",
              selectedId === item.id
                ? "bg-[#e8f0fe] border-[#1967d2]"
                : "bg-white border-[#dadce0] hover:bg-[#f8f9fa]"
            )}
          >
            {item.imageUrl && (
              <img src={item.imageUrl} className="w-9 h-9 rounded object-cover flex-shrink-0" alt="" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#202124] truncate">{item.title}</p>
              {item.subtitle && (
                <p className="text-[10px] text-[#5f6368] truncate">{item.subtitle}</p>
              )}
              <p className="text-[10px] text-[#70757a]">{formatTimestamp(item.timestamp)}</p>
            </div>
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
