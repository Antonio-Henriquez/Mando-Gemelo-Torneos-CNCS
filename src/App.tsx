import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Calendar as CalendarIcon, Users, LayoutGrid, ChevronDown, ChevronLeft, ChevronRight, GripVertical, AlertTriangle, CheckCircle2, Pencil, X, PlusCircle, Trash2, ShieldCheck } from 'lucide-react';
import {
  DIAS_CAL, DIAS_FULL, MESES_ES, DIAS_TORNEO, SEMANAS, HORAS_BASE,
  CATEGORIAS, dayKey, slotKey, Partido, getInitialPartidos, catColor, jugsArr, sim, horaMin
} from './data';
import { generateBracket, NativeBracket, setMatchWinner, renamePlayerInBracket } from './lib/bracket';
import { BracketRenderer } from './components/BracketRenderer';
import { ReportScoreModal } from './components/ReportScoreModal';
import { ParticipantListEditor } from './components/ParticipantListEditor';
import { toJpeg } from 'html-to-image';

export default function App() {
  const [view, setView] = useState<'prog' | 'jugadores' | 'llaves' | 'crear'>('prog');
  const [calMonth, setCalMonth] = useState(4);
  const [calYear, setCalYear] = useState(2026);
  const [fechaActiva, setFechaActiva] = useState({ y: 2026, m: 4, d: 2 });
  const [calOpen, setCalOpen] = useState(false);
  const [diasHabilitados, setDiasHabilitados] = useState<Set<string>>(new Set());
  const [canchas, setCanchas] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true, 4: true, 5: true });
  const [partidos, setPartidos] = useState<Record<string, Partido>>(() => {
    const saved = localStorage.getItem('cncs_partidos');
    if (saved) return JSON.parse(saved);
    return getInitialPartidos();
  });
  const [categorias, setCategorias] = useState<Record<string, {type: string, players: {name: string, seed: number}[]}>>(() => {
    const saved = localStorage.getItem('cncs_categorias');
    if (saved) return JSON.parse(saved);
    return CATEGORIAS;
  });
  const [matchQueue, setMatchQueue] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cncs_match_queue');
    if (saved) return new Set(JSON.parse(saved));
    return new Set<string>();
  });

  useEffect(() => {
    localStorage.setItem('cncs_partidos', JSON.stringify(partidos));
  }, [partidos]);

  useEffect(() => {
    localStorage.setItem('cncs_categorias', JSON.stringify(categorias));
  }, [categorias]);

  useEffect(() => {
    localStorage.setItem('cncs_match_queue', JSON.stringify(Array.from(matchQueue)));
  }, [matchQueue]);

  const [catFiltro, setCatFiltro] = useState<string | null>(null);
  const [rondaFiltro, setRondaFiltro] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string, type: 'err' | 'ok' | 'warn' } | null>(null);
  
  const [dragItem, setDragItem] = useState<{ type: 'grilla' | 'pend', payload: any } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [editRondaModal, setEditRondaModal] = useState<string | null>(null);
  const [selModal, setSelModal] = useState<{ c: number, h: string } | null>(null);
  const [selSearch, setSelSearch] = useState('');
  const [selPend, setSelPend] = useState<any | null>(null);
  const [selRondaNew, setSelRondaNew] = useState('1era Ronda');
  const [catDropOpen, setCatDropOpen] = useState(false);
  const [rondaDropOpen, setRondaDropOpen] = useState(false);
  const [selRondaDropOpen, setSelRondaDropOpen] = useState(false);
  const [editRondaVal, setEditRondaVal] = useState('1era Ronda');
  const [editRondaDropOpen, setEditRondaDropOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [reportScoreModal, setReportScoreModal] = useState<{ 
    k: string, 
    p: Partido, 
    winner: 'p1' | 'p2' | null, 
    score: string 
  } | null>(null);
  
  const [printMode, setPrintMode] = useState(false);
  const [bracketMode, setBracketMode] = useState<'informar' | 'programar'>('informar');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforePrint = () => setPrintMode(true);
    const handleAfterPrint = () => setPrintMode(false);

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
     if (e.target instanceof Element && e.target.closest('button, .cursor-pointer')) return;
     if (e.pointerType !== 'mouse') return; // let native touch scrolling handle it
     if (printMode) return;
     
     setIsPanning(true);
     setPanStart({ x: e.clientX, y: e.clientY });
     if (containerRef.current) {
        setScrollStart({
           left: containerRef.current.scrollLeft,
           top: containerRef.current.scrollTop
        });
     }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
     if (!isPanning || !containerRef.current) return;
     const dx = e.clientX - panStart.x;
     const dy = e.clientY - panStart.y;
     containerRef.current.scrollLeft = scrollStart.left - dx;
     containerRef.current.scrollTop = scrollStart.top - dy;
  };

  const handlePointerUp = () => {
     setIsPanning(false);
  };

  // WIZARD STATE
  const [creatorName, setCreatorName] = useState('Glorias Navales 2026');
  const [creatorCats, setCreatorCats] = useState<{ id: number, name: string, type: string, matchMode?: 'singles'|'doubles', players: string }[]>([
    { id: 1, name: 'Singles Honor', type: 'single elimination', matchMode: 'singles', players: 'Juan Pérez\nMatías Silva\nDiego Muñoz\nCarlos Ruiz' }
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmNuevoTorneo, setConfirmNuevoTorneo] = useState(false);
  const [catToDelete, setCatToDelete] = useState<string | null>(null);
  const [confirmVaciar, setConfirmVaciar] = useState(false);

  // DRAG & DROP JUGADORES STATE
  const [dragPlayer, setDragPlayer] = useState<{ cat: string, index: number } | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<{ cat: string, index: number } | null>(null);
  // DRAG & DROP CATEGORIAS STATE
  const [dragCat, setDragCat] = useState<string | null>(null);
  const [dragOverCat, setDragOverCat] = useState<string | null>(null);
  // EDICION DE JUGADORES
  const [editingPlayer, setEditingPlayer] = useState<{ cat: string, index: number, name: string } | null>(null);

  // NATIVE BRACKET STATE
  const [nativeBrackets, setNativeBrackets] = useState<Record<string, NativeBracket>>(() => {
    const saved = localStorage.getItem('cncs_native_brackets');
    if (saved) return JSON.parse(saved);
    return {};
  });
  const [selectedNativeCat, setSelectedNativeCat] = useState<string | null>(null);

  const recompilarLlave = (catName: string, playersArr: {name: string, seed: number}[], type: string) => {
      const newBrack = generateBracket(catName, playersArr, type, creatorName);
      // Mantener resultados actuales si es posible (simplificado, se limpia la llave al cambiar el orden/nombre)
      setNativeBrackets(prev => ({ ...prev, [catName]: newBrack }));
  };

  // Auto-generate missing native brackets based on user's current directory
  useEffect(() => {
    let changed = false;
    const current = { ...nativeBrackets };
    Object.keys(categorias).forEach(catName => {
      if (!current[catName] && categorias[catName].players.length >= 2) {
         current[catName] = generateBracket(catName, categorias[catName].players, categorias[catName].type, creatorName);
         changed = true;
      }
    });
    if (changed) {
      setNativeBrackets(current);
    }
  }, [categorias, nativeBrackets]);

  // Persist native brackets
  useEffect(() => {
    localStorage.setItem('cncs_native_brackets', JSON.stringify(nativeBrackets));
  }, [nativeBrackets]);
  
  // Keep selected cat valid
  useEffect(() => {
    if (view === 'llaves' && !selectedNativeCat && Object.keys(nativeBrackets).length > 0) {
      setSelectedNativeCat(Object.keys(nativeBrackets)[0]);
    }
  }, [view, nativeBrackets, selectedNativeCat]);

  // Keyboard navigation for categories
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (view !== 'llaves') return;
      
      const cats = Object.keys(nativeBrackets);
      if (cats.length <= 1) return;
      
      const currentIndex = cats.indexOf(selectedNativeCat || '');
      
      if (e.key === 'ArrowLeft') {
        const nextIndex = currentIndex > 0 ? currentIndex - 1 : cats.length - 1;
        setSelectedNativeCat(cats[nextIndex]);
      } else if (e.key === 'ArrowRight') {
        const nextIndex = currentIndex < cats.length - 1 ? currentIndex + 1 : 0;
        setSelectedNativeCat(cats[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, nativeBrackets, selectedNativeCat]);

  const handleNuevoTorneo = () => {
    if (Object.keys(categorias).length > 0 || Object.keys(nativeBrackets).length > 0) {
      setConfirmNuevoTorneo(true);
      return;
    }
    
    executeNuevoTorneo();
  };

  const executeNuevoTorneo = () => {
    // Reset data
    setCategorias({});
    setPartidos({});
    setNativeBrackets({});
    setCreatorName('');
    setCreatorCats([{ id: Date.now(), name: '', type: 'single elimination', matchMode: 'singles', players: '' }]);
    setConfirmNuevoTorneo(false);
    
    setView('crear');
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const showToast = (msg: string, type: 'err' | 'ok' | 'warn' = 'err') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  };

  const curDK = dayKey(fechaActiva.y, fechaActiva.m, fechaActiva.d);
  const activas = [1, 2, 3, 4, 5].filter(c => canchas[c]);
  const horasActivas = [...HORAS_BASE, ...(canchas[5] ? ['19:00'] : [])];
  
  // Función auxiliar para normalizar nombres y comparar sin considerar categoría ni tildes
  const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  
  const isGenericPlayerName = (name: string) => {
      const n = name.toUpperCase();
      return n.includes('POR DEFINIR') || n.includes('GANADOR') || n.includes('PERDEDOR') || n.includes('GRUPO') || n.includes('JUG') || n === 'BYE';
  };

  const programmedMatchesByMatchId = React.useMemo(() => {
    const map: Record<string, any> = {};
    (Object.values(partidos) as any[]).forEach(p => {
       if (p.matchId) map[p.matchId] = p;
    });
    return map;
  }, [partidos]);

  const programmedPlayersSet = React.useMemo(() => {
    const set = new Set<string>();
    (Object.values(partidos) as any[]).forEach(p => {
       const j1 = normalizeName(p.j1);
       if (j1 && !isGenericPlayerName(j1)) set.add(j1);
       const j2 = normalizeName(p.j2);
       if (j2 && !isGenericPlayerName(j2)) set.add(j2);
    });
    return set;
  }, [partidos]);

  const fatiguedPlayersSet = React.useMemo(() => {
    const counts = new Map<string, number>();
    (Object.values(partidos) as any[]).forEach(p => {
       if (p.dk === curDK) {
           const j1 = normalizeName(p.j1);
           const j2 = normalizeName(p.j2);
           if (j1 && !isGenericPlayerName(j1)) counts.set(j1, (counts.get(j1) || 0) + 1);
           if (j2 && !isGenericPlayerName(j2)) counts.set(j2, (counts.get(j2) || 0) + 1);
       }
    });
    const set = new Set<string>();
    counts.forEach((v, k) => { if (v > 1) set.add(k); });
    return set;
  }, [partidos, curDK]);

  const tiredPlayersSet = React.useMemo(() => {
    const set = new Set<string>();
    (Object.values(partidos) as Partido[]).forEach(p => {
       // Si el partido fue hoy y ya tiene ganador, sumamos a los jugadores como cansados
       if (p.dk === curDK && p.winner) {
           const j1 = normalizeName(p.j1);
           const j2 = normalizeName(p.j2);
           if (j1 && !isGenericPlayerName(j1)) set.add(j1);
           if (j2 && !isGenericPlayerName(j2)) set.add(j2);
       }
    });
    return set;
  }, [partidos, curDK]);

  const detectarCfs = () => {
    const dk = curDK;
    const cfKeys: Record<string, { tipo: 'mismo' | 'bloque', jgs: string[], fatiga?: boolean }> = {};
    const jugMap: Record<string, {h: string, min: number, key: string, c: number}[]> = {};
    
    horasActivas.forEach(h => {
      activas.forEach(c => {
        const k = slotKey(dk, c, h);
        const p = partidos[k];
        if (!p) return;
        jugsArr(p.j1, p.j2).forEach(jug => {
          const normalJug = normalizeName(jug);
          // Omit if "Por definir"
          if (normalJug.includes('POR DEFINIR') || normalJug === 'BYE') return;

          if (!jugMap[normalJug]) jugMap[normalJug] = [];
          jugMap[normalJug].push({h, min: horaMin(h), key: k, c});
        });
      });
    });

    Object.entries(jugMap).forEach(([jug, slots]) => {
      // Regla máximo 2 partidos (Fatiga)
      if (slots.length > 2) {
        slots.forEach(({key}) => {
          if (!cfKeys[key]) cfKeys[key] = { tipo: 'bloque', jgs: [], fatiga: true };
          if (!cfKeys[key].jgs.includes(jug)) cfKeys[key].jgs.push(jug);
          cfKeys[key].fatiga = true;
        });
      }
      // Revisar pares (Simultaneidad y Descanso)
      for (let i = 0; i < slots.length; i++) {
        for (let j = i + 1; j < slots.length; j++) {
          const diff = Math.abs(slots[i].min - slots[j].min);
          const tipo = diff === 0 ? 'mismo' : (diff < 120 ? 'bloque' : null);
          if (!tipo) continue;
          [slots[i].key, slots[j].key].forEach(k => {
            if (!cfKeys[k]) cfKeys[k] = { tipo, jgs: [] };
            if (!cfKeys[k].jgs.includes(jug)) cfKeys[k].jgs.push(jug);
            if (tipo === 'mismo') cfKeys[k].tipo = 'mismo';
          });
        }
      }
    });

    return cfKeys;
  };

  const cfMap = detectarCfs();
  const cfsValues = Object.values(cfMap);
  const rojos = cfsValues.filter(v => v.tipo === 'mismo');
  const naranjas = cfsValues.filter(v => v.tipo === 'bloque');
  const cfCount = Object.keys(cfMap).length;

  const getProgramados = () => {
    const prog = new Set<string>();
    Object.values(partidos).forEach((p: Partido) => { 
      if (p.matchId) {
        prog.add(String(p.matchId));
      } else {
        prog.add(`${p.cat}||${p.j1}`); 
        prog.add(`${p.cat}||${p.j2}`); 
      }
    });
    return prog;
  };

  const getNativePendientes = () => {
    const pend: any[] = [];
    (Object.values(nativeBrackets) as NativeBracket[]).forEach(bracket => {
      
      const processMatch = (match: any, rondaNombre: string, starCount: number = 1) => {
         const p1Real = match.p1 && !match.p1.isBye;
         const p2Real = match.p2 && !match.p2.isBye;
         
         const isMatchWithBye = (match.p1?.isBye || match.p2?.isBye);

         // Only show matched explicitely queued by the user
         if (!match.winner && !isMatchWithBye && matchQueue.has(match.id)) {
            const j1Name = p1Real ? match.p1.name : (match.p1Source || 'Por definirse');
            const j2Name = p2Real ? match.p2.name : (match.p2Source || 'Por definirse');

            pend.push({
              cat: bracket.id,
              j1: j1Name,
              j2: j2Name,
              ronda: rondaNombre,
              matchId: match.id,
              rIndex: match.round,
              mIndex: match.matchIndex,
              starCount: starCount,
              isQfOrLater: match.round >= 2 // basic proxy
            });
         }
      };

      const getRoundName = (roundIndex: number, totalRounds: number) => {
         const diff = totalRounds - 1 - roundIndex;
         if (diff === 0) return 'Final';
         if (diff === 1) return 'Semi-Final';
         if (diff === 2) return 'Cuartos de Final';
         return `Ronda ${roundIndex + 1}`;
      };

      if (bracket.rounds) {
        const totalR = bracket.rounds.length;
        bracket.rounds.forEach(round => round.forEach(match => {
           processMatch(match, getRoundName(match.round, totalR), match.round + 1);
        }));
      }
      if (bracket.loserRounds) {
        bracket.loserRounds.forEach(round => round.forEach(match => processMatch(match, `Ronda Repechaje ${match.round + 1}`, match.round + 1)));
      }
      if (bracket.thirdPlaceMatch) processMatch(bracket.thirdPlaceMatch, '3er y 4to Lugar', bracket.rounds ? bracket.rounds.length : 2);
      if (bracket.grandFinal) processMatch(bracket.grandFinal, 'Gran Final', bracket.rounds ? bracket.rounds.length : 2);
      if (bracket.grandFinalReset) processMatch(bracket.grandFinalReset, 'Final Desempate', bracket.rounds ? bracket.rounds.length + 1 : 3);
      if (bracket.groups) {
         bracket.groups.forEach(g => {
            g.matches.forEach(match => processMatch(match, `${g.name} - Fecha ${match.round + 1}`, 1));
         });
      }
    });
    return pend;
  };

  const currentPendientes = (() => {
    const prog = getProgramados();
    let pend = getNativePendientes();
    
    // Filter out already programmed
    pend = pend.filter(p => p.matchId ? !prog.has(String(p.matchId)) : (!prog.has(`${p.cat}||${p.j1}`) && !prog.has(`${p.cat}||${p.j2}`)));
    if (catFiltro) pend = pend.filter(p => p.cat === catFiltro);
    if (rondaFiltro) pend = pend.filter(p => p.ronda === rondaFiltro);

    // Sort to prioritize 1-star matches, then by rIndex
    pend.sort((a, b) => {
       const aStarCount = a.isQfOrLater ? 2 : 1;
       const bStarCount = b.isQfOrLater ? 2 : 1;
       if (aStarCount !== bStarCount) return aStarCount - bStarCount;

       const aIndex = a.rIndex !== undefined ? a.rIndex : 99;
       const bIndex = b.rIndex !== undefined ? b.rIndex : 99;
       return aIndex - bIndex;
    });

    return pend;
  })();

  const rawUnfilteredPendientes = (() => {
    const prog = getProgramados();
    return getNativePendientes().filter(p => p.matchId ? !prog.has(String(p.matchId)) : (!prog.has(`${p.cat}||${p.j1}`) && !prog.has(`${p.cat}||${p.j2}`)));
  })();

  const disponiblesRondas = Array.from(new Set(
     rawUnfilteredPendientes.filter(p => catFiltro ? p.cat === catFiltro : true).map(p => p.ronda)
  )).sort();

  const getTournamentStats = () => {
    let total = 0, jugados = 0, programados = 0;
    
    (Object.values(nativeBrackets) as NativeBracket[]).forEach(bracket => {
       const processStats = (match: any) => {
          const isByeMatch = (match.p1?.isBye || match.p2?.isBye);
          if (isByeMatch) return;
          total++;
          if (match.winner) jugados++;
       }
       if (bracket.rounds) bracket.rounds.forEach(r => r.forEach(processStats));
       if (bracket.loserRounds) bracket.loserRounds.forEach(r => r.forEach(processStats));
       if (bracket.thirdPlaceMatch) processStats(bracket.thirdPlaceMatch);
       if (bracket.grandFinal) processStats(bracket.grandFinal);
       if (bracket.grandFinalReset && bracket.grandFinalReset.p1) processStats(bracket.grandFinalReset);
       if (bracket.groups) bracket.groups.forEach(g => g.matches.forEach(processStats));
    });

    (Object.values(partidos) as Partido[]).forEach(p => { 
       // Currently scheduled without a winner
       if (!p.winner) programados++; 
    });
    
    return { 
       total, 
       jugados, 
       programados, 
       pendientesProgramar: rawUnfilteredPendientes.length 
    };
  };

  const tStats = getTournamentStats();
  const avanceTorneo = tStats.total > 0 ? Math.round((tStats.jugados / tStats.total) * 100) : 0;
  const programadosHoy = Object.values(partidos).filter((p: Partido) => p.dk === curDK).length;
  const disponiblesHoy = rawUnfilteredPendientes.filter(p => !catFiltro || p.cat === catFiltro).length;

  const totalPend = currentPendientes.length;
  const trueTotalPend = rawUnfilteredPendientes.length;

  const verificarAsig = (j1: string, j2: string, toC: number, toH: string, excKey: string | null) => {
    const dk = curDK, errors: {msg: string, tipo: 'mismo'|'bloque'|'tercero'}[] = [];
    if (!activas.includes(toC)) { errors.push({msg: `Cancha ${toC} no está activa`, tipo: 'mismo'}); return errors; }
    
    const destKey = slotKey(dk, toC, toH);
    if (partidos[destKey] && destKey !== excKey) { errors.push({msg: `Cancha ${toC} a las ${toH} ya está ocupada`, tipo: 'mismo'}); return errors; }
    
    const j1n = normalizeName(j1);
    const j2n = normalizeName(j2);
    
    // Función extractora para separar parejas de dobles y validarlos de forma independiente
    const extractIndividuals = (nameStr: string) => 
      nameStr.split(/\s+-\s+|\s+\/\s+|\s+&\s+| - /).map(s => s.trim()).filter(Boolean);
      
    const jugsMovTokens = extractIndividuals(j1n).concat(extractIndividuals(j2n)).filter(j => !j.includes('POR DEFINIR') && j !== 'BYE');
    
    // Eliminar duplicados en caso de que sea necesario (aunque improbable)
    const uniqueIndividualsInvolved = Array.from(new Set(jugsMovTokens));
    const toMin = horaMin(toH);

    uniqueIndividualsInvolved.forEach(jug => {
      const partidosJug: {h: string, min: number, k: string}[] = [];
      horasActivas.forEach(h => {
        activas.forEach(c => {
          const k = slotKey(dk, c, h);
          if (k === excKey) return;
          const p = partidos[k];
          if (!p) return;
          
          const pJ1Individuals = extractIndividuals(normalizeName(p.j1));
          const pJ2Individuals = extractIndividuals(normalizeName(p.j2));
          const allIndividualsInProgrammedMatch = pJ1Individuals.concat(pJ2Individuals);

          if (allIndividualsInProgrammedMatch.includes(jug)) {
            partidosJug.push({h, min: horaMin(h), k});
          }
        });
      });

      if (partidosJug.length >= 2) {
        errors.push({msg: `⚠️ ${jug} sumará más de 2 partidos hoy (Fátiga)`, tipo: 'tercero'});
        // Notice we do NOT return here anymore, we want to collect simultaneity errors too
      }

      partidosJug.forEach(({h, min}) => {
        const diff = Math.abs(toMin - min);
        if (diff === 0) {
          errors.push({msg: `🚨 ${jug} ya tiene partido a las ${h}`, tipo: 'mismo'});
        } else if (diff < 120) {
          errors.push({msg: `⚠️ ${jug} tiene partido a las ${h} (Sin 1 bloque de descanso)`, tipo: 'bloque'});
        }
      });
    });

    return errors;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, c: number, h: string) => {
    e.preventDefault();
    if (!dragItem) return;
    
    if (dragItem.type === 'grilla') {
      const p = partidos[dragItem.payload];
      if (!p) return;
      const errs = verificarAsig(p.j1, p.j2, c, h, dragItem.payload);
      const rojo = errs.filter(x => x.tipo === 'mismo');
      const nar = errs.filter(x => x.tipo === 'bloque' || x.tipo === 'tercero');
      if (rojo.length) { showToast(`No permitido:\n${rojo[0].msg}`, 'err'); setDragItem(null); return; }
      
      const newPartidos = { ...partidos };
      delete newPartidos[dragItem.payload];
      newPartidos[slotKey(curDK, c, h)] = { ...p, c, h, dk: curDK };
      setPartidos(newPartidos);
      if (nar.length) showToast(`${nar[0].msg}`, 'warn');
      else showToast(`Partido movido · Cancha ${c} · ${h}`, 'ok');
    } else if (dragItem.type === 'pend') {
      const { cat, j1, j2, ronda, matchId, tournamentId, urlAlias, player1_id, player2_id, rIndex, mIndex } = dragItem.payload;
      const errs = verificarAsig(j1, j2, c, h, null);
      const rojo = errs.filter(x => x.tipo === 'mismo');
      const nar = errs.filter(x => x.tipo === 'bloque' || x.tipo === 'tercero');
      if (rojo.length) { showToast(`No permitido:\n${rojo[0].msg}`, 'err'); setDragItem(null); return; }
      
      setPartidos({ ...partidos, [slotKey(curDK, c, h)]: { cat, j1, j2, ronda: ronda || '1era Ronda', c, h, dk: curDK, matchId, tournamentId, urlAlias, player1_id, player2_id, rIndex, mIndex } });
      if (nar.length) showToast(`${nar[0].msg}`, 'warn');
      else showToast(`${j1} vs ${j2} · Cancha ${c} · ${h}`, 'ok');
    }
    setDragItem(null);
  };

  const exportarImg = () => {
    const dk = curDK, cs = activas, hs = horasActivas;
    const dt = new Date(fechaActiva.y, fechaActiva.m, fechaActiva.d);
    const dStr = `${DIAS_FULL[dt.getDay()].toUpperCase()} ${fechaActiva.d} DE ${MESES_ES[fechaActiva.m].toUpperCase()} ${fechaActiva.y}`;
    
    // We can dynamically create canvas and trigger download
    const canvas = document.createElement('canvas');
    const cW = 190, rH = 78, hdrH = 46, tW = 72, pad = 14, titH = 60;
    const W = pad * 2 + tW + cs.length * cW, H = pad * 2 + titH + hdrH + hs.length * rH;
    
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#0a1628'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9a84c'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(`PROGRAMACIÓN ${dStr}`, W / 2, pad + 16);
    ctx.fillStyle = '#e8c96a'; ctx.font = 'bold 12px Arial'; ctx.fillText(creatorName.toUpperCase(), W / 2, pad + 32);
    ctx.fillStyle = '#8a9bb5'; ctx.font = '10px Arial'; ctx.fillText('(RAMA DE TENIS CNCS)', W / 2, pad + 46);
    
    const sy = pad + titH;
    ctx.fillStyle = '#111f3a'; ctx.fillRect(pad, sy, tW, hdrH);
    ctx.fillStyle = '#8a9bb5'; ctx.font = '9px Arial'; ctx.textAlign = 'center'; ctx.fillText('HORA', pad + tW / 2, sy + 28);
    
    cs.forEach((c, i) => {
      ctx.fillStyle = '#1a2f52'; ctx.fillRect(pad + tW + i * cW, sy, cW, hdrH);
      ctx.fillStyle = '#e8c96a'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center';
      ctx.fillText(`CANCHA ${c}`, pad + tW + i * cW + cW / 2, sy + 28);
    });
    
    hs.forEach((h, ri) => {
      const y = sy + hdrH + ri * rH;
      ctx.fillStyle = ri % 2 === 0 ? '#111f3a' : '#0d1a30'; ctx.fillRect(pad, y, W - pad * 2, rH);
      ctx.fillStyle = '#c9a84c'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.fillText(h, pad + tW / 2, y + rH / 2 + 4);
      cs.forEach((c, ci) => {
        const p = partidos[slotKey(dk, c, h)]; const cx = pad + tW + ci * cW + cW / 2;
        if (p) {
          ctx.fillStyle = '#f0ede8'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
          ctx.fillText(p.j1.slice(0, 24), cx, y + rH / 2 - 10);
          ctx.fillStyle = '#8a9bb5'; ctx.font = '9px Arial'; ctx.fillText('vs', cx, y + rH / 2 + 2);
          ctx.fillStyle = '#f0ede8'; ctx.font = 'bold 11px Arial'; ctx.fillText(p.j2.slice(0, 24), cx, y + rH / 2 + 14);
          ctx.fillStyle = '#c9a84c'; ctx.font = '8px Arial'; ctx.fillText(p.cat.slice(0, 26).toUpperCase(), cx, y + rH - 7);
        } else {
          ctx.fillStyle = '#1a2f52'; ctx.font = '11px Arial'; ctx.fillText('—', cx, y + rH / 2 + 4);
        }
        ctx.strokeStyle = 'rgba(201,168,76,.1)'; ctx.lineWidth = .5;
        ctx.beginPath(); ctx.moveTo(pad + tW + ci * cW, y); ctx.lineTo(pad + tW + ci * cW, y + rH); ctx.stroke();
      });
      ctx.strokeStyle = 'rgba(201,168,76,.08)'; ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
    });
    
    ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 1; ctx.strokeRect(pad, sy, W - pad * 2, hdrH + hs.length * rH);
    
    const link = document.createElement('a');
    link.download = `programacion_${fechaActiva.d}_${MESES_ES[fechaActiva.m]}_${fechaActiva.y}.png`;
    link.href = canvas.toDataURL(); link.click();
    showToast('Imagen PNG exportada', 'ok');
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* TOPBAR */}
      <div className="print-hide flex items-center px-4 h-12 bg-slate-900 border-b border-slate-800 shrink-0 z-50 relative">
        <div className="flex-1 flex items-center truncate pr-4 min-w-0">
          <div className="font-sans text-[13px] font-medium tracking-tight text-slate-100 uppercase truncate">CNCS CONTROL / RAMA DE TENIS - TORNEO GLORIAS NAVALES 2026</div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          {(['prog', 'llaves', 'jugadores'] as const).map((tabView) => {
            let label = '';
            let icon = null;
            if (tabView === 'prog') { label = 'PROGRAMACIÓN'; icon = <LayoutGrid className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" />; }
            if (tabView === 'llaves') { label = 'LLAVES'; icon = <svg className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5 fill-current" viewBox="0 0 24 24"><path d="M12.006 1.838l-9.155 4.673v10.97l9.155 4.681 9.155-4.681V6.511zM19.78 16.711l-7.774 3.978-7.773-3.978V7.954l7.773-3.968 7.774 3.968zM12.006 5.56l-5.466 2.791v5.586l5.466 2.8 5.466-2.8V8.35z"/></svg>; }
            if (tabView === 'jugadores') { label = 'JUGADORES'; icon = <Users className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" />; }
            
            const isActive = view === tabView;
            
            return (
              <button 
                key={tabView}
                onClick={() => setView(tabView as any)} 
                className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wide transition-all uppercase flex items-center border ${
                  isActive 
                    ? 'text-white bg-slate-800 border-slate-700 shadow-sm' 
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/50'
                }`}
              >
                {icon}{label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex justify-end shrink-0 gap-2">
          <button 
            onClick={handleNuevoTorneo} 
            className={`px-3 py-1.5 rounded border border-indigo-500/30 text-[11px] font-bold tracking-wide transition-all uppercase flex items-center shadow-sm ${
              view === 'crear' 
                ? 'text-indigo-300 bg-indigo-500/20 border-indigo-400/50' 
                : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
            }`}
          >
            <Pencil className="inline-block w-3.5 h-3.5 mr-1.5 -mt-0.5" /> EDITAR TORNEO
          </button>
        </div>
      </div>

      <div className="flex flex-row flex-1 overflow-hidden relative min-h-0">
        {/* SIDEBAR ON THE LEFT */}
        {view === 'prog' && (
          <div className="print-hide w-64 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-20 min-h-0">
            <div className="p-3 border-b border-slate-800 shrink-0 relative">
              <div className="relative">
                <button onClick={() => setCalOpen(!calOpen)} className={`w-full flex items-center justify-between p-2.5 glass border rounded-lg transition-all text-left ${calOpen ? 'border-sky-500/50 bg-sky-500/10 text-sky-100' : 'border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-200'}`}>
                  <div>
                    <div className="font-sans text-sm font-light tracking-tight text-white">
                      {DIAS_FULL[new Date(fechaActiva.y, fechaActiva.m, fechaActiva.d).getDay()]} {fechaActiva.d}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{SEMANAS[curDK] || 'Día habilitado'}</div>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-200 ${calOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {/* CALENDAR POPUP */}
                {calOpen && (
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl p-3 z-[100] shadow-2xl glass">
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => { let m = calMonth - 1; let y = calYear; if (m < 0) { m = 11; y--; } setCalMonth(m); setCalYear(y); }} className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-sans text-xs font-medium text-white">{MESES_ES[calMonth]} {calYear}</span>
                      <button onClick={() => { let m = calMonth + 1; let y = calYear; if (m > 11) { m = 0; y++; } setCalMonth(m); setCalYear(y); }} className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {DIAS_CAL.map((d, i) => <div key={i} className={`text-[8px] text-center py-1 font-mono ${i === 6 ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>)}
                      {Array.from({ length: (new Date(calYear, calMonth, 1).getDay() || 7) - 1 }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                      {Array.from({ length: new Date(calYear, calMonth + 1, 0).getDate() }).map((_, i) => {
                        const d = i + 1;
                        const isDom = new Date(calYear, calMonth, d).getDay() === 0;
                        const isTorneo = DIAS_TORNEO.some(t => t.y === calYear && t.m === calMonth && t.d === d);
                        const isHab = diasHabilitados.has(dayKey(calYear, calMonth, d));
                        const isActivo = fechaActiva.y === calYear && fechaActiva.m === calMonth && fechaActiva.d === d;
                        const hasProg = Object.keys(partidos).some(k => k.startsWith(dayKey(calYear, calMonth, d) + '_'));
                        
                        let baseCls = "aspect-square rounded flex items-center justify-center text-[10px] cursor-pointer transition-all relative ";
                        if (isActivo) baseCls += "bg-blue-600 text-white font-medium shadow-md shadow-blue-500/20 ";
                        else if (isTorneo) baseCls += "font-medium text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 ";
                        else if (isHab) baseCls += "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 ";
                        else baseCls += `text-slate-400 hover:bg-slate-800 hover:text-white ${isDom ? 'text-red-400' : ''} `;

                        return (
                          <div key={d} className={baseCls} onClick={() => {
                            if (isTorneo || isHab) { setFechaActiva({ y: calYear, m: calMonth, d }); setCalOpen(false); }
                            else {
                              const ns = new Set(diasHabilitados);
                              const k = dayKey(calYear, calMonth, d);
                              if (ns.has(k)) ns.delete(k); else ns.add(k);
                              setDiasHabilitados(ns);
                            }
                          }}>
                            {d}
                            {hasProg && !isActivo && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Sin programar</span>
                <div className="flex items-center gap-2">
                  {trueTotalPend > 0 && <button onClick={() => { setConfirmVaciar(true); }} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 uppercase font-mono tracking-wider transition-colors border border-red-500/20">Vaciar</button>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${trueTotalPend === 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/15 border-amber-500/30 text-amber-500'}`}>{trueTotalPend}</span>
                </div>
              </div>
              
              <div className="relative mb-3 shrink-0">
                <button 
                  onClick={() => setCatDropOpen(!catDropOpen)} 
                  className={`w-full p-[9px_12px] bg-slate-950 border rounded-lg flex items-center justify-between gap-2 transition-all ${catDropOpen ? 'border-blue-400 bg-blue-500/5' : 'border-slate-800 hover:border-blue-400/50'}`}>
                  <span className="font-mono text-[11px] font-medium text-slate-300 uppercase tracking-wider truncate flex-1 text-left">
                    {catFiltro ? catFiltro : 'TODAS LAS CATEGORÍAS'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono min-w-[24px] text-center ${totalPend === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>{totalPend}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform ${catDropOpen ? 'rotate-180' : ''}`}/>
                  </div>
                </button>
                
                {catDropOpen && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl z-[200] shadow-2xl max-h-[320px] overflow-y-auto flex flex-col py-1">
                    <button 
                      onClick={() => { setCatFiltro(null); setCatDropOpen(false); }} 
                      className={`flex items-center justify-between p-[10px_14px] transition-colors border-b border-slate-800 hover:bg-slate-800 ${!catFiltro ? 'bg-blue-500/10' : ''}`}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0 bg-slate-500"></div>
                        <span className={`font-mono text-[10px] font-medium uppercase tracking-wider truncate ${!catFiltro ? 'text-blue-300' : 'text-slate-300'}`}>Todas</span>
                      </div>
                      <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg shrink-0 min-w-[28px] text-center ${trueTotalPend > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}>{trueTotalPend}</span>
                    </button>
                    {Object.keys(categorias).map(cat => {
                      const prog = getProgramados();
                      let n = 0;
                      // Use getNativePendientes to find the true count for this category
                      getNativePendientes().filter(p => p.cat === cat && (p.matchId ? !prog.has(String(p.matchId)) : (!prog.has(`${cat}||${p.j1}`) && !prog.has(`${cat}||${p.j2}`)))).forEach(() => n++);
                      
                      const active = catFiltro === cat;
                      return (
                        <button 
                          key={cat}
                          onClick={() => { setCatFiltro(cat); setCatDropOpen(false); }} 
                          className={`flex items-center justify-between p-[10px_14px] transition-colors border-b border-white/5 last:border-0 hover:bg-indigo-500/10 ${active ? 'bg-indigo-500/10' : ''}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: catColor(cat) }}></div>
                            <span className={`font-mono text-[10px] font-medium uppercase tracking-wider truncate ${active ? 'text-indigo-300' : 'text-gray-300'}`}>{cat}</span>
                          </div>
                          <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-lg shrink-0 min-w-[28px] text-center flex items-center justify-center ${n > 0 ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/10 text-emerald-400'}`}>{n}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rondas Dropdown Custom */}
              <div className="relative mb-3 shrink-0 z-[60]">
               <button 
                 onClick={() => setRondaDropOpen(!rondaDropOpen)}
                 className={`w-full p-[9px_12px] bg-slate-950 border rounded-lg flex items-center justify-between gap-2 transition-all ${rondaDropOpen ? 'border-sky-400 bg-sky-500/5' : 'border-slate-800 hover:border-sky-400/50'}`}
               >
                 <span className="font-mono text-[11px] font-medium text-slate-300 uppercase tracking-wider truncate flex-1 text-left">
                   {rondaFiltro ? rondaFiltro : "TODAS LAS RONDAS"}
                 </span>
                 <div className="flex items-center gap-1.5 shrink-0">
                    <ChevronDown className={`w-3.5 h-3.5 text-sky-400 transition-transform ${rondaDropOpen ? 'rotate-180' : ''}`} />
                 </div>
               </button>

               {rondaDropOpen && (
                 <>
                   <div className="fixed inset-0 z-[50]" onClick={() => setRondaDropOpen(false)} />
                   <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl z-[200] shadow-2xl max-h-[320px] overflow-y-auto flex flex-col py-1">
                      <button
                        onClick={() => { setRondaFiltro(null); setRondaDropOpen(false); }}
                        className={`flex items-center justify-between p-[10px_14px] transition-colors border-b border-slate-800 hover:bg-slate-800 ${!rondaFiltro ? 'bg-sky-500/10' : ''}`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0 bg-slate-500"></div>
                          <span className={`font-mono text-[10px] font-medium uppercase tracking-wider truncate ${!rondaFiltro ? 'text-sky-300' : 'text-slate-300'}`}>TODAS LAS RONDAS</span>
                        </div>
                      </button>
                      {disponiblesRondas.map(r => (
                        <button
                          key={r}
                          onClick={() => { setRondaFiltro(r); setRondaDropOpen(false); }}
                          className={`flex items-center justify-between p-[10px_14px] transition-colors border-b border-slate-800 last:border-0 hover:bg-slate-800 ${rondaFiltro === r ? 'bg-sky-500/10' : ''}`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${rondaFiltro === r ? 'bg-sky-400' : 'bg-transparent'}`}></div>
                            <span className={`font-mono text-[10px] font-medium uppercase tracking-wider truncate ${rondaFiltro === r ? 'text-sky-300' : 'text-slate-300'}`}>{r}</span>
                          </div>
                        </button>
                      ))}
                   </div>
                 </>
               )}
              </div>
              
              <div className="text-center py-1 mb-2 shrink-0 text-[10px] text-gray-500 flex items-center justify-center gap-1 italic"><GripVertical className="w-3 h-3" /> Arrastra a la cancha</div>
              
              <div className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-1 min-h-0">
                {currentPendientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 gap-1.5 opacity-80">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                    <span className="text-[11px] text-success">Todos programados</span>
                  </div>
                ) : (
                  currentPendientes.map((p: any, i: number) => (
                    <div 
                      key={i} 
                      draggable
                      onDragStart={(e) => setDragItem({ type: 'pend', payload: p })}
                      onDragEnd={() => setDragItem(null)}
                      onClick={() => {
                         setSelSearch('');
                         setSelPend({ cat: p.cat, j1: p.j1, j2: p.j2, matchId: p.matchId });
                         setSelModal({ c: activas[0], h: horasActivas[0] });
                      }}
                      className="group glass border border-white/5 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:bg-white/5 hover:border-white/20 transition-all select-none border-l-[3px]"
                      style={{ borderLeftColor: catColor(p.cat) }}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] uppercase font-mono tracking-wider truncate mr-1" style={{ color: catColor(p.cat) }}>{p.cat}</span>
                        <div className="flex items-center gap-1 shrink-0">
                           <span className="text-[8px] tracking-widest text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]" title={`${p.starCount || 1} Estrella(s)`}>
                              {'⭐'.repeat(p.starCount || 1)}
                           </span>
                           <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded uppercase">{p.ronda}</span>
                           <div className="flex items-center">
                              {p.matchId && (
                                <button 
                                  onClick={(e) => {
                                     e.stopPropagation();
                                     setMatchQueue(prev => {
                                        const next = new Set(prev);
                                        next.delete(String(p.matchId));
                                        return next;
                                     });
                                     showToast('Partido removido de la bandeja', 'ok');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                                  title="Remover de la bandeja"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <GripVertical className="w-3.5 h-3.5 text-gray-600 ml-0.5 group-hover:hidden" />
                           </div>
                        </div>
                      </div>
                      <div className="text-xs font-medium text-gray-200 leading-tight">{p.j1}</div>
                      <div className="text-[9px] text-gray-600 italic my-0.5">vs</div>
                      <div className="text-xs font-medium text-gray-200 leading-tight">{p.j2}</div>
                    </div>
                  ))
                )}
              </div>
            </div>


          </div>
        )}

        {/* MAIN PANEL - GRILLA */}
        {view === 'prog' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#0A0A0A] min-w-0">
            <div className="h-full flex flex-col min-w-[800px] p-4 min-h-0">
               {/* CONDENSED HEADER */}
               <div className="flex gap-4 mb-4 flex-wrap items-center justify-between shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-2.5">
                 <div className="flex gap-4 flex-wrap items-center">
                   <div className="font-sans text-base font-light tracking-tight text-white ml-1 mr-2 whitespace-nowrap uppercase">
                     {DIAS_FULL[new Date(fechaActiva.y, fechaActiva.m, fechaActiva.d).getDay()]} {String(fechaActiva.d).padStart(2, '0')}-{MESES_ES[fechaActiva.m].toUpperCase()}-{fechaActiva.y}
                   </div>
                   
                   <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 font-mono uppercase tracking-widest leading-none">Total</span>
                        <span className="text-sm font-light text-white">{tStats.total}</span>
                      </div>
                      <div className="flex flex-col ml-3">
                        <span className="text-[9px] text-emerald-500 font-mono uppercase tracking-widest leading-none">Jugados</span>
                        <span className="text-sm font-light text-emerald-400">{tStats.jugados} <span className="text-[9px] opacity-70">({avanceTorneo}%)</span></span>
                      </div>
                      <div className="flex flex-col ml-3">
                        <span className="text-[9px] text-blue-500 font-mono uppercase tracking-widest leading-none">Pend/Hoy</span>
                        <span className="text-sm font-light text-blue-400">{tStats.programados} / {programadosHoy}</span>
                      </div>
                   </div>

                   <div className={`ml-4 px-2.5 py-1 rounded border flex items-center gap-1.5 ${cfCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-slate-950 border-slate-800 text-emerald-400'}`} title={cfCount > 0 ? 'Hay conflictos detectados hoy' : 'Sin conflictos'}>
                     <div className="font-sans text-sm font-bold currentColor">{cfCount}</div>
                     <div className="text-[9px] uppercase font-mono tracking-widest leading-tight currentColor">Conflictos</div>
                   </div>
                 </div>

                 <div className="flex gap-3 items-center flex-wrap justify-end">
                    {/* Alertas */}
                    {rojos.length > 0 && (
                       <div className="px-2 py-1.5 rounded bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] flex items-center gap-1.5 shadow-sm">
                         <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                         <span className="max-w-[150px] truncate" title={`Choques: ${[...new Set(rojos.flatMap(v => v.jgs))].join(', ')}`}>
                           Choques: {[...new Set(rojos.flatMap(v => v.jgs))].join(', ')}
                         </span>
                       </div>
                    )}
                    {naranjas.length > 0 && (
                      <div className="px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] flex items-center gap-1.5 shadow-sm">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="max-w-[150px] truncate" title={`Poco descanso: ${[...new Set(naranjas.flatMap(v => v.jgs))].join(', ')}`}>
                          Descanso: {[...new Set(naranjas.flatMap(v => v.jgs))].join(', ')}
                        </span>
                      </div>
                    )}
                    {totalPend > 0 && (
                       <div className="px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[10px] flex items-center gap-1.5 shadow-sm shrink-0">
                         <AlertTriangle className="w-3.5 h-3.5 shrink-0"/> {totalPend} sin programar
                       </div>
                    )}

                    {/* Canchas y Descargar */}
                    <div className="flex items-center gap-3 ml-2 border-l border-slate-800 pl-4 py-0.5">
                      <div className="flex gap-1.5 items-center">
                        <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 mr-1 hidden lg:block">Canchas:</div>
                        {[1, 2, 3, 4, 5].map(c => (
                          <button key={c} onClick={() => setCanchas(p => ({ ...p, [c]: !p[c] }))} className={`p-1 px-2 rounded border flex items-center gap-1 transition-all ${canchas[c] ? 'glass text-blue-400 border-blue-500/30' : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-400'}`}>
                            <span className="font-sans font-medium text-[11px]">C{c}</span>
                          </button>
                        ))}
                      </div>
                      
                      <button 
                        onClick={exportarImg}
                        className="px-3 py-1.5 rounded text-[10px] font-bold transition-all uppercase flex items-center bg-[#c9a84c] text-black hover:bg-[#e8c96a] shadow-sm shrink-0"
                      >
                        <Download className="inline-block w-3.5 h-3.5 mr-1.5" />DESCARGAR
                      </button>
                    </div>
                 </div>
               </div>
                  <div className="flex-1 editor-gradient rounded-xl p-6 min-h-0 flex flex-col border border-slate-800 shadow-2xl relative overflow-hidden bg-slate-900/50">
                 <div className="absolute top-4 right-4 text-[10px] text-blue-400 font-mono uppercase tracking-[0.2em] z-20 bg-slate-950 px-2 py-1 rounded border border-slate-800 hidden md:block">Master Matrix</div>
                 
                 {/* GRID WRAPPER */}
                 <div className="flex-1 overflow-auto rounded-lg border border-slate-800 bg-slate-950">
                   <div className="min-w-full flex flex-col w-max">
                     
                     {/* COLUMN HEADERS (COURTS) */}
                     <div className="flex sticky top-0 z-30 bg-slate-950 border-b border-slate-800 shadow-sm">
                        <div className="w-[60px] shrink-0 border-r border-slate-800 bg-slate-950/80 backdrop-blur" /> {/* Empty top-left cell */}
                        {activas.map(c => (
                          <div key={c} className="flex-1 min-w-[140px] shrink-0 border-r border-slate-800 last:border-r-0 py-3 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur">
                            <div className="font-sans font-light tracking-tight text-[15px] text-white">Cancha {c}</div>
                            <div className="text-[9px] text-slate-400 font-mono mt-0.5">ARCILLA{c === 5 ? ' / TARDE' : ''}</div>
                          </div>
                        ))}
                     </div>

                     {/* ROW BODY (TIMES) */}
                     {horasActivas.map(h => (
                       <div key={h} className="flex border-b border-slate-800/60 last:border-b-0 min-h-[110px] group/row">
                         {/* TIME LABEL (STICKY LEFT) */}
                         <div className="w-[60px] shrink-0 border-r border-slate-800 flex items-center justify-center p-2 sticky left-0 z-20 bg-slate-950">
                           <div className="font-mono text-[11px] font-bold text-sky-400/80 bg-sky-900/10 px-2 py-1 rounded">
                              {h}
                           </div>
                         </div>
                         
                         {/* MATRIX CELLS */}
                         {activas.map(c => {
                           const k = slotKey(curDK, c, h);
                           const p = partidos[k];
                           const cf = cfMap[k];
                           const isCfMismo = cf?.tipo === 'mismo';
                           const isCfBloque = cf?.tipo === 'bloque';

                           return (
                             <div key={k} className="flex-1 min-w-[140px] shrink-0 border-r border-slate-800/50 last:border-r-0 p-1.5 transition-colors hover:bg-slate-800/30">
                               {p ? (
                                  // MATCH CARD
                                  <div 
                                    draggable
                                    onDragStart={() => setDragItem({ type: 'grilla', payload: k })}
                                    onDragEnd={() => setDragItem(null)}
                                    className={`relative w-full h-full p-2.5 rounded-lg border cursor-grab active:cursor-grabbing flex flex-col justify-between transition-all shadow-sm
                                      ${isCfMismo ? 'border-red-500/50 bg-red-500/10' : isCfBloque ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-700 bg-slate-800/80 hover:border-sky-500/40 hover:shadow-[0_0_15px_rgba(14,165,233,0.15)]'}`}
                                  >
                                    {/* Accent Line */}
                                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: isCfMismo ? '#ef4444' : isCfBloque ? '#f59e0b' : catColor(p.cat) }} />
                                    
                                    <div className="pl-1">
                                      <div className="flex justify-between items-start mb-1">
                                        <div className="text-[9px] font-mono tracking-widest uppercase truncate max-w-[100px]" style={{ color: catColor(p.cat) }}>{p.cat}</div>
                                        {isCfMismo ? (
                                          <div className="text-[8px] bg-red-500 text-white px-1 py-0.5 rounded font-bold shadow-sm" title={cf.jgs.join(', ')}>⚠ CONFLICTO</div>
                                        ) : isCfBloque ? (
                                          <div className="text-[8px] bg-amber-500 text-white px-1 py-0.5 rounded font-bold shadow-sm" title={cf.jgs.join(', ')}>AVISO</div>
                                        ) : null}
                                      </div>
                                      
                                      <div className="flex flex-col gap-0.5 mt-2">
                                        <div className="text-xs font-medium truncate text-white flex items-center gap-1">
                                           {p.j1}
                                           {fatiguedPlayersSet.has(normalizeName(p.j1)) && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Segundo partido del día para este jugador" />}
                                        </div>
                                        <div className="text-[9px] text-slate-500 italic px-1">vs</div>
                                        <div className="text-xs font-medium truncate text-white flex items-center gap-1">
                                           {p.j2}
                                           {fatiguedPlayersSet.has(normalizeName(p.j2)) && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" title="Segundo partido del día para este jugador" />}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between mt-3 pl-1 pr-0.5 gap-2">
                                      {p.winner ? (
                                         <div 
                                           onClick={(e) => {
                                              e.stopPropagation();
                                              if (p.rIndex !== undefined || p.matchId) {
                                                 setReportScoreModal({ k, p, winner: p.winner, score: p.score || '' });
                                              }
                                           }}
                                           className="text-[9px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 px-1.5 py-1 rounded font-bold cursor-pointer transition-colors flex items-center gap-1 w-full"
                                           title="Clic para editar"
                                         >
                                           <span className="text-emerald-500 shrink-0">✓</span> 
                                           <span className="truncate">{p.winner === 'p1' ? p.j1 : p.j2} {p.score ? `(${p.score})` : ''}</span> 
                                         </div>
                                      ) : (
                                        <button 
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onClick={(e) => { 
                                            e.stopPropagation(); 
                                            if (p.rIndex !== undefined || p.matchId) {
                                              setReportScoreModal({ k, p: p, winner: null, score: '' });
                                              return;
                                            }
                                            setEditRondaModal(k);
                                          }} 
                                          className="text-[9px] font-bold text-slate-900 bg-sky-400 hover:bg-sky-300 px-1.5 py-1 rounded shadow-md transition-colors flex items-center gap-1">
                                          🏆 Informar
                                        </button>
                                      )}
                                      <button 
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => { e.stopPropagation(); setDeleteKey(k); }} 
                                        className="w-5 h-5 ml-auto shrink-0 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                               ) : (
                                  // EMPTY DROPZONE
                                  <div 
                                    onDragOver={(e) => { e.preventDefault(); setDragOverKey(k); }}
                                    onDragLeave={() => setDragOverKey(null)}
                                    onDrop={(e) => { handleDrop(e, c, h); setDragOverKey(null); }}
                                    onClick={() => {
                                      setSelSearch('');
                                      setSelPend(null);
                                      setSelModal({ c, h });
                                    }}
                                    className={`w-full h-full rounded border flex items-center justify-center transition-all min-h-[96px] cursor-pointer ${dragOverKey === k ? 'border-2 border-amber-400 bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.3)] opacity-100 scale-[1.02]' : 'border-dashed border-slate-700/50 bg-slate-900/30 hover:border-sky-500/40 hover:bg-sky-500/5 opacity-0 group-hover/row:opacity-100 hover:!opacity-100'}`}
                                  >
                                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">+ Asignar</span>
                                  </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* JUGADORES VIEW */}
        {view === 'jugadores' && (
          <div className="flex-1 p-6 overflow-y-auto">
             <div className="flex items-center justify-between mb-6">
               <h2 className="font-sans text-xl font-light tracking-tight text-white uppercase">DIRECTORIO DE JUGADORES</h2>
               <button 
                onClick={handleNuevoTorneo}
                className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-lg text-xs font-semibold tracking-wide transition-all shadow-lg flex items-center gap-2">
                 <Pencil className="w-4 h-4" />
                 EDITAR TORNEO
               </button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.keys(categorias).length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500 text-sm">No hay jugadores cargados. <button onClick={handleNuevoTorneo} className="text-emerald-400 underline hover:text-emerald-300">Crea un torneo</button> para empezar.</div>
                ) : Object.keys(categorias).map(cat => (
                  <div 
                    key={cat} 
                    draggable
                    onDragStart={(e) => {
                       setDragCat(cat);
                    }}
                    onDragEnd={() => {
                       setDragCat(null);
                       setDragOverCat(null);
                    }}
                    className={`glass border rounded-xl p-5 shadow-2xl flex flex-col transition-all ${
                       dragCat === null ? '' : 'cursor-grab active:cursor-grabbing'
                    } ${
                       dragOverCat === cat ? 'border-2 border-indigo-400 bg-indigo-500/10 scale-105 z-10' :
                       dragOverPlayer?.cat === cat && dragOverPlayer?.index === -1 ? 'border-amber-400 bg-amber-500/5' : 'border-white/5'
                    }`}
                    onDragOver={(e) => {
                       e.preventDefault();
                       if (dragPlayer && dragPlayer.cat !== cat) {
                          setDragOverPlayer({ cat, index: -1 }); // -1 indicates dropping onto the category itself (end of list)
                       } else if (dragCat && dragCat !== cat) {
                          setDragOverCat(cat);
                       }
                    }}
                    onDragLeave={(e) => {
                       // Only clear if we are leaving the main container
                       if ((e.relatedTarget as HTMLElement)?.closest('.glass') !== e.currentTarget) {
                          if (dragOverPlayer?.cat === cat && dragOverPlayer?.index === -1) {
                             setDragOverPlayer(null);
                          }
                          if (dragOverCat === cat) {
                             setDragOverCat(null);
                          }
                       }
                    }}
                    onDrop={(e) => {
                       if (dragPlayer && dragPlayer.cat !== cat) {
                          const sourceCatName = dragPlayer.cat;
                          const sourceCat = { ...categorias[sourceCatName] };
                          const targetCat = { ...categorias[cat] };

                          const sourceArr = [...sourceCat.players];
                          const targetArr = [...targetCat.players];

                          const [moved] = sourceArr.splice(dragPlayer.index, 1);
                          targetArr.push(moved);

                          sourceArr.forEach((p, i) => p.seed = i + 1);
                          targetArr.forEach((p, i) => p.seed = i + 1);

                          sourceCat.players = sourceArr;
                          targetCat.players = targetArr;

                          setCategorias(prev => ({ ...prev, [sourceCatName]: sourceCat, [cat]: targetCat }));
                          recompilarLlave(sourceCatName, sourceArr, sourceCat.type);
                          recompilarLlave(cat, targetArr, targetCat.type);
                          showToast(`Jugador movido a ${cat}`, 'ok');
                       } else if (dragCat && dragCat !== cat) {
                          setCategorias(prev => {
                             const keys = Object.keys(prev);
                             const fromIndex = keys.indexOf(dragCat);
                             const toIndex = keys.indexOf(cat);
                             const newKeys = [...keys];
                             const [moved] = newKeys.splice(fromIndex, 1);
                             newKeys.splice(toIndex, 0, moved);
                             
                             const next: any = {};
                             newKeys.forEach(k => next[k] = prev[k]);
                             return next;
                          });
                          
                          setNativeBrackets(prev => {
                             const keys = Object.keys(prev);
                             const fromIndex = keys.indexOf(dragCat);
                             const toIndex = keys.indexOf(cat);
                             // If keys haven't changed in length, we can reorder securely
                             const parentKeys = Object.keys(categorias);
                             const newKeys = [...parentKeys];
                             const [moved] = newKeys.splice(parentKeys.indexOf(dragCat), 1);
                             newKeys.splice(parentKeys.indexOf(cat), 0, moved);

                             const next: any = {};
                             newKeys.forEach(k => {
                                if (prev[k]) next[k] = prev[k];
                             });
                             return next;
                          });
                          showToast(`Categoría movida`, 'ok');
                       }
                       setDragPlayer(null);
                       setDragOverPlayer(null);
                       setDragCat(null);
                       setDragOverCat(null);
                    }}
                  >
                    <div className="mb-4 pb-2 border-b flex items-start justify-between gap-4" style={{ borderColor: catColor(cat) + '40' }}>
                      <GripVertical className="w-4 h-4 text-slate-500 cursor-grab shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity" title="Arrastrar categoría" />
                      <div className="min-w-0 flex-1">
                        <div className="font-sans text-sm font-light tracking-tight text-white flex items-center flex-wrap gap-2 truncate">
                          {cat} <span className="font-mono text-[10px] text-gray-500">({categorias[cat].players.length})</span>
                        </div>
                      </div>
                      <button
                         onClick={(e) => {
                            e.stopPropagation();
                            setCatToDelete(cat);
                         }}
                         className="text-slate-500 hover:text-red-400 p-1 shrink-0 z-10 relative"
                         title="Eliminar categoría"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {categorias[cat].type && (
                      <select 
                        value={categorias[cat].type}
                        onChange={(e) => {
                           const newType = e.target.value;
                           const updatedCat = { ...categorias[cat], type: newType };
                           setCategorias(prev => ({ ...prev, [cat]: updatedCat }));
                           recompilarLlave(cat, updatedCat.players, newType);
                           showToast(`Tipo de torneo cambiado a ${newType}`, 'ok');
                        }}
                        className="mb-4 text-[10px] uppercase font-mono tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded w-fit outline-none cursor-pointer focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 appearance-none drop-shadow-sm hover:bg-emerald-500/20 transition-colors"
                      >
                         <option value="single elimination">ELIMINACIÓN DIRECTA</option>
                         <option value="double elimination">DOBLE ELIMINACIÓN</option>
                         <option value="round robin">ROUND ROBIN (GRUPOS)</option>
                         {!['single elimination', 'double elimination', 'round robin'].includes(categorias[cat].type) && (
                            <option value={categorias[cat].type}>{categorias[cat].type.toUpperCase()}</option>
                         )}
                      </select>
                    )}
                    <div className="flex flex-col flex-1 overflow-y-auto pb-4">
                      {categorias[cat].players.map((j, index) => (
                        <div 
                           key={`${j.name}-${index}`}
                           draggable
                           onDragStart={(e) => {
                              e.stopPropagation();
                              setDragPlayer({ cat, index });
                           }}
                           onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragPlayer && (dragPlayer.cat !== cat || dragPlayer.index !== index)) {
                                 setDragOverPlayer({ cat, index });
                              }
                           }}
                           onDragLeave={() => setDragOverPlayer(null)}
                           onDrop={(e) => {
                              e.stopPropagation();
                              if (dragPlayer) {
                                 if (dragPlayer.cat === cat && dragPlayer.index !== index) {
                                    const updatedCat = { ...categorias[cat] };
                                    const arr = [...updatedCat.players];
                                    const [moved] = arr.splice(dragPlayer.index, 1);
                                    arr.splice(index, 0, moved);
                                    arr.forEach((p, i) => p.seed = i + 1);
                                    updatedCat.players = arr;
                                    setCategorias(prev => ({ ...prev, [cat]: updatedCat }));
                                    recompilarLlave(cat, arr, updatedCat.type);
                                    showToast('Cambios guardados correctamente', 'ok');
                                 } else if (dragPlayer.cat !== cat) {
                                    const sourceCatName = dragPlayer.cat;
                                    const sourceCat = { ...categorias[sourceCatName] };
                                    const targetCat = { ...categorias[cat] };

                                    const sourceArr = [...sourceCat.players];
                                    const targetArr = [...targetCat.players];

                                    const [moved] = sourceArr.splice(dragPlayer.index, 1);
                                    targetArr.splice(index, 0, moved);

                                    sourceArr.forEach((p, i) => p.seed = i + 1);
                                    targetArr.forEach((p, i) => p.seed = i + 1);

                                    sourceCat.players = sourceArr;
                                    targetCat.players = targetArr;

                                    setCategorias(prev => ({ ...prev, [sourceCatName]: sourceCat, [cat]: targetCat }));
                                    recompilarLlave(sourceCatName, sourceArr, sourceCat.type);
                                    recompilarLlave(cat, targetArr, targetCat.type);
                                    showToast('Jugador movido a otra categoría', 'ok');
                                 }
                              }
                              setDragPlayer(null);
                              setDragOverPlayer(null);
                           }}
                           className={`group flex items-center gap-3 py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 rounded -mx-2 transition-all cursor-grab active:cursor-grabbing ${dragOverPlayer?.cat === cat && dragOverPlayer?.index === index ? 'border-b-2 border-b-emerald-500 bg-emerald-500/10 scale-[1.02]' : ''}`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-500 cursor-grab shrink-0" />
                          <div className="w-5 h-5 rounded bg-black/40 flex items-center justify-center text-[10px] font-mono shrink-0 shadow-sm" style={{ color: catColor(cat), border: `1px solid ${catColor(cat)}40` }}>
                            {j.seed || '-'}
                          </div>
                          
                          {editingPlayer?.cat === cat && editingPlayer?.index === index ? (
                             <input 
                                autoFocus
                                value={editingPlayer.name}
                                onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                                onBlur={() => {
                                   if (editingPlayer.name.trim() !== j.name) {
                                      const newName = editingPlayer.name.trim() || j.name;
                                      const oldName = j.name;
                                      
                                      const updatedCat = { ...categorias[cat] };
                                      updatedCat.players[index].name = newName;
                                      setCategorias(prev => ({ ...prev, [cat]: updatedCat }));
                                      
                                      setNativeBrackets(prev => {
                                         if (!prev[cat]) return prev;
                                         return { ...prev, [cat]: renamePlayerInBracket(prev[cat], oldName, newName) };
                                      });
                                      
                                      setPartidos(prev => {
                                         const next = { ...prev };
                                         let changed = false;
                                         Object.keys(next).forEach(k => {
                                            if (next[k].cat === cat && (next[k].j1 === oldName || next[k].j2 === oldName)) {
                                               if (next[k].j1 === oldName) next[k].j1 = newName;
                                               if (next[k].j2 === oldName) next[k].j2 = newName;
                                               changed = true;
                                            }
                                         });
                                         return changed ? next : prev;
                                      });
                                      
                                      showToast('Cambios guardados correctamente', 'ok');
                                   }
                                   setEditingPlayer(null);
                                }}
                                onKeyDown={e => {
                                   if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-white outline-none focus:border-blue-500"
                             />
                          ) : (
                             <span 
                               onClick={() => setEditingPlayer({ cat, index, name: j.name })}
                               className="text-xs text-gray-300 font-medium flex-1 cursor-text hover:text-white truncate"
                               title="Click para editar nombre">
                               {j.name}
                             </span>
                          )}
                          <button
                             onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`¿Seguro que deseas eliminar a ${j.name}?`)) {
                                   const oldName = j.name;
                                   
                                   setCategorias(prev => {
                                      const updatedCat = { ...prev[cat] };
                                      const arr = [...updatedCat.players];
                                      arr.splice(index, 1);
                                      arr.forEach((p, i) => p.seed = i + 1);
                                      updatedCat.players = arr;
                                      
                                      setTimeout(() => recompilarLlave(cat, arr, updatedCat.type || 'single elimination'), 0);
                                      return { ...prev, [cat]: updatedCat };
                                   });
                                   
                                   setPartidos(prev => {
                                      const next = { ...prev };
                                      Object.keys(next).forEach(k => {
                                         if (next[k].cat === cat && (next[k].j1 === oldName || next[k].j2 === oldName)) {
                                            delete next[k];
                                         }
                                      });
                                      return next;
                                   });
                                   
                                   showToast('Jugador eliminado', 'ok');
                                }
                             }}
                             className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 p-1"
                             title="Eliminar jugador"
                          >
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                       onClick={() => {
                          const updatedCat = { ...categorias[cat] };
                          const newPlayer = { name: 'Jugador Nuevo', seed: updatedCat.players.length + 1 };
                          updatedCat.players.push(newPlayer);
                          setCategorias(prev => ({ ...prev, [cat]: updatedCat }));
                          recompilarLlave(cat, updatedCat.players, updatedCat.type);
                          setEditingPlayer({ cat, index: updatedCat.players.length - 1, name: newPlayer.name });
                       }}
                       className="mt-2 text-xs py-2 bg-slate-800/50 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-medium rounded transition-colors flex items-center justify-center gap-2 border border-dashed border-slate-700 hover:border-slate-600"
                    >
                       <PlusCircle className="w-3.5 h-3.5" /> AGREGAR JUGADOR
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}
        {/* LLAVES VIEW (NATIVE DESARROLLO) */}
        {view === 'llaves' && (
          <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
            <div className="print-hide flex items-center gap-4 p-4 border-b border-slate-800 bg-slate-900/50 shrink-0 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest shrink-0 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5"/> Modulo Nativo:
                 <span className="text-[9px] text-slate-500 ml-1 hidden sm:inline normal-case">(Usa las flechas ← →)</span>
              </span>
              {Object.keys(nativeBrackets).map(cat => (
                 <button 
                   key={cat}
                   draggable
                   onDragStart={(e) => {
                      setDragCat(cat);
                   }}
                   onDragEnd={() => {
                      setDragCat(null);
                      setDragOverCat(null);
                   }}
                   onDragOver={(e) => {
                      e.preventDefault();
                      if (dragCat && dragCat !== cat) {
                         setDragOverCat(cat);
                      }
                   }}
                   onDragLeave={(e) => {
                      if (dragOverCat === cat) {
                         setDragOverCat(null);
                      }
                   }}
                   onDrop={(e) => {
                      if (dragCat && dragCat !== cat) {
                          setCategorias(prev => {
                             const keys = Object.keys(prev);
                             const fromIndex = keys.indexOf(dragCat);
                             const toIndex = Object.keys(nativeBrackets).indexOf(cat);
                             // Need to map the toIndex in nativeBrackets to categorias to keep both synced.
                             // More safe approach: just use the parent's logic!
                             if (fromIndex > -1) {
                                 const toIndexCat = keys.indexOf(cat);
                                 const newKeys = [...keys];
                                 const [moved] = newKeys.splice(fromIndex, 1);
                                 newKeys.splice(toIndexCat > -1 ? toIndexCat : toIndex, 0, moved);
                                 
                                 const next: any = {};
                                 newKeys.forEach(k => next[k] = prev[k]);
                                 return next;
                             }
                             return prev;
                          });
                          
                          setNativeBrackets(prev => {
                             const keys = Object.keys(prev);
                             const fromIndex = keys.indexOf(dragCat);
                             const toIndex = keys.indexOf(cat);
                             if (fromIndex > -1 && toIndex > -1) {
                                 const newKeys = [...keys];
                                 const [moved] = newKeys.splice(fromIndex, 1);
                                 newKeys.splice(toIndex, 0, moved);

                                 const next: any = {};
                                 newKeys.forEach(k => next[k] = prev[k]);
                                 return next;
                             }
                             return prev;
                          });
                          showToast(`Categoría movida`, 'ok');
                      }
                      setDragCat(null);
                      setDragOverCat(null);
                   }}
                   onClick={() => setSelectedNativeCat(cat)}
                   className={`px-3 py-1.5 rounded-full border text-xs whitespace-nowrap transition-all ${
                     dragCat === cat ? 'opacity-50' : ''
                   } ${
                     dragOverCat === cat ? 'border-indigo-400 bg-indigo-500/20 px-6' : ''
                   } ${selectedNativeCat === cat ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                   {cat}
                 </button>
              ))}
              
              <div className="ml-auto flex items-center bg-transparent shrink-0">
                 {/* Botones movidos al Control Bar */}
              </div>
            </div>
            
            <div 
               id="bracket-capture-container"
               ref={containerRef}
               onPointerDown={handlePointerDown}
               onPointerMove={handlePointerMove}
               onPointerUp={handlePointerUp}
               onPointerLeave={handlePointerUp}
               className={`flex-1 relative flex items-start ${printMode ? 'bg-white overflow-visible' : 'overflow-auto bg-slate-900'} ${isPanning && !printMode ? 'cursor-grabbing select-none touch-none' : printMode ? '' : 'cursor-grab select-none'}`}
            >
               {printMode && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] print-hide flex items-center gap-4 bg-slate-900 border-2 border-slate-700 p-2 rounded-full shadow-2xl animate-fade-in">
                     <button
                        onClick={() => window.print()}
                        className="px-6 py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-full flex items-center gap-2"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        INICIAR IMPRESIÓN
                     </button>
                     <button
                        onClick={() => setPrintMode(false)}
                        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full flex items-center gap-2"
                     >
                        <X className="w-5 h-5" />
                        CERRAR
                     </button>
                  </div>
               )}
               {selectedNativeCat && nativeBrackets[selectedNativeCat] ? (
                  <div id="bracket-capture-inner" className="min-w-fit min-h-fit p-8 print-bg">
                    <BracketRenderer 
                       printMode={printMode}
                       mode={bracketMode}
                       programmedMatches={programmedMatchesByMatchId}
                       matchQueue={matchQueue}
                       bracket={nativeBrackets[selectedNativeCat]}
                       onQueueMatch={(bMatch) => {
                          // Add to queue
                          setMatchQueue(prev => {
                             const next = new Set(prev);
                             next.add(bMatch.id);
                             return next;
                          });
                          showToast(`Partido en espera para ser programado ⭐`, 'ok');
                       }}
                       onUnscheduleMatch={(matchId) => {
                          let removed = false;
                          const pKey = Object.keys(partidos).find(key => partidos[key].matchId === matchId);
                          if (pKey) {
                             const next = { ...partidos };
                             delete next[pKey];
                             setPartidos(next);
                             removed = true;
                          }
                          setMatchQueue(prev => {
                             if (prev.has(matchId)) {
                                const next = new Set(prev);
                                next.delete(matchId);
                                removed = true;
                                return next;
                             }
                             return prev;
                          });
                          if (removed) {
                             showToast('Partido desprogramado y removido de la bandeja', 'ok');
                          }
                       }}
                       onSetWinner={(matchId, winner) => {
                           // Find match to pre-populate modal
                           // Reconstruct pseudo 'Partido' object to pass to modal
                           import('./lib/bracket').then(({ getMatchById }) => {
                              const bMatch = getMatchById(nativeBrackets[selectedNativeCat], matchId);
                              if (bMatch && bMatch.p1 && bMatch.p2) {
                                 setReportScoreModal({
                                    k: '', // Empty because it's native bracket click, not grid
                                    p: {
                                      cat: selectedNativeCat,
                                      j1: bMatch.p1.name,
                                      j2: bMatch.p2.name,
                                      ronda: bMatch.winner ? 'Editar' : 'Pendiente',
                                      matchId: matchId,
                                      winner: null,
                                      score: ''
                                    },
                                    winner: null,
                                    score: ''
                                 });
                              }
                           });
                       }}
                    />
                  </div>
               ) : (
                  <div className="flex items-center justify-center w-full min-h-[400px] text-slate-500 text-sm font-mono print-hide">
                    Construyendo estructura matemática de llaves...
                  </div>
               )}
            </div>

            {/* CONTROL BAR */}
            <div className="print-hide shrink-0 bg-slate-950 border-t border-slate-800 px-3 py-2 flex items-center gap-3 overflow-x-auto no-scrollbar shadow-[0_-5px_20px_rgba(0,0,0,0.5)] z-50">
               <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest pl-1 shrink-0">
                 Control Bar
               </div>
               
               <div className="flex items-center bg-slate-900 border border-slate-700 rounded-md overflow-hidden shrink-0">
                 <button 
                   onClick={() => setBracketMode('informar')}
                   className={`px-3 py-1.5 text-[11px] font-bold transition-colors ${bracketMode === 'informar' ? 'bg-sky-500 text-sky-950' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                   🏆 INFORMAR
                 </button>
                 <button 
                   onClick={() => setBracketMode('programar')}
                   className={`px-3 py-1.5 text-[11px] font-bold transition-colors border-l border-slate-800 ${bracketMode === 'programar' ? 'bg-orange-400 text-orange-950 border-orange-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                   <ShieldCheck className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> PROGRAMAR
                 </button>
               </div>

               <div className="flex-1"></div>

               <div className="flex items-center justify-end gap-2 shrink-0">
                  <button 
                     onClick={() => {
                        setPrintMode(true);
                        showToast('Vista previa activada. Haz clic en "INICIAR IMPRESIÓN" arriba.', 'ok');
                     }}
                     className={`px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded flex items-center gap-1.5 border border-slate-700`}
                     title="Abrir vista de impresión B/N"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                     IMPRIMIR
                  </button>

                  <button 
                     onClick={() => {
                        const target = document.getElementById('bracket-capture-inner');
                        const container = document.getElementById('bracket-capture-container');
                        if (target && container) {
                           showToast('Generando imagen para WhatsApp... (Recuerda enviarla en calidad HD)', 'ok');
                           
                           const oldOvf = container.style.overflow;
                           container.style.overflow = 'visible';

                            setTimeout(() => {
                               toJpeg(target, { 
                                  backgroundColor: '#0f172a',
                                  pixelRatio: 2,
                                  width: target.scrollWidth,
                                  height: target.scrollHeight,
                                  style: { transform: 'none', transformOrigin: 'top left', margin: '0', width: `${target.scrollWidth}px`, height: `${target.scrollHeight}px` }
                               }).then((dataUrl) => {
                                  container.style.overflow = oldOvf;
                                  const link = document.createElement('a');
                                  link.download = `llave_${selectedNativeCat?.replace(/\s+/g, '_')}_${fechaActiva.d}_${fechaActiva.m}_whatsapp.jpg`;
                                  link.href = dataUrl;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  showToast('Descargado', 'ok');
                               }).catch(e => {
                                  container.style.overflow = oldOvf;
                                  showToast('Error', 'err');
                               });
                           }, 400);
                        }
                     }}
                     className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1DA851] text-white text-[11px] font-bold rounded flex items-center gap-1.5 shadow-sm"
                     title="Fondo oscuro para WhatsApp"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                     WHATSAPP
                  </button>

                  <button 
                     onClick={() => {
                        const target = document.getElementById('bracket-capture-inner');
                        const container = document.getElementById('bracket-capture-container');
                        if (target && container) {
                           showToast('Generando imagen... (Recuerda enviarla en calidad HD si usas WhatsApp)', 'ok');
                           setPrintMode(true);
                           
                           // Give React enough time to flush printMode classes
                           setTimeout(() => {
                              const oldOvf = container.style.overflow;
                              container.style.overflow = 'visible';

                              const sw = target.scrollWidth;
                              const sh = target.scrollHeight;

                              // Calculate A4 Landscape dimensions
                              let finalW = sw;
                              let finalH = sh;
                              const ASPECT_A4 = 1.414;
                              
                              if (sw / sh > ASPECT_A4) {
                                 finalH = sw / ASPECT_A4;
                              } else {
                                 finalW = sh * ASPECT_A4;
                              }

                              const oldWidth = target.style.width;
                              const oldHeight = target.style.height;
                              const oldDisplay = target.style.display;
                              const oldJustify = target.style.justifyContent;
                              const oldAlign = target.style.alignItems;

                              // Temporarily style target
                              target.style.width = `${finalW}px`;
                              target.style.height = `${finalH}px`;
                              target.style.display = 'flex';
                              target.style.justifyContent = 'center';
                              target.style.alignItems = 'center';

                              setTimeout(() => {
                                 toJpeg(target, { 
                                    backgroundColor: '#ffffff',
                                    pixelRatio: 2,
                                    width: finalW,
                                    height: finalH,
                                    style: { transform: 'none', transformOrigin: 'top left', margin: '0', width: `${finalW}px`, height: `${finalH}px` }
                                 }).then((dataUrl) => {
                                    container.style.overflow = oldOvf;
                                    target.style.width = oldWidth;
                                    target.style.height = oldHeight;
                                    target.style.display = oldDisplay;
                                    target.style.justifyContent = oldJustify;
                                    target.style.alignItems = oldAlign;
                                    
                                    const link = document.createElement('a');
                                    link.download = `llave_${selectedNativeCat?.replace(/\s+/g, '_')}_${fechaActiva.d}_${fechaActiva.m}_imprimir.jpg`;
                                    link.href = dataUrl;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    setPrintMode(false);
                                    showToast('Descargado', 'ok');
                                 }).catch(e => {
                                    container.style.overflow = oldOvf;
                                    target.style.width = oldWidth;
                                    target.style.height = oldHeight;
                                    target.style.display = oldDisplay;
                                    target.style.justifyContent = oldJustify;
                                    target.style.alignItems = oldAlign;
                                    setPrintMode(false);
                                    showToast('Error', 'err');
                                 });
                              }, 100);
                           }, 400); // 400ms for React to apply classes
                        }
                     }}
                     className="px-3 py-1.5 bg-slate-100 hover:bg-white text-slate-900 text-[11px] font-bold rounded flex items-center gap-1.5 shadow-sm"
                     title="Fondo blanco para ahorrar tinta"
                  >
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                     IMG B/N
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* CREAR TORNEO VIEW */}
        {view === 'crear' && (
          <div className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-10 text-slate-200">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="font-sans text-2xl font-light tracking-tight text-white mb-2">Asistente de Creación de Torneo</h2>
                <p className="text-sm text-slate-500">Crea tu torneo y sus categorías simultáneamente. Se generarán los cuadros y llaves de eliminación de manera 100% nativa sin depender de APIs de terceros.</p>
              </div>

              <div className="glass border border-slate-800 rounded-xl p-6 sm:p-8 mb-8 relative z-10 shadow-2xl">
                <div className="mb-6">
                  <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">1. Nombre del Torneo General</label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="Ej. Glorias Navales 2026"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-base text-white outline-none focus:border-emerald-500/50 transition-colors shadow-inner"
                  />
                  <p className="text-[10px] text-slate-600 mt-2">La categoría se añadirá entre paréntesis automáticamente. Ej: {creatorName || 'Torneo'} (Singles Honor).</p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-widest">2. Categorías y Participantes</label>
                <button
                  onClick={() => setCreatorCats([...creatorCats, { id: Date.now(), name: '', type: 'single elimination', matchMode: 'singles', players: '' }])}
                  className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg flex items-center transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1" /> Añadir Categoría
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                {creatorCats.map((cat, idx) => (
                  <div key={cat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative group">
                    <button 
                      onClick={() => setCreatorCats(creatorCats.filter(c => c.id !== cat.id))}
                      className="absolute top-4 right-4 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      title="Eliminar categoría"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <div className="mb-4 pr-6">
                       <label className="block text-[10px] text-slate-500 mb-1.5">Nombre de Categoría</label>
                       <input 
                         type="text"
                         value={cat.name}
                         onChange={(e) => setCreatorCats(creatorCats.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                         placeholder="Ej. Dobles Primera" 
                         className="w-full bg-slate-800/40 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50" 
                       />
                    </div>
                    
                    <div className="flex gap-4 mb-4">
                      <div className="flex-1">
                         <label className="block text-[10px] text-slate-500 mb-1.5">Formato del Cuadro</label>
                         <select 
                           value={cat.type}
                           onChange={(e) => setCreatorCats(creatorCats.map(c => c.id === cat.id ? { ...c, type: e.target.value } : c))}
                           className="w-full bg-slate-800/40 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50 appearance-none"
                         >
                           <option value="single elimination">Eliminación directa</option>
                           <option value="double elimination">Doble llave (Double Elimination)</option>
                           <option value="round robin">Round Robin (Todos contra todos)</option>
                         </select>
                      </div>
                      <div className="w-[120px] shrink-0">
                         <label className="block text-[10px] text-slate-500 mb-1.5">Modalidad</label>
                         <select 
                           value={cat.matchMode || 'singles'}
                           onChange={(e) => setCreatorCats(creatorCats.map(c => c.id === cat.id ? { ...c, matchMode: e.target.value as any } : c))}
                           className="w-full bg-slate-800/40 border border-slate-700 rounded p-2 text-sm text-white outline-none focus:border-blue-500/50 appearance-none"
                         >
                           <option value="singles">Singles</option>
                           <option value="doubles">Dobles</option>
                         </select>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/20 border border-slate-700/50 rounded-lg">
                       <label className="block text-[10px] text-slate-500 mb-2 flex justify-between items-center">
                         <span>Participantes ({cat.matchMode === 'doubles' ? 'Parejas' : 'Jugadores'})</span>
                         <span className="text-slate-400 font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">{cat.players.split('\n').filter(p=>p.trim() && p.trim() !== '-').length} val</span>
                       </label>
                       
                       <ParticipantListEditor
                         value={cat.players}
                         matchMode={cat.matchMode || 'singles'}
                         onChange={(val) => setCreatorCats(creatorCats.map(c => c.id === cat.id ? { ...c, players: val } : c))}
                       />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Bottom Sticky Action Bar */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 border-t border-slate-800 backdrop-blur-md flex justify-center z-50">
                <button
                  disabled={!creatorName || creatorCats.length === 0}
                  onClick={() => {
                    if (!creatorName) return showToast('El torneo general necesita un nombre', 'err');
                    
                    const payload = {
                      baseName: creatorName.trim(),
                      categories: creatorCats.map(c => ({
                        catName: c.name.trim(),
                        type: c.type,
                        players: c.players.split('\n').map(p=>p.trim()).filter(Boolean)
                      })).filter(c => c.catName !== '' && c.players.length > 0)
                    };

                    import('./lib/bracket').then(({ generateBracket }) => {
                       const newCats: Record<string, {type: string, players: {name: string, seed: number}[]}> = {};
                       const newBrackets: Record<string, any> = {};
                       
                       payload.categories.forEach(cat => {
                           const playersList = cat.players.map((p, i) => ({ name: p, seed: i + 1 }));
                           newCats[cat.catName] = { type: cat.type, players: playersList };
                           newBrackets[cat.catName] = generateBracket(cat.catName, playersList, cat.type, payload.baseName);
                       });

                        if (Object.keys(categorias).length === 0) {
                           setCategorias(newCats);
                           setNativeBrackets(newBrackets);
                           setPartidos({});
                           showToast('¡Torneos creados y activados exitosamente!', 'ok');
                        } else {
                           setCategorias(prev => ({ ...prev, ...newCats }));
                           setNativeBrackets(prev => ({ ...prev, ...newBrackets }));
                           showToast('¡Categorías agregadas exitosamente!', 'ok');
                        }
                        
                        setView('llaves');
                    });
                  }}
                  className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-bold tracking-wide transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  <>🚀 {Object.keys(categorias).length > 0 ? 'AGREGAR CATEGORÍAS' : 'CREAR TORNEO'}</>
                </button>
              </div>
            </div>
            {/* spacer for bottom bar */}
            <div className="h-24"></div>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 border rounded-xl py-3 px-4 text-xs z-[500] shadow-2xl max-w-sm flex items-start gap-2 bg-slate-900 ${toast.type === 'err' ? 'border-red-500/50 text-red-300' : toast.type === 'ok' ? 'border-emerald-500/40 text-emerald-400' : 'border-amber-500/40 text-amber-400'}`}>
           <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
           <div className="whitespace-pre-line">{toast.msg}</div>
        </div>
      )}

      {/* MODAL RONDA */}
      {editRondaModal && partidos[editRondaModal] && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[400] backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-[400px] max-w-full shadow-2xl relative">
             <button onClick={() => setEditRondaModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
             <h3 className="font-sans text-lg font-light tracking-tight text-white mb-1">Editar partido</h3>
             <div className="text-[11px] text-slate-500 mb-5 leading-relaxed">
               <span className="text-white font-medium">{partidos[editRondaModal].j1} vs {partidos[editRondaModal].j2}</span><br/>
               Cancha {partidos[editRondaModal].c} / {partidos[editRondaModal].h}
               {cfMap[editRondaModal]?.tipo === 'mismo' && <div className="text-red-400 mt-1 font-mono text-[9px] uppercase tracking-wider">⚠ Conflicto de horario</div>}
               {cfMap[editRondaModal]?.tipo === 'bloque' && <div className="text-amber-500 mt-1 font-mono text-[9px] uppercase tracking-wider">⏱ Poco descanso</div>}
             </div>
             <div className="mb-6 relative">
                <label className="block text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-2">Ronda</label>
                <div className="relative">
                   <button 
                     onClick={() => {
                        if (!editRondaDropOpen && partidos[editRondaModal]) {
                           setEditRondaVal(partidos[editRondaModal].ronda);
                        }
                        setEditRondaDropOpen(!editRondaDropOpen);
                     }}
                     className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs text-white outline-none focus:border-blue-500/50 transition-colors flex items-center justify-between gap-2"
                   >
                     <span>{editRondaDropOpen || editRondaVal ? editRondaVal : partidos[editRondaModal].ronda}</span>
                     <ChevronDown className="w-3 h-3 text-slate-400" />
                   </button>
                   {editRondaDropOpen && (
                     <>
                       <div className="fixed inset-0 z-[60]" onClick={() => setEditRondaDropOpen(false)} />
                       <div className="absolute top-full mt-1 left-0 w-full min-w-[140px] bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 z-[80] max-h-48 overflow-y-auto no-scrollbar">
                          {['1era Ronda','2da Ronda','3era Ronda','4ta Ronda','Cuartos de final','Semifinal','Final','3er lugar'].map(r => (
                             <button
                               key={r}
                               onClick={() => { setEditRondaVal(r); setEditRondaDropOpen(false); }}
                               className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-800 ${editRondaVal === r || (partidos[editRondaModal].ronda === r && !editRondaVal) ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}
                             >
                               {r}
                             </button>
                          ))}
                       </div>
                     </>
                   )}
                </div>
             </div>
             <div className="flex gap-2 justify-end">
               <button onClick={() => setDeleteKey(editRondaModal)} className="px-4 py-2 rounded text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all mr-auto">Eliminar</button>
               <button onClick={() => setEditRondaModal(null)} className="px-4 py-2 rounded text-xs font-medium text-slate-500 hover:text-white transition-all border border-transparent hover:border-slate-700">Cancelar</button>
               <button onClick={() => {
                 setPartidos({ ...partidos, [editRondaModal]: { ...partidos[editRondaModal], ronda: editRondaVal || partidos[editRondaModal].ronda }});
                 setEditRondaModal(null);
                 showToast('Ronda actualizada', 'ok');
               }} className="px-5 py-2 rounded text-xs font-medium bg-white text-black hover:bg-slate-200 transition-all">Guardar</button>
             </div>
          </div>
        </div>
      )}

      {/* MODAL SELECTOR MÚLTIPLE */}
      {selModal && (
        <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[60px] z-[400] backdrop-blur-md p-4" onClick={(e) => { if (e.target === e.currentTarget) setSelModal(null); }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[460px] max-w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-[16px_18px_12px] border-b border-slate-800 shrink-0">
              <h3 className="font-sans text-base font-bold text-blue-400 mb-1.5">Seleccionar partido</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-blue-500/10 border border-blue-500/20 rounded-md px-2.5 py-1 text-[11px] text-blue-300 font-mono font-medium">Cancha {selModal.c}</span>
                <span className="bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-[11px] text-white font-mono">{selModal.h}</span>
                <span className="text-[11px] text-slate-500">— elige el partido</span>
              </div>
            </div>
            
            <div className="p-[10px_18px] border-b border-slate-800 shrink-0">
              <input 
                type="text"
                placeholder="Buscar jugador o categoría..." 
                value={selSearch}
                onChange={(e) => setSelSearch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs font-sans outline-none focus:border-blue-500/50"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-[10px_14px] flex flex-col gap-1.5 min-h-[150px]">
              {(() => {
                const terms = selSearch.toLowerCase().split(' ').filter(Boolean);
                const filtered = currentPendientes.filter(p => 
                  terms.every(t => p.j1.toLowerCase().includes(t) || p.j2.toLowerCase().includes(t) || p.cat.toLowerCase().includes(t))
                );
                
                if (!filtered.length) {
                  return <div className="p-5 text-center text-slate-500 text-xs">No hay partidos pendientes</div>;
                }
                
                return filtered.map((p, i) => {
                  const errs = verificarAsig(p.j1, p.j2, selModal.c, selModal.h, null);
                  const rojo = errs.filter(x => x.tipo === 'mismo' || x.tipo === 'tercero');
                  const nar = errs.filter(x => x.tipo === 'bloque');
                  const bloqueado = rojo.length > 0;
                  const conAviso = !bloqueado && nar.length > 0;
                  const isSel = selPend && ((selPend.matchId && p.matchId && selPend.matchId === p.matchId) || (!selPend.matchId && selPend.j1 === p.j1 && selPend.j2 === p.j2 && selPend.cat === p.cat));
                  
                  // Stars logic
                  const starCount = p.starCount || (p.isQfOrLater ? 2 : 1);
                  const isTired1 = p.j1 && tiredPlayersSet.has(normalizeName(p.j1));
                  const isTired2 = p.j2 && tiredPlayersSet.has(normalizeName(p.j2));
                  const showOrangeStar = starCount > 1 && (isTired1 || isTired2);
                  const starStr = '⭐'.repeat(starCount);
                  const starColor = showOrangeStar ? "text-orange-500 drop-shadow-[0_0_2px_rgba(249,115,22,0.8)]" : "text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]";

                  return (
                    <div 
                      key={p.matchId || `${p.cat}-${p.j1}-${p.j2}`} 
                      className={`flex items-center gap-2.5 p-[10px_12px] rounded-lg border transition-all border-l-[3px] 
                        ${bloqueado ? 'opacity-40 cursor-not-allowed bg-slate-900 border-transparent' : 'cursor-pointer hover:bg-slate-800 hover:border-slate-700 bg-slate-800/50'} 
                        ${isSel ? 'border-blue-500/50 bg-blue-500/10 border-l-blue-400' : 'border-transparent border-l-transparent'}
                        ${conAviso ? 'border-l-amber-500/80' : ''}`}
                      onClick={() => {
                        if (!bloqueado) {
                          setSelPend(p);
                          setSelRondaNew(p.ronda || '1era Ronda');
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className={`text-[10px] leading-none ${starColor}`} title={showOrangeStar ? 'Jugador en receso' : ''}>{starStr}</span>
                           <div className="text-[9px] uppercase font-mono tracking-wider" style={{ color: catColor(p.cat) }}>{p.cat}</div>
                           {p.ronda && <div className="text-[9px] font-mono text-slate-400 tracking-wide uppercase bg-slate-800 px-1.5 py-0.5 rounded">{p.ronda}</div>}
                        </div>
                        <div className="text-xs font-medium text-white leading-tight">{p.j1} <span className="text-[10px] text-slate-500 italic">vs</span> {p.j2}</div>
                        {bloqueado && <div className="text-[9px] font-mono text-red-400 mt-1">⚠ {rojo[0].msg}</div>}
                        {conAviso && <div className="flex items-center gap-1 mt-1 text-[9px] font-mono text-amber-500"><AlertTriangle className="w-2.5 h-2.5"/> {nar[0].msg}</div>}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${isSel ? 'border-blue-400 bg-blue-400 text-black' : 'border-slate-700 text-transparent'}`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div className="p-[12px_18px] border-t border-slate-800 flex items-center justify-between shrink-0 gap-2.5 bg-slate-950">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                Ronda:
                <div className="relative">
                   <button 
                     onClick={() => setSelRondaDropOpen(!selRondaDropOpen)}
                     className="p-[6px_10px] bg-slate-800 border border-slate-700 rounded-md text-white text-xs outline-none focus:border-blue-500/50 flex items-center justify-between gap-2 min-w-[120px]"
                   >
                     <span>{selRondaNew}</span>
                     <ChevronDown className="w-3 h-3 text-slate-400" />
                   </button>
                   {selRondaDropOpen && (
                     <>
                       <div className="fixed inset-0 z-[60]" onClick={() => setSelRondaDropOpen(false)} />
                       <div className="absolute top-full mt-1 left-0 w-full min-w-[140px] bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 z-[80] max-h-48 overflow-y-auto no-scrollbar">
                          {['1era Ronda','2da Ronda','3era Ronda','4ta Ronda','Cuartos de final','Semifinal','Final','3er lugar'].map(r => (
                             <button
                               key={r}
                               onClick={() => { setSelRondaNew(r); setSelRondaDropOpen(false); }}
                               className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-slate-800 ${selRondaNew === r ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}
                             >
                               {r}
                             </button>
                          ))}
                       </div>
                     </>
                   )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setSelModal(null)} className="px-4 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:text-white border border-slate-800 hover:bg-slate-800 transition-all">Cancelar</button>
                <button 
                  disabled={!selPend}
                  onClick={() => {
                    if (!selPend || !selModal) return;
                    const c = selModal.c;
                    const h = selModal.h;
                    const ronda = selRondaNew;
                    const errs = verificarAsig(selPend.j1, selPend.j2, c, h, null);
                    const rojo = errs.filter(x => x.tipo === 'mismo' || x.tipo === 'tercero');
                    const nar = errs.filter(x => x.tipo === 'bloque');
                    if (rojo.length) { showToast(`Conflicto:\n${rojo[0].msg}`, 'err'); return; }
                    
                    setPartidos({ ...partidos, [slotKey(curDK, c, h)]: { ...selPend, c, h, ronda, dk: curDK }});
                    setSelModal(null);
                    setSelPend(null);
                    if (nar.length) showToast(`Asignado con aviso:\n${nar[0].msg}`, 'warn');
                    else showToast(`Partido asignado · Cancha ${c} · ${h}`, 'ok');
                  }} 
                  className="px-4 py-1.5 rounded-md text-xs font-medium bg-white text-black hover:bg-gray-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Asignar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE MODAL */}
      {deleteKey && partidos[deleteKey] && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600] backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-[350px] max-w-full shadow-2xl relative">
            <h3 className="font-sans text-lg font-light tracking-tight text-white mb-2">¿Desprogramar partido?</h3>
            <p className="text-xs text-slate-500 mb-6">
              <span className="text-slate-300">{partidos[deleteKey].j1} vs {partidos[deleteKey].j2}</span><br />
              El partido será desprogramado de la cancha y volverá a la bandeja de pendientes.
            </p>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => setDeleteKey(null)} 
                className="px-4 py-2 rounded text-xs font-medium text-slate-500 hover:text-white transition-all border border-transparent hover:border-slate-800">
                Cancelar
              </button>
              <button 
                onClick={() => {
                  const next = { ...partidos }; 
                  delete next[deleteKey]; 
                  setPartidos(next); 
                  setDeleteKey(null);
                  if (editRondaModal === deleteKey) setEditRondaModal(null);
                  showToast('Partido desprogramado y retornado a bandeja', 'ok');
                }} 
                className="px-5 py-2 rounded text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all border border-red-500/20 shadow-md">
                Desprogramar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCORE REPORT MODAL */}
      {reportScoreModal && (
         <ReportScoreModal 
           partido={reportScoreModal.p}
           onClose={() => setReportScoreModal(null)}
           onSave={(winner, scoreStr) => {
              const { k, p } = reportScoreModal;
              
              // 1. Update native bracket
              const catBracket = nativeBrackets[p.cat];
              if (catBracket) {
                 // The matchId string or (rIndex/mIndex fallback for back compat)
                 const targetMatchId = p.matchId ? String(p.matchId) : (catBracket.rounds[p.rIndex as number]?.[p.mIndex as number]?.id);
                 
                 if (targetMatchId) {
                    const updated = setMatchWinner(catBracket, targetMatchId, winner, scoreStr);
                    setNativeBrackets(prev => ({ ...prev, [p.cat]: updated }));
                 }
              }

              // 2. Update grid slot partido
              if (k) {
                 setPartidos(prev => ({
                    ...prev,
                    [k]: { ...p, winner, score: scoreStr }
                 }));
              } else if (p.matchId) {
                 // Set winner in grid if entered from bracket
                 setPartidos(prev => {
                    const next = { ...prev };
                    let changed = false;
                    Object.entries(next).forEach(([gridKey, gridP]: [string, any]) => {
                       if (gridP.matchId === p.matchId) {
                          next[gridKey] = { ...gridP, winner, score: scoreStr };
                          changed = true;
                       }
                    });
                    return changed ? next : prev;
                 });
              }

              // 3. Remove from queue if it has a winner, or add back if cleared and not queued
              if (p.matchId) {
                 setMatchQueue(prev => {
                    const q = new Set(prev);
                    if (winner !== null) {
                       q.delete(String(p.matchId));
                    } else {
                       const isProgrammed = Object.values(partidos).some((gridP: any) => gridP.matchId === p.matchId);
                       if (!isProgrammed) {
                          q.add(String(p.matchId));
                       }
                    }
                    return q;
                 });
              }

              if (winner === null) {
                 showToast('Marcador limpiado correctamente', 'ok');
              } else {
                 showToast(`Marcador registrado: Ganador ${winner === 'p1' ? p.j1 : p.j2}`, 'ok');
              }
              setReportScoreModal(null);
           }}
         />
      )}

      {/* CUSTOM VACIAR BANDEJA CONFIRM MODAL */}
      {confirmVaciar && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600] backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-[400px] max-w-full shadow-2xl relative">
            <h3 className="font-sans text-xl font-medium tracking-tight text-white mb-3 text-red-400">Vaciar Bandeja</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              ¿Seguro que deseas remover todos los partidos de la bandeja de salida a cancha? No se perderán, volverán a sus llaves respectivas.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button 
                onClick={() => setConfirmVaciar(false)} 
                className="px-5 py-2.5 rounded text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700">
                Cancelar
              </button>
              <button 
                onClick={() => {
                   setMatchQueue(new Set());
                   setConfirmVaciar(false);
                   showToast('Bandeja vaciada', 'ok');
                }} 
                className="px-5 py-2.5 rounded text-sm font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30 transition-all shadow-md">
                Sí, Vaciar Bandeja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ELIMINAR CATEGORIA CONFIRM MODAL */}
      {catToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600] backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-[420px] max-w-full shadow-2xl relative">
            <h3 className="font-sans text-xl font-medium tracking-tight text-white mb-3 text-red-400">Eliminar Categoría</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              ¿Seguro que deseas eliminar la categoría <strong className="text-white">{catToDelete}</strong>? Todos los jugadores y partidos programados de esta categoría serán eliminados de forma permanente.
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button 
                onClick={() => setCatToDelete(null)} 
                className="px-5 py-2.5 rounded text-sm font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700">
                Cancelar
              </button>
              <button 
                onClick={() => {
                   const cat = catToDelete;
                   setCategorias(prev => {
                      const next = { ...prev };
                      delete next[cat];
                      return next;
                   });
                   setNativeBrackets(prev => {
                      const next = { ...prev };
                      delete next[cat];
                      return next;
                   });
                   setPartidos(prev => {
                      const next = { ...prev };
                      Object.keys(next).forEach(k => {
                         if (next[k].cat === cat) {
                            delete next[k];
                         }
                      });
                      return next;
                   });
                   if (selectedNativeCat === cat) {
                      setSelectedNativeCat(null);
                   }
                   setMatchQueue(prev => {
                      const next = new Set(prev);
                      // Match queues IDs for native brackets are native match IDs which we can't easily correlate without looping, but we can clear them when rendering
                      // However we don't have to delete them explicitly, just clearing category is enough.
                      return next;
                   });
                   setCatToDelete(null);
                   showToast(`Categoría ${cat} eliminada`, 'ok');
                }} 
                className="px-5 py-2.5 rounded text-sm font-semibold bg-red-500 text-white hover:bg-red-600 border border-red-600 transition-all shadow-md">
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM NUEVO TORNEO CONFIRM MODAL */}
      {confirmNuevoTorneo && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[600] backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-[420px] max-w-full shadow-2xl relative">
            <h3 className="font-sans text-xl font-medium tracking-tight text-white mb-3">¿Qué deseas hacer?</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Ya tienes un torneo en curso. Puedes <strong>agregar nuevas categorías</strong> al actual o <strong>comenzar uno de cero</strong>.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setCreatorCats([{ id: Date.now(), name: '', type: 'single elimination', matchMode: 'singles', players: '' }]);
                  setConfirmNuevoTorneo(false);
                  setView('crear');
                }} 
                className="w-full px-5 py-3 rounded text-sm font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black transition-all shadow-md flex items-center justify-center gap-2">
                <PlusCircle className="w-4 h-4" /> Agregar más categorías al torneo actual
              </button>
              <button 
                onClick={executeNuevoTorneo} 
                className="w-full px-5 py-3 rounded text-sm font-bold bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white transition-all shadow-md flex justify-center break-words whitespace-normal text-center leading-tight hover:leading-tight">
                Crear torneo nuevo (perderá toda la información actual)
              </button>
              <button 
                onClick={() => setConfirmNuevoTorneo(false)} 
                className="w-full px-4 py-2 mt-2 rounded text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-slate-800">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
