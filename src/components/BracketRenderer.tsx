import React, { useState } from 'react';
import { NativeBracket, BracketMatch, BracketPlayer } from '../lib/bracket';
import { ShieldCheck, Trophy, Medal, X } from 'lucide-react';

interface BracketRendererProps {
  bracket: NativeBracket;
  onSetWinner: (matchId: string, winner: 'p1'|'p2') => void;
  printMode?: boolean;
  mode?: 'informar' | 'programar';
  onQueueMatch?: (match: BracketMatch) => void;
  onUnscheduleMatch?: (matchId: string) => void;
  programmedMatches?: Record<string, any>;
  matchQueue?: Set<string>;
}

export const BracketRenderer: React.FC<BracketRendererProps> = ({ 
   bracket, 
   onSetWinner, 
   printMode = false, 
   mode = 'informar', 
   onQueueMatch,
   onUnscheduleMatch,
   programmedMatches = {},
   matchQueue = new Set()
}) => {
  const [activeRRTab, setActiveRRTab] = useState<'standings' | 'matches'>('standings');

  if (!bracket) return null;

  const MATCH_H = 76;
  const MATCH_GAP = 32;
  const SPACING = MATCH_H + MATCH_GAP;

  const renderMatchCard = (match: BracketMatch | null) => {
    if (!match) return null;

    let p1Scores: string[] = [];
    let p2Scores: string[] = [];

    // Simple parsing assuming standard "p1-p2" format if match.winner is set
    if (match.score) {
       const sets = match.score.split(' ');
       sets.forEach(s => {
          if (s === 'W-O') {
             if (match.winner === 'p1') { p1Scores.push('W'); p2Scores.push('O'); }
             else { p1Scores.push('O'); p2Scores.push('W'); }
          } else {
             const pts = s.split('-');
             if (pts.length === 2) {
                p1Scores.push(pts[0]);
                p2Scores.push(pts[1]);
             } else {
                p1Scores.push(s);
                p2Scores.push(s);
             }
          }
       });
    }

    const normalizeName = (name?: string) => name ? name.trim().toUpperCase() : '';

    const formatPlayerName = (p: BracketPlayer | null, isP1: boolean, isWinner: boolean) => {
       if (p?.isBye) return <span className={`${printMode ? 'text-black font-bold' : 'text-emerald-400'} italic text-[14px] truncate`}>BYE</span>;
       
       if (p) {
          const nameStr = p.name;
          const isDoubles = nameStr.includes(' - ') || nameStr.includes(' / ');

          return (
            <div className="flex flex-1 items-center gap-1 min-w-0 h-full py-0.5">
              <div className={`${isWinner ? (printMode ? 'text-black font-black' : 'text-white font-black drop-shadow-md') : (printMode ? 'text-black font-semibold' : 'text-white font-bold drop-shadow-sm')} flex-1 min-w-0 flex flex-col justify-center`}>
                {isDoubles ? (
                   <div className="truncate text-[12px] leading-tight font-bold" title={nameStr.split(/\s*[-/]\s*/).join(' / ')}>
                      {nameStr.split(/\s*[-/]\s*/).join(' / ')}
                   </div>
                ) : (
                   <div className="truncate text-[14px] font-bold" title={nameStr}>
                      {nameStr}
                   </div>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                {isWinner && <span className="text-emerald-500 text-[12px] ml-1 flex-shrink-0">✅</span>}
              </div>
            </div>
          );
       }

       const source = isP1 ? match.p1Source : match.p2Source;
       // Clean source for presentation if it is "Por definir JUG X/Y"
       let dispSource = source || 'Por definir';
       if (dispSource.startsWith('Por definir JUG')) {
           dispSource = dispSource.replace('Por definir ', '');
       }
       return <span className={`italic text-[11px] font-bold truncate uppercase ${printMode ? 'text-gray-500' : 'text-slate-400'}`}>{dispSource}</span>;
    };

    const p1Real = match.p1 && !match.p1.isBye;
    const p2Real = match.p2 && !match.p2.isBye;
    const isBothTBD = (!p1Real && !p2Real);
    const hasBye = match.p1?.isBye || match.p2?.isBye;
    const isProgrammed = programmedMatches[match.id];
    const isQueued = matchQueue.has(match.id);
    const isFinished = !!match.winner;

    const isInformClickable = mode === 'informar' && p1Real && p2Real && !hasBye && !printMode;
    const isProgramarClickable = mode === 'programar' && !hasBye && !isFinished && !isProgrammed && !isQueued && !printMode;

    const isDesprogramarClickable = mode === 'programar' && (isProgrammed || isQueued) && !printMode;

    const borderInternal = printMode ? 'border-black border' : 'border-slate-700 transition-colors duration-200';
    const winnerBg = printMode ? 'bg-transparent border-t border-r border-b border-l-4 border-black font-black' : 'bg-sky-900/20 border-l-sky-500';
    const normalBgP = printMode ? 'bg-transparent border border-black' : 'bg-slate-800/80';
    const normalBgP2 = printMode ? 'bg-transparent border border-black' : 'bg-slate-800/40';
    
    const normalBg1 = isInformClickable ? 'bg-slate-800 group-hover:bg-slate-700' : isProgramarClickable ? 'bg-slate-800 group-hover:bg-slate-700/80' : isDesprogramarClickable ? 'bg-slate-800 group-hover:bg-slate-700/80' : normalBgP;
    const normalBg2 = isInformClickable ? 'bg-slate-800/50 group-hover:bg-slate-700/70' : isProgramarClickable ? 'bg-slate-800/50 group-hover:bg-slate-700/60' : isDesprogramarClickable ? 'bg-slate-800/50 group-hover:bg-slate-700/60' : normalBgP2;

    const cursorStyle = (() => {
       if (printMode) return `border border-black`;
       if (isInformClickable) return `cursor-pointer border box-border group bg-slate-800 border-sky-500/30 hover:border-sky-400 hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]`;
       if (isProgramarClickable) return `cursor-pointer border box-border group bg-slate-800 border-orange-500/30 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]`;
       if (isDesprogramarClickable) return `cursor-pointer border box-border group bg-slate-800 border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]`;
       
       if (hasBye || isFinished) return `border border-slate-700`;
       if (isQueued) return `border border-slate-600/80 pointer-events-none`;
       
       return `border border-slate-700`;
    })();

    // --- Star Logic (Acumulativas & Semáforo) ---
    let starCount = 1;
    if (bracket.groups && match.id.includes('_Grp_')) {
        starCount = (match.round !== undefined ? match.round : 0) + 1;
    } else {
        starCount = (match.round !== undefined ? match.round : 0) + 1;
    }
    
    const showStars = isQueued || isProgrammed;
    const starStr = showStars ? '⭐'.repeat(starCount) : '';
    let starColor = isFinished ? "text-slate-400" : "text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]";

    const formatDayKey = (dk: string) => {
       const pts = dk.split('-');
       if (pts.length !== 3) return dk;
       const y = parseInt(pts[0], 10);
       const mIndex = parseInt(pts[1], 10);
       const dIdx = parseInt(pts[2], 10);
       const dateObj = new Date(y, mIndex, dIdx);
       const dayOfWeek = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][dateObj.getDay()].toUpperCase();

       const d = pts[2].padStart(2, '0');
       const mNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
       return `${dayOfWeek}-${d}-${(mNames[mIndex] || pts[1]).toUpperCase()}`;
    };

    return (
       <div 
         onClick={() => {
            if (isInformClickable) {
               onSetWinner(match.id, 'p1'); // Trigger report score modal
            } else if (isProgramarClickable && onQueueMatch) {
               onQueueMatch(match);
            } else if (isDesprogramarClickable && onUnscheduleMatch) {
               onUnscheduleMatch(match.id);
            }
         }}
         className={`rounded shrink-0 flex flex-col w-[300px] h-[76px] relative z-10 transition-all ${cursorStyle} pt-[14px] ${isFinished && !printMode ? 'opacity-60 grayscale-[0.3]' : ''}`}>
          
          {/* Top Info Overlay: Stars + Scheduling */}
          <div className="absolute top-[2px] left-[6px] right-2 bg-transparent flex items-center justify-between z-20 pointer-events-none overflow-hidden">
             <div className="flex items-center justify-start flex-1 overflow-hidden">
                 {showStars && (
                     <span className={`text-[12px] leading-none flex-shrink-0 mr-1 tracking-widest ${starColor}`} title={`${starCount} Estrella(s)`}>
                        {starStr}
                     </span>
                 )}
                 {(isProgrammed || isQueued) && (
                    <span className={`text-[10px] font-bold tracking-widest uppercase truncate ${isFinished ? 'text-slate-400/80' : printMode ? 'text-black' : 'text-slate-300'}`}>
                       {isQueued && !isProgrammed ? 'EN ESPERA' : ''}
                       {isProgrammed && `C${isProgrammed.c} · ${formatDayKey(isProgrammed.dk)} · ${isProgrammed.h}`}
                    </span>
                 )}
             </div>
             {isProgrammed && !printMode && (
                 <div className="w-2 h-2 ml-1 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)] border border-emerald-400" title="Programado en cancha" />
             )}
          </div>

          {isInformClickable && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-sky-500 text-slate-950 font-bold text-[10px] uppercase px-3 py-1 rounded shadow-lg flex items-center gap-1 z-20 pointer-events-none">
                🏆 Informar
             </div>
          )}
          {isProgramarClickable && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 text-slate-950 font-bold text-[10px] uppercase px-3 py-1 rounded shadow-lg flex items-center gap-1 z-20 pointer-events-none whitespace-nowrap">
                <ShieldCheck className="w-3 h-3 text-slate-950" /> Pre-programar
             </div>
          )}
          {isDesprogramarClickable && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-red-600 font-bold text-[10px] uppercase px-3 py-1 rounded shadow-lg flex items-center gap-1 z-20 pointer-events-none whitespace-nowrap">
                <X className="w-3 h-3 text-red-600" /> Desprogramar
             </div>
          )}

          {/* Top Player (P1) */}
          <div className={`flex-1 flex justify-between items-stretch border-b ${borderInternal} transition-colors rounded-tr overflow-hidden ${match.winner === 'p1' ? `${winnerBg} border-l-2` : `border-l-2 border-l-transparent ${normalBg1}`}`}>
             <div className="flex items-center gap-1.5 px-2 flex-1 w-0">
               <span className={`text-[11px] font-mono w-3 text-center shrink-0 ${printMode ? 'text-black font-bold' : 'text-sky-400'}`}>{match.p1?.seed || ''}</span>
               {formatPlayerName(match.p1, true, match.winner === 'p1')}
             </div>
             
             {/* Score Boxes P1 */}
             <div className={`flex items-stretch border-l ${borderInternal} bg-transparent`}>
               {p1Scores.map((score, idx) => (
                  <div key={idx} className={`w-7 flex items-center justify-center border-l first:border-l-0 ${borderInternal} font-mono text-[13px] ${match.winner === 'p1' ? (printMode ? 'text-black font-black' : 'text-sky-300 font-black') : (printMode ? 'text-black font-bold' : 'text-white font-bold')}`}>
                     {score}
                  </div>
               ))}
             </div>
          </div>

          {/* Bottom Player (P2) */}
          <div className={`flex-1 flex justify-between items-stretch transition-colors rounded-br overflow-hidden ${match.winner === 'p2' ? `${winnerBg} border-l-2` : `border-l-2 border-l-transparent ${normalBg2}`}`}>
             <div className="flex items-center gap-1.5 px-2 flex-1 w-0">
               <span className={`text-[11px] font-mono w-3 text-center shrink-0 ${printMode ? 'text-black font-bold' : 'text-sky-400'}`}>{match.p2?.seed || ''}</span>
               {formatPlayerName(match.p2, false, match.winner === 'p2')}
             </div>
             
             {/* Score Boxes P2 */}
             <div className={`flex items-stretch border-l ${borderInternal} bg-transparent`}>
               {p2Scores.map((score, idx) => (
                  <div key={idx} className={`w-7 flex items-center justify-center border-l first:border-l-0 ${borderInternal} font-mono text-[13px] ${match.winner === 'p2' ? (printMode ? 'text-black font-black' : 'text-sky-300 font-black') : (printMode ? 'text-black font-bold' : 'text-white font-bold')}`}>
                     {score}
                  </div>
               ))}
             </div>
          </div>
       </div>
    );
  };

  const renderSingleElimTree = (rounds: BracketMatch[][], yOffset: number = 0, prefixTitle: string = 'Ronda', renderAwards?: (finalCenterY: number) => React.ReactNode) => {
    
    // Calculate the Y center of the final match in the tree
    const getFinalCenterY = () => {
       if (!rounds || rounds.length === 0) return 0;
       const getYAux = (r: number, m: number): number => {
          if (r === 0) return (SPACING / 2) + m * SPACING;
          return (getYAux(r - 1, m * 2) + getYAux(r - 1, m * 2 + 1)) / 2;
       }
       return getYAux(rounds.length - 1, 0);
    };

    return (
       <div className="flex gap-16 relative mt-[40px]">
          {rounds.map((round, rIndex) => {
             const getY = (r: number, m: number): number => {
               if (r === 0) return (SPACING / 2) + m * SPACING;
               return (getY(r - 1, m * 2) + getY(r - 1, m * 2 + 1)) / 2;
             };

             return (
               <div key={rIndex} className="relative shrink-0" style={{ width: '300px', height: round.length * SPACING * Math.pow(2, rIndex) }}>
                  <div className={`absolute ${printMode ? '-top-14 text-[14px]' : '-top-10 text-[13px]'} left-0 right-0 text-center font-black uppercase tracking-widest border-b pb-2 ${printMode ? 'text-black bg-white border-black font-[\'Arial\']' : 'text-white bg-slate-900 lg:bg-transparent border-slate-700'}`}>
                    {(() => {
                       const diff = rounds.length - 1 - rIndex;
                       if (diff === 0) return 'Final';
                       if (diff === 1) return 'Semifinal';
                       if (diff === 2) return 'Cuartos de final';
                       return `${prefixTitle} ${rIndex + 1}`;
                    })()}
                  </div>
                  {round.map((match, mIndex) => {
                     const centerY = getY(rIndex, mIndex);
                     const topPos = centerY - (MATCH_H / 2);

                     let connectorLine = null;
                     if (rIndex + 1 < rounds.length && match.nextMatchId) {
                       const nextY = getY(rIndex + 1, Math.floor(mIndex / 2));
                       const isP1 = match.isNextMatchP1;
                       const lnColor = printMode ? 'bg-black' : 'bg-slate-500';
                       const th = 'h-[2px]';
                       const tw = 'w-[2px]';
                       
                       connectorLine = (
                         <>
                           <div className={`absolute top-1/2 -right-8 w-8 ${th} ${lnColor}`} />
                           <div className={`absolute ${tw} ${lnColor} -right-8`}
                             style={{ 
                               top: isP1 ? '50%' : `calc(50% - ${Math.abs(nextY - centerY)}px)`,
                               height: `${Math.abs(nextY - centerY)}px`
                             }} 
                           />
                           <div className={`absolute -right-16 w-8 ${th} ${lnColor}`}
                             style={{
                               top: isP1 ? `calc(50% + ${nextY - centerY}px)` : `calc(50% - ${centerY - nextY}px)`
                             }}
                           />
                         </>
                       );
                     } else if (rIndex + 1 === rounds.length && renderAwards) {
                       connectorLine = (
                         <div className={`absolute top-1/2 -right-8 w-8 h-[2px] ${printMode ? 'bg-black' : 'bg-slate-500'}`} />
                       );
                     } else if (match.loserNextMatchId) {
                        // Rely on source
                     }

                     return (
                      <div key={mIndex} className="absolute w-full" style={{ top: `${topPos}px`, height: `${MATCH_H}px` }}>
                         {renderMatchCard(match)}
                         {connectorLine}
                      </div>
                    );
                  })}
               </div>
             );
          })}
          {renderAwards && (
             <div className="relative shrink-0" style={{ width: '280px' }}>
                {renderAwards(getFinalCenterY())}
             </div>
          )}
       </div>
    );
  };

  const renderDoubleAwards = (finalY: number, goldName: string, silverName: string) => {
      const offsetY = 56;
      const lnColor = printMode ? 'bg-black' : 'bg-slate-500';
      const th = 'h-[2px]';
      const tw = 'w-[2px]';
      return (
         <>
            {/* Connector Lines */}
            <div className={`absolute -left-16 w-8 ${th} ${lnColor}`} style={{ top: `${finalY}px` }} />
            <div className={`absolute -left-8 ${tw} ${lnColor}`} style={{ top: `${finalY - offsetY}px`, height: `${offsetY * 2}px` }} />
            <div className={`absolute -left-8 w-8 ${th} ${lnColor}`} style={{ top: `${finalY - offsetY}px` }} />
            <div className={`absolute -left-8 w-8 ${th} ${lnColor}`} style={{ top: `${finalY + offsetY}px` }} />

            {/* Gold */}
            <div className={`absolute w-full flex items-center transition-all duration-700 ${goldName !== 'Por definir' ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-4 grayscale'}`}
                 style={{ top: `${finalY - offsetY}px`, transform: 'translateY(-50%)' }}>
               <div className={`flex items-center gap-4 p-4 rounded-xl border w-full ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-amber-500/20 to-transparent border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
                  <Trophy className={`w-10 h-10 shrink-0 ${printMode ? 'text-black' : 'text-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.6)]'}`} />
                  <div className="min-w-0">
                     <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 truncate ${printMode ? 'text-black' : 'text-amber-500'}`}>1er Lugar - Copa de Oro</p>
                     <p className={`text-sm font-black truncate ${printMode ? 'text-black' : 'text-white'}`}>{goldName}</p>
                  </div>
               </div>
            </div>

            {/* Silver */}
            <div className={`absolute w-full flex items-center transition-all duration-700 ${silverName !== 'Por definir' ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-4 grayscale'}`}
                 style={{ top: `${finalY + offsetY}px`, transform: 'translateY(-50%)' }}>
               <div className={`flex items-center gap-4 p-4 rounded-xl border w-full ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-slate-300/10 to-transparent border-slate-400/30 shadow-[0_0_15px_rgba(203,213,225,0.05)]'}`}>
                  <Trophy className={`w-10 h-10 text-slate-300 shrink-0 ${printMode ? 'text-black' : 'drop-shadow-[0_0_15px_rgba(203,213,225,0.3)]'}`} />
                  <div className="min-w-0">
                     <p className={`text-[10px] uppercase tracking-widest mb-1 truncate font-bold ${printMode ? 'text-black' : 'text-slate-300'}`}>2do Lugar - Copa de Plata</p>
                     <p className={`text-sm font-black truncate ${printMode ? 'text-black' : 'text-white'}`}>{silverName}</p>
                  </div>
               </div>
            </div>
         </>
      );
  };

  const renderSingleAward = (finalY: number, bronzeName: string) => {
      const lnColor = printMode ? 'bg-black' : 'bg-slate-500';
      const th = 'h-[2px]';
      return (
         <>
            {/* Connector Lines */}
            <div className={`absolute -left-16 w-16 ${th} ${lnColor}`} style={{ top: `${finalY}px` }} />

            {/* Bronze */}
            <div className={`absolute w-full flex items-center transition-all duration-700 ${bronzeName !== 'Por definir' ? 'opacity-100 translate-x-0' : 'opacity-40 -translate-x-4 grayscale'}`}
                 style={{ top: `${finalY}px`, transform: 'translateY(-50%)' }}>
               <div className={`flex items-center gap-4 p-4 rounded-xl border w-full ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-orange-600/20 to-transparent border-orange-600/30 shadow-[0_0_15px_rgba(234,88,12,0.1)]'}`}>
                  <Medal className={`w-10 h-10 shrink-0 ${printMode ? 'text-black' : 'text-orange-500 drop-shadow-[0_0_15px_rgba(234,88,12,0.6)]'}`} />
                  <div className="min-w-0">
                     <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 truncate ${printMode ? 'text-black' : 'text-orange-500'}`}>3er Lugar - Med. Bronce</p>
                     <p className={`text-sm font-black truncate ${printMode ? 'text-black' : 'text-white'}`}>{bronzeName}</p>
                  </div>
               </div>
            </div>
         </>
      );
  };

  const getWinnerName = (match: BracketMatch | null | undefined) => {
     if (!match || !match.winner) return 'Por definir';
     return match.winner === 'p1' ? match.p1?.name : match.p2?.name;
  };
  const getLoserName = (match: BracketMatch | null | undefined) => {
     if (!match || !match.winner) return 'Por definir';
     return match.winner === 'p1' ? match.p2?.name : match.p1?.name;
  };

  // Determine Podium Info
  let gold = 'Por definir', silver = 'Por definir', bronze = 'Por definir';
  
  if (bracket.type === 'single elimination' || bracket.type === 'round robin') {
     const lastMatch = bracket.rounds[bracket.rounds.length - 1]?.[0];
     if (lastMatch?.winner) {
        gold = getWinnerName(lastMatch) || 'Por definir';
        silver = getLoserName(lastMatch) || 'Por definir';
     }
     if (bracket.thirdPlaceMatch?.winner) {
        bronze = getWinnerName(bracket.thirdPlaceMatch);
     }
  } else if (bracket.type === 'double elimination') {
     // Under Salinas Hybrid:
     // Gold is winner of Winner Bracket Final
     const wbFinal = bracket.rounds[bracket.rounds.length - 1]?.[0];
     if (wbFinal?.winner) {
        gold = getWinnerName(wbFinal) || 'Por definir';
        silver = getLoserName(wbFinal) || 'Por definir';
     }
     
     // Bronze (3rd Place) is winner of Loser Bracket Final
     if (bracket.loserRounds && bracket.loserRounds.length > 0) {
        const lbFinal = bracket.loserRounds[bracket.loserRounds.length - 1]?.[0];
        if (lbFinal?.winner) {
           bronze = getWinnerName(lbFinal) || 'Por definir';
        }
     }
  }

  return (
    <div className={`flex-1 relative p-8 lg:p-12 flex flex-col items-start min-w-max ${printMode ? 'bg-white overflow-visible' : 'overflow-auto bg-slate-900'}`}>
       
       {/* HEADER DEL TORNEO */}
       <div className={`flex flex-col items-start gap-2 mb-12 w-full border-b-2 pb-6 ${printMode ? 'border-black' : 'border-slate-700'}`}>
         <h1 className={`text-4xl lg:text-5xl font-black font-['Arial'] tracking-tight uppercase text-left ${printMode ? 'text-black' : 'text-white'}`}>
            {bracket.tournamentName ? `${bracket.tournamentName} (${bracket.id})` : bracket.id}
         </h1>
         <p className={`text-xl lg:text-2xl font-bold tracking-widest mt-2 uppercase text-left font-['Arial'] ${printMode ? 'text-gray-600' : 'text-slate-300'}`}>
            {bracket.type === 'single elimination' && 'Llave de Eliminación Directa'}
            {bracket.type === 'double elimination' && 'Llave de Doble Eliminación'}
            {bracket.type === 'round robin' && 'Fase de Grupos (Round Robin)'}
         </p>
       </div>

       {/* 1. TOP PODIUM UI */}
       {(bracket.type === 'round robin') && (
         <div className="mb-16 w-full max-w-4xl">
            <h3 className={`text-xl font-bold font-['Arial'] uppercase mb-6 ${printMode ? 'text-black' : 'text-white'}`}>Resultados Finales</h3>
            <div className="flex flex-wrap gap-4">
               {/* GOLD */}
               <div className={`flex-1 min-w-[200px] border rounded-lg p-4 flex items-center gap-4 ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-amber-600/20 to-slate-800 border-amber-500/30'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${printMode ? 'bg-transparent border-black' : 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'}`}>
                     <Trophy className={`w-6 h-6 ${printMode ? 'text-black' : 'text-amber-500'}`} />
                  </div>
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${printMode ? 'text-black' : 'text-amber-500/80'}`}>1er Lugar - Oro</p>
                     <p className={`text-sm font-bold ${gold === 'Por definir' ? (printMode ? 'text-gray-500' : 'text-slate-400') : (printMode ? 'text-black' : 'text-white')}`}>{gold}</p>
                  </div>
               </div>
               {/* SILVER */}
               <div className={`flex-1 min-w-[200px] border rounded-lg p-4 flex items-center gap-4 ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-slate-400/10 to-slate-800 border-slate-500/30'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${printMode ? 'bg-transparent border-black' : 'bg-slate-400/10 border-slate-500/50'}`}>
                     <Medal className={`w-6 h-6 ${printMode ? 'text-black' : 'text-slate-300'}`} />
                  </div>
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${printMode ? 'text-black' : 'text-slate-400'}`}>2do Lugar - Plata</p>
                     <p className={`text-sm font-bold ${silver === 'Por definir' ? (printMode ? 'text-gray-500' : 'text-slate-400') : (printMode ? 'text-black' : 'text-white')}`}>{silver}</p>
                  </div>
               </div>
               {/* BRONZE */}
               <div className={`flex-1 min-w-[200px] border rounded-lg p-4 flex items-center gap-4 ${printMode ? 'bg-transparent border-black' : 'bg-gradient-to-r from-orange-700/20 to-slate-800 border-orange-700/30'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border ${printMode ? 'bg-transparent border-black' : 'bg-orange-700/20 border-orange-700/50'}`}>
                     <Medal className={`w-6 h-6 ${printMode ? 'text-black' : 'text-orange-600'}`} />
                  </div>
                  <div>
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${printMode ? 'text-black' : 'text-orange-600'}`}>3er Lugar - Bronce</p>
                     <p className={`text-sm font-bold ${bronze === 'Por definir' ? (printMode ? 'text-gray-500' : 'text-slate-400') : (printMode ? 'text-black' : 'text-white')}`}>{bronze}</p>
                  </div>
               </div>
            </div>
         </div>
       )}

       {/* 2. ROUND ROBIN UI */}
       {bracket.type === 'round robin' && bracket.groups && (
          <div className="w-full max-w-[1200px] flex flex-col gap-16 mt-4 pb-16">
             {bracket.groups.map(group => {
                // Group matches by round
                const matchesByRound: { [r: number]: BracketMatch[] } = {};
                group.matches.forEach(m => {
                   if (!matchesByRound[m.round]) matchesByRound[m.round] = [];
                   matchesByRound[m.round].push(m);
                });
                const rounds = Object.keys(matchesByRound).map(Number).sort((a,b) => a - b);
                let globalMatchIndex = 1;

                return (
                   <div key={group.name} className="flex flex-col gap-16">
                      {bracket.groups!.length > 1 && (
                         <div className={`${printMode ? 'border-b-2 border-black pb-2' : 'bg-slate-800/80 border-b border-slate-700/50 px-4 py-3 rounded-t-xl'} flex items-center gap-2 mb-4`}>
                           <ShieldCheck className={`w-4 h-4 ${printMode ? 'text-black' : 'text-sky-400'}`}/>
                           <h4 className={`font-bold text-sm tracking-wide ${printMode ? 'text-black' : 'text-white'}`}>{group.name}</h4>
                         </div>
                      )}
                      
                      {/* Matches grouped by round */}
                      <div className="flex flex-col gap-10">
                         {rounds.map(r => (
                            <div key={r} className="flex flex-col gap-4 relative">
                               <h3 className={`text-[17px] font-black tracking-tight ${printMode ? 'text-black' : 'text-slate-100'}`}>Ronda {r + 1}</h3>
                               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6 items-start">
                                  {matchesByRound[r].map(m => {
                                     const currentMatchIdx = globalMatchIndex++;
                                     return (
                                        <div key={m.id} className="relative flex items-center justify-start xl:justify-center">
                                           {/* The absolute index to the left of the match card */}
                                           {!printMode && (
                                              <span className={`absolute left-0 xl:-left-8 text-[12px] sm:text-[13px] font-medium w-6 text-right leading-none text-slate-400`}>
                                                 {currentMatchIdx}
                                              </span>
                                           )}
                                           <div className="w-[300px] shrink-0 ml-8 xl:ml-0">
                                              {renderMatchCard(m)}
                                           </div>
                                        </div>
                                     );
                                  })}
                               </div>
                            </div>
                         ))}
                      </div>

                      {/* Standings Table */}
                      <div className={`w-full overflow-hidden rounded mt-4 ${printMode ? 'border-2 border-black bg-white' : 'border border-[#333333] bg-[#222222]'}`}>
                         <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left whitespace-nowrap min-w-[800px]">
                               <thead className={`text-[12px] font-semibold border-b ${printMode ? 'bg-[#f4f4f4] border-black text-black' : 'bg-[#292929] border-[#383838] text-slate-300'}`}>
                                  <tr>
                                     <th className="px-5 py-3.5">Rango</th>
                                     <th className="px-5 py-3.5">Participante</th>
                                     <th className="px-5 py-3.5 text-center font-mono">1. Partido G-P-E</th>
                                     <th className="px-5 py-3.5 text-center font-mono">2. Sets dif.</th>
                                     <th className="px-5 py-3.5 text-center font-mono">3. Juegos dif.</th>
                                     <th className="px-5 py-3.5 text-center font-mono">Sets G-P</th>
                                     <th className="px-5 py-3.5 text-center font-mono">4. Pts</th>
                                  </tr>
                               </thead>
                               <tbody className={`divide-y text-[13px] font-bold tracking-wide ${printMode ? 'divide-gray-200 text-[#444]' : 'divide-[#333333] text-[#e0e0e0]'}`}>
                                  {[...group.players].sort((a,b) => {
                                      const stA = bracket.standings?.[a.name] || { w:0, l:0, p:0, sw:0, sl:0, gw:0, gl:0 };
                                      const stB = bracket.standings?.[b.name] || { w:0, l:0, p:0, sw:0, sl:0, gw:0, gl:0 };
                                      if (stA.w !== stB.w) return stB.w - stA.w;
                                      const diffSetsA = (stA.sw || 0) - (stA.sl || 0);
                                      const diffSetsB = (stB.sw || 0) - (stB.sl || 0);
                                      if (diffSetsA !== diffSetsB) return diffSetsB - diffSetsA;
                                      const diffGamesA = (stA.gw || 0) - (stA.gl || 0);
                                      const diffGamesB = (stB.gw || 0) - (stB.gl || 0);
                                      if (diffGamesA !== diffGamesB) return diffGamesB - diffGamesA;
                                      return 0; // tie
                                  }).map((p, index) => {
                                     const st = bracket.standings?.[p.name] || { p:0, w:0, l:0, sw:0, sl:0, gw:0, gl:0 };
                                     const isSingleGroup = bracket.groups!.length === 1;
                                     const isTop2 = !isSingleGroup && index < 2;
                                     const defaultBg = index % 2 === 0 ? (printMode ? 'bg-white' : 'bg-[#2a2a2a]') : (printMode ? 'bg-[#fafafa]' : 'bg-[#303030]');
                                     let bgCls = defaultBg;
                                     if (isTop2) {
                                        bgCls = printMode ? 'bg-gray-100' : 'bg-[#1b2532] border-l-2 border-l-sky-500/50';
                                     } else if (isSingleGroup && index < 3 && !printMode) {
                                        if (index === 0) bgCls = 'bg-yellow-900/10 border-l-2 border-l-yellow-500/50';
                                        if (index === 1) bgCls = 'bg-slate-800/60 border-l-2 border-l-slate-400/50';
                                        if (index === 2) bgCls = 'bg-orange-900/10 border-l-2 border-l-orange-500/50';
                                     }
                                     
                                     return (
                                       <tr key={p.name} className={`transition-colors h-[48px] ${printMode ? '' : 'hover:bg-[#2e2e2e]'} ${bgCls}`}>
                                          <td className="px-5 py-1 text-center font-black">{index + 1}</td>
                                          <td className={`px-5 py-1 uppercase ${isTop2 && !printMode ? 'text-sky-300 font-bold' : (isSingleGroup && index === 0 && !printMode ? 'text-yellow-400 font-bold' : (isSingleGroup && index === 1 && !printMode ? 'text-slate-300 font-bold' : (isSingleGroup && index === 2 && !printMode ? 'text-orange-400 font-bold' : '')))}`}>{p.name}</td>
                                          <td className={`px-5 py-1 text-center font-medium tracking-widest ${printMode ? 'text-slate-600' : 'text-slate-400'}`}>{st.w} - {st.l} - 0</td>
                                          <td className={`px-5 py-1 text-center font-medium ${printMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                             {(st.sw || 0) - (st.sl || 0) > 0 ? '+' : ''}{(st.sw || 0) - (st.sl || 0)}
                                          </td>
                                          <td className={`px-5 py-1 text-center font-medium ${printMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                             {(st.gw || 0) - (st.gl || 0) > 0 ? '+' : ''}{(st.gw || 0) - (st.gl || 0)}
                                          </td>
                                          <td className={`px-5 py-1 text-center font-medium tracking-widest ${printMode ? 'text-slate-600' : 'text-slate-400'}`}>{st.sw || 0} - {st.sl || 0}</td>
                                          <td className="px-5 py-1 pr-6 font-black text-xs relative text-right">
                                            <div className={`flex items-center justify-end gap-3 ${isTop2 && !printMode ? 'text-sky-400' : (printMode ? 'text-slate-600' : 'text-slate-300')}`}>
                                              <span>{st.w * 3}</span>
                                              {isSingleGroup && index === 0 && <Trophy className={`w-4 h-4 ${printMode ? 'text-amber-500' : 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'}`} />}
                                              {isSingleGroup && index === 1 && <Trophy className={`w-4 h-4 ${printMode ? 'text-slate-400' : 'text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]'}`} />}
                                              {isSingleGroup && index === 2 && <Trophy className={`w-4 h-4 ${printMode ? 'text-orange-500' : 'text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'}`} />}
                                              {isSingleGroup && index > 2 && <div className="w-4 h-4 opacity-0" />}
                                              {!isSingleGroup && <div className="w-4 h-4 opacity-0" />}
                                            </div>
                                          </td>
                                       </tr>
                                     );
                                  })}
                               </tbody>
                            </table>
                         </div>
                      </div>
                   </div>
                );
             })}
             
             {/* ROUND ROBIN FASE FINAL (PLAYOFFS) */}
             {bracket.rounds && bracket.rounds.length > 0 && (
                <div className={`mt-8 flex flex-col relative items-start xl:p-8 rounded-2xl ${printMode ? 'pt-2' : 'pt-6 border bg-slate-800/20 border-sky-700/50 shadow-[0_0_30px_rgba(56,189,248,0.05)]'}`}>
                   <div className={`flex items-center gap-2 mb-2 ${printMode ? 'mb-10 text-xl text-black' : 'text-sm text-white'} font-black uppercase tracking-widest`}>
                      <Trophy className={`${printMode ? 'w-5 h-5' : 'w-4 h-4 text-sky-400'}`}/> Fase Final (Playoffs)
                   </div>
                   
                   <div className={`flex flex-col xl:flex-row gap-16 xl:gap-32 ${printMode ? 'mt-16' : 'mt-4'}`}>
                       <div className="flex relative items-center">
                          {renderSingleElimTree(bracket.rounds, 0, 'Ronda', (finalY) => renderDoubleAwards(finalY, gold, silver))}
                       </div>
                       
                       {/* 3rd place match */}
                       {bracket.thirdPlaceMatch && (
                          <div className="flex gap-12 lg:gap-16 relative items-start">
                             <div className="w-[300px] shrink-0">
                                <div className={`text-center text-[12px] font-black uppercase tracking-widest border-b pb-2 mb-4 ${printMode ? 'text-black bg-white border-black font-[\'Arial\']' : 'text-white bg-transparent border-slate-700'}`}>
                                  3er y 4to Lugar
                                </div>
                                <div className="relative" style={{ height: `120px` }}>
                                    <div className="absolute w-full top-1/2 -translate-y-1/2">
                                       {renderMatchCard(bracket.thirdPlaceMatch)}
                                    </div>
                                </div>
                             </div>
                             <div className="relative shrink-0 min-w-[280px] w-[280px]">
                                <div className="pb-2 mb-4 text-[10px] invisible">Spacer</div>
                                <div className="relative h-[120px]">
                                   {renderSingleAward(60, bronze)}
                                </div>
                             </div>
                          </div>
                       )}
                   </div>
                </div>
             )}
          </div>
       )}

       {/* 3. SINGLE ELIMINATION BRACKET */}
       {bracket.type === 'single elimination' && (
          <div className={`flex flex-col relative items-start ${printMode ? 'mt-12' : ''}`}>
             <div className="flex relative">
                {renderSingleElimTree(bracket.rounds, 0, 'Ronda', (finalY) => renderDoubleAwards(finalY, gold, silver))}
             </div>
             
             {/* 3rd place match */}
             {bracket.thirdPlaceMatch && (
                <div className="mt-12 flex gap-12 lg:gap-16 relative items-start">
                   <div className="w-[300px] shrink-0">
                      <div className={`text-center text-[12px] font-black uppercase tracking-widest border-b pb-2 mb-4 ${printMode ? 'text-black bg-white border-black font-[\'Arial\']' : 'text-white bg-transparent border-slate-700'}`}>
                        3er y 4to Lugar
                      </div>
                      <div className="relative" style={{ height: `120px` }}>
                          <div className="absolute w-full top-1/2 -translate-y-1/2">
                             {renderMatchCard(bracket.thirdPlaceMatch)}
                          </div>
                      </div>
                   </div>
                   <div className="relative shrink-0 min-w-[280px] w-[280px]">
                      <div className="pb-2 mb-4 text-[10px] invisible">Spacer</div>
                      <div className="relative h-[120px]">
                         {renderSingleAward(60, bronze)}
                      </div>
                   </div>
                </div>
             )}
          </div>
       )}

       {/* 4. DOUBLE ELIMINATION BRACKETS (DOBLE LLAVE SALINAS) */}
       {bracket.type === 'double elimination' && (
          <div className="flex flex-col gap-12 mt-8">
             <div className={`flex flex-col items-start xl:p-8 rounded-2xl relative ${printMode ? 'pt-2' : 'pt-6 border bg-slate-800/20 border-amber-700/50 shadow-[0_0_30px_rgba(245,158,11,0.05)]'}`}>
               <div className={`flex items-center gap-2 mb-2 ${printMode ? 'mb-10 text-xl text-black' : 'text-sm text-white'} font-black uppercase tracking-widest`}>
                  <Trophy className={`${printMode ? 'w-5 h-5' : 'w-4 h-4 text-amber-500'}`}/> Llave de Oro (Campeonato)
               </div>
               
               <div className={`flex relative ${printMode ? 'mt-16' : 'mt-4'}`}>
                  {renderSingleElimTree(bracket.rounds, 0, 'Ronda', (finalY) => renderDoubleAwards(finalY, gold, silver))}
               </div>
             </div>
             
             {bracket.loserRounds && bracket.loserRounds.length > 0 && (
               <div className={`flex flex-col items-start xl:p-8 rounded-2xl relative mt-8 ${printMode ? 'pt-2 mt-20 scale-[0.85] origin-top-left' : 'pt-6 border bg-slate-800/20 border-orange-700/50 shadow-[0_0_30px_rgba(234,88,12,0.05)]'}`}>
                 <div className={`flex items-center gap-2 mb-2 ${printMode ? 'mb-12 text-xl text-black' : 'text-sm text-white'} font-black uppercase tracking-widest`}>
                    <Medal className={`${printMode ? 'w-5 h-5' : 'w-4 h-4 text-orange-500'}`}/> Llave de Bronce (Repechaje)
                 </div>
                 
                 <div className={`flex relative ${printMode ? 'mt-16' : 'mt-4'}`}>
                    {renderSingleElimTree(bracket.loserRounds, 60, 'Repechaje', (finalY) => renderSingleAward(finalY, bronze))}
                 </div>
               </div>
             )}
          </div>
       )}
    </div>
  );
};
