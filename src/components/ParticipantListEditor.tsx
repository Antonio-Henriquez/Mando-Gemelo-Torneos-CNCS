import React, { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

interface ParticipantListEditorProps {
  value: string;
  onChange: (value: string) => void;
  matchMode: 'singles' | 'doubles';
}

export const ParticipantListEditor: React.FC<ParticipantListEditorProps> = ({ value, onChange, matchMode }) => {
  const [lines, setLines] = useState<{ id: string; p1: string; p2: string }[]>(() => {
    const initial = value.split('\n').map(line => {
      if (matchMode === 'doubles') {
        const pts = line.split(/\s*-\s*/);
        return { id: Math.random().toString(36).substring(2), p1: pts[0] || '', p2: pts[1] || '' };
      } else {
        return { id: Math.random().toString(36).substring(2), p1: line, p2: '' };
      }
    });
    if (initial.length === 0 || (initial.length === 1 && !initial[0].p1 && !initial[0].p2)) {
      return [{ id: Math.random().toString(36).substring(2), p1: '', p2: '' }];
    }
    return initial;
  });

  // Keep state updated if external value changes completely (e.g. category reset)
  useEffect(() => {
    if (value === '' && lines.length > 1) {
      setLines([{ id: Math.random().toString(36).substring(2), p1: '', p2: '' }]);
    }
  }, [value]);

  useEffect(() => {
    const text = lines
      .map(l => (matchMode === 'doubles' ? `${l.p1}${l.p2 ? ` - ${l.p2}` : ''}` : l.p1))
      .filter(t => t.trim() !== '' && t.trim() !== '-')
      .join('\n');
    onChange(text);
  }, [lines, matchMode]);

  const updateLine = (id: string, field: 'p1' | 'p2', val: string) => {
    setLines(prev => prev.map(l => (l.id === id ? { ...l, [field]: val } : l)));
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: Math.random().toString(36).substring(2), p1: '', p2: '' }]);
  };

  const removeLine = (id: string) => {
    setLines(prev => {
      const next = prev.filter(l => l.id !== id);
      return next.length > 0 ? next : [{ id: Math.random().toString(36).substring(2), p1: '', p2: '' }];
    });
  };

  const handlePaste = (e: React.ClipboardEvent, id: string, field: 'p1' | 'p2', index: number) => {
    const paste = e.clipboardData.getData('text');
    if (!paste) return;
    
    // If it contains newlines, then process it as a list bulk update
    if (paste.includes('\n')) {
      e.preventDefault();
      
      const newLinesText = paste.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      
      if (newLinesText.length === 0) return;
      
      setLines(prev => {
         const newLines = [...prev];
         
         if (matchMode === 'singles') {
            // Update the current line with the first pasted line
            newLines[index] = { ...newLines[index], p1: newLinesText[0] };
            
            // Add the rest
            for (let i = 1; i < newLinesText.length; i++) {
               newLines.splice(index + i, 0, { id: Math.random().toString(36).substring(2), p1: newLinesText[i], p2: '' });
            }
         } else {
             const handleLineStr = (str: string) => {
                 const parts = str.split(/\s*[-/]\s*|\t/);
                 return { p1: parts[0] || '', p2: parts[1] || '' };
             };
             
             const first = handleLineStr(newLinesText[0]);
             if (field === 'p1') {
                 newLines[index] = { ...newLines[index], p1: first.p1 };
                 if (first.p2 && !newLines[index].p2) newLines[index].p2 = first.p2;
             } else {
                 newLines[index] = { ...newLines[index], p2: first.p1 || first.p2 };
             }
             
             for (let i = 1; i < newLinesText.length; i++) {
                 const { p1, p2 } = handleLineStr(newLinesText[i]);
                 newLines.splice(index + i, 0, { id: Math.random().toString(36).substring(2), p1, p2 });
             }
         }
         
         return newLines;
      });
      
      // Attempt to focus the last input after render
      setTimeout(() => {
          const inputs = document.querySelectorAll(`input[data-field="p1"]`);
          (inputs[inputs.length - 1] as HTMLElement)?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: 'p1' | 'p2', index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (matchMode === 'doubles' && field === 'p1') {
        document.getElementById(`input-${id}-p2`)?.focus();
      } else {
        if (index === lines.length - 1) {
          addLine();
          setTimeout(() => {
            const inputs = document.querySelectorAll(`input[data-field="p1"]`);
            (inputs[inputs.length - 1] as HTMLElement)?.focus();
          }, 50);
        } else {
          const inputs = document.querySelectorAll(`input[data-field="p1"]`);
          (inputs[index + 1] as HTMLElement)?.focus();
        }
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex gap-2 px-1">
        <span className="flex-1 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
          {matchMode === 'doubles' ? 'JUGADOR 1' : 'NOMBRE DEL JUGADOR'}
        </span>
        {matchMode === 'doubles' && (
          <>
            <span className="w-4"></span>
            <span className="flex-1 text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              JUGADOR 2
            </span>
          </>
        )}
        <span className="w-6"></span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
        {lines.map((l, index) => (
          <div key={l.id} className="flex gap-2 items-center">
            <input
              id={`input-${l.id}-p1`}
              data-field="p1"
              type="text"
              value={l.p1}
              onChange={e => updateLine(l.id, 'p1', e.target.value)}
              onKeyDown={e => handleKeyDown(e, l.id, 'p1', index)}
              onPaste={e => handlePaste(e, l.id, 'p1', index)}
              placeholder={matchMode === 'doubles' ? 'Ej: Juan Pérez' : 'Ej: Juan Pérez'}
              className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-500/50 outline-none transition-colors"
            />
            {matchMode === 'doubles' && (
              <>
                <span className="text-slate-500 shrink-0 select-none font-bold">-</span>
                <input
                  id={`input-${l.id}-p2`}
                  data-field="p2"
                  type="text"
                  value={l.p2}
                  onChange={e => updateLine(l.id, 'p2', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, l.id, 'p2', index)}
                  onPaste={e => handlePaste(e, l.id, 'p2', index)}
                  placeholder="Ej: Diego Muñoz"
                  className="flex-1 bg-slate-800/40 border border-slate-700/50 rounded px-2.5 py-1.5 text-sm text-white focus:border-sky-500/50 outline-none transition-colors"
                />
              </>
            )}
            <button
              onClick={() => removeLine(l.id)}
              className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors shrink-0"
              title="Eliminar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addLine}
        className="mt-1 text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 self-start px-2 py-1.5 rounded hover:bg-sky-400/10 transition-colors"
      >
        <PlusCircle className="w-3.5 h-3.5" /> Agregar {matchMode === 'doubles' ? 'pareja' : 'jugador'}
      </button>
    </div>
  );
};
