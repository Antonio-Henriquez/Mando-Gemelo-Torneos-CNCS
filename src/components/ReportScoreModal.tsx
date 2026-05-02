import React, { useState } from 'react';
import { Partido } from '../data';

interface ReportScoreModalProps {
  partido: Partido;
  onClose: () => void;
  onSave: (winner: 'p1' | 'p2' | null, score: string) => void;
}

export const ReportScoreModal: React.FC<ReportScoreModalProps> = ({ partido, onClose, onSave }) => {
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(partido.winner || null);
  
  // Set data: arrays of [j1_score, j2_score]
  const [s1, setS1] = useState<['', '']>(['', '']);
  const [s2, setS2] = useState<['', '']>(['', '']);
  const [s3, setS3] = useState<['', '']>(['', '']);

  const generateScoreString = () => {
     let str = '';
     if (s1[0] && s1[1]) str += `${s1[0]}-${s1[1]} `;
     if (s2[0] && s2[1]) str += `${s2[0]}-${s2[1]} `;
     if (s3[0] && s3[1]) str += `(${s3[0]}-${s3[1]})`;
     return str.trim();
  };

  const isSaveReady = winner !== null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600] backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-[420px] max-w-full shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex flex-col items-center gap-1">
             <div className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">{partido.cat}</div>
             <h3 className="font-sans text-xl font-bold text-white tracking-tight text-center">Informar Resultado</h3>
          </div>

          <div className="p-6">
             {/* Winner Selection */}
             <div className="mb-8">
               <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 text-center">🏆 SELECCIONAR GANADOR</label>
               <div className="flex gap-4">
                  <button 
                     onClick={() => setWinner('p1')}
                     className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${winner === 'p1' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}>
                     <span className="text-2xl mb-1">{winner === 'p1' ? '🏅' : '👤'}</span>
                     <span className="font-bold text-sm tracking-tight">{partido.j1}</span>
                  </button>
                  <button 
                     onClick={() => setWinner('p2')}
                     className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center ${winner === 'p2' ? 'border-sky-500 bg-sky-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}>
                     <span className="text-2xl mb-1">{winner === 'p2' ? '🏅' : '👤'}</span>
                     <span className="font-bold text-sm tracking-tight">{partido.j2}</span>
                  </button>
               </div>
             </div>

             {/* Score Input */}
             <div>
               <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-3 text-center">🎾 INGRESAR MARCADOR</label>
               <table className="w-full text-center border-collapse">
                 <thead>
                    <tr>
                      <th className="font-medium text-[11px] text-slate-500 pb-2">Jugador</th>
                      <th className="font-bold text-xs text-slate-300 pb-2">Set 1</th>
                      <th className="font-bold text-xs text-slate-300 pb-2">Set 2</th>
                      <th className="font-bold text-xs text-amber-500 pb-2">Super TB</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                      <td className={`py-1 text-right pr-4 text-xs font-bold truncate max-w-[120px] ${winner === 'p1' ? 'text-sky-400' : 'text-slate-300'}`}>{partido.j1}</td>
                      <td className="py-1"><input type="number" value={s1[0]} onChange={(e)=>setS1([e.target.value as any, s1[1]])} className="w-12 text-center bg-slate-950 border border-slate-700 rounded p-1 text-white text-lg font-mono outline-none focus:border-sky-500" /></td>
                      <td className="py-1"><input type="number" value={s2[0]} onChange={(e)=>setS2([e.target.value as any, s2[1]])} className="w-12 text-center bg-slate-950 border border-slate-700 rounded p-1 text-white text-lg font-mono outline-none focus:border-sky-500" /></td>
                      <td className="py-1"><input type="number" value={s3[0]} onChange={(e)=>setS3([e.target.value as any, s3[1]])} placeholder="10" className="w-12 text-center bg-amber-500/10 border border-amber-500/40 rounded p-1 text-amber-400 text-lg font-mono outline-none focus:border-amber-500 placeholder:text-amber-500/20" /></td>
                    </tr>
                    <tr>
                      <td className={`py-1 text-right pr-4 text-xs font-bold truncate max-w-[120px] ${winner === 'p2' ? 'text-sky-400' : 'text-slate-300'}`}>{partido.j2}</td>
                      <td className="py-1"><input type="number" value={s1[1]} onChange={(e)=>setS1([s1[0], e.target.value as any])} className="w-12 text-center bg-slate-950 border border-slate-700 rounded p-1 text-white text-lg font-mono outline-none focus:border-sky-500" /></td>
                      <td className="py-1"><input type="number" value={s2[1]} onChange={(e)=>setS2([s2[0], e.target.value as any])} className="w-12 text-center bg-slate-950 border border-slate-700 rounded p-1 text-white text-lg font-mono outline-none focus:border-sky-500" /></td>
                      <td className="py-1"><input type="number" value={s3[1]} onChange={(e)=>setS3([s3[0], e.target.value as any])} className="w-12 text-center bg-amber-500/10 border border-amber-500/40 rounded p-1 text-amber-400 text-lg font-mono outline-none focus:border-amber-500" /></td>
                    </tr>
                 </tbody>
               </table>
             </div>
          </div>

          <div className="bg-slate-950 p-4 border-t border-slate-800 flex gap-3 justify-end items-center">
             <button onClick={() => onSave(null, '')} className="mr-auto px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors font-bold">Limpiar Resultado</button>
             <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
             <button 
                disabled={!isSaveReady}
                onClick={() => {
                   onSave(winner, generateScoreString());
                }}
                className="px-6 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 rounded font-bold shadow-lg shadow-sky-500/20 disabled:opacity-50 transition-all flex items-center gap-2">
                Guardar Marcador
             </button>
          </div>
      </div>
    </div>
  );
};
