// src/lib/bracket.ts

export interface BracketPlayer {
  name: string;
  seed?: number;
  isBye?: boolean;
}

export interface BracketMatch {
  id: string; 
  round: number; 
  matchIndex: number;
  p1: BracketPlayer | null;
  p2: BracketPlayer | null;
  p1Source?: string; 
  p2Source?: string;
  winner: 'p1' | 'p2' | null;
  score: string;
  nextMatchId: string | null;
  loserNextMatchId?: string | null; 
  isNextMatchP1: boolean;
  isLoserNextMatchP1?: boolean;
  
  // Custom flags for special matches
  isThirdPlace?: boolean;
  isGrandFinal?: boolean;
  isGrandFinalReset?: boolean;

  // New Logistic nomenclature
  branchLabel?: string;
  minSeed?: number;
  p1MinSeed?: number;
  p2MinSeed?: number;
}

export interface RRGroup {
  name: string;
  players: BracketPlayer[];
  matches: BracketMatch[];
}

export interface NativeBracket {
  id: string; 
  tournamentName?: string;
  type?: string; // 'single elimination', 'double elimination', 'round robin'
  rounds: BracketMatch[][];
  loserRounds?: BracketMatch[][];
  thirdPlaceMatch?: BracketMatch | null;
  grandFinal?: BracketMatch | null;
  grandFinalReset?: BracketMatch | null;
  groups?: RRGroup[];
  standings?: Record<string, {p: number, w: number, l: number, sw?: number, sl?: number, gw?: number, gl?: number, s: string}>;
}

export function getSeedOrder(size: number): number[] {
  if (size === 2) return [1, 2];
  const prev = getSeedOrder(size / 2);
  const res: number[] = [];
  for (let i = 0; i < prev.length; i++) {
    const p = prev[i];
    if (i % 2 === 0) {
      res.push(p);
      res.push(size + 1 - p);
    } else {
      res.push(size + 1 - p);
      res.push(p);
    }
  }
  return res;
}

export function generateBracket(categoryId: string, players: {name: string, seed: number}[], type: string = 'single elimination', tournamentName?: string): NativeBracket {
  if (type === 'round robin') {
    return generateRoundRobin(categoryId, players, tournamentName);
  }
  
  const sorted = [...players].sort((a, b) => a.seed - b.seed);
  const numPlayers = sorted.length;
  if (numPlayers < 2) return { id: categoryId, tournamentName, type, rounds: [] };
  
  const roundsCount = Math.ceil(Math.log2(numPlayers));
  const bracketSize = Math.pow(2, roundsCount); 
  const seedOrder = getSeedOrder(bracketSize); 
  
  const firstRoundPlayers: BracketPlayer[] = seedOrder.map(seed => {
    if (seed > numPlayers) return { name: 'BYE', isBye: true };
    return sorted[seed - 1];
  });

  const bracketRounds: BracketMatch[][] = [];
  
  // 1. Build Winner Bracket
  for (let r = 0; r < roundsCount; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r + 1);
    const roundMatches: BracketMatch[] = [];
    for (let m = 0; m < matchesInRound; m++) {
      const nextMatchId = r < roundsCount - 1 ? `${categoryId}_W_R${r+1}_M${Math.floor(m/2)}` : (type === 'double elimination' ? `${categoryId}_GF` : null);
      roundMatches.push({
        id: `${categoryId}_W_R${r}_M${m}`,
        round: r,
        matchIndex: m,
        p1: null,
        p2: null,
        winner: null,
        score: '',
        nextMatchId,
        isNextMatchP1: m % 2 === 0
      });
    }
    bracketRounds.push(roundMatches);
  }

  // Populate first round
  for (let m = 0; m < bracketRounds[0].length; m++) {
    bracketRounds[0][m].p1 = firstRoundPlayers[m * 2];
    bracketRounds[0][m].p2 = firstRoundPlayers[m * 2 + 1];
    
    // Add logistical nomenclature for first round matches
    bracketRounds[0][m].p1MinSeed = firstRoundPlayers[m * 2].seed || 999;
    bracketRounds[0][m].p2MinSeed = firstRoundPlayers[m * 2 + 1].seed || 999;
    bracketRounds[0][m].minSeed = Math.min(bracketRounds[0][m].p1MinSeed as number, bracketRounds[0][m].p2MinSeed as number);
    
    // If the opponent is BYE, we do not show them in the text
    const mP2Source = firstRoundPlayers[m * 2 + 1].isBye ? 'BYE' : (firstRoundPlayers[m * 2 + 1].seed || '?');
    bracketRounds[0][m].branchLabel = `JUG ${firstRoundPlayers[m * 2].seed || '?'}/${mP2Source}`;
  }

  // Propagate branch labels for Winner bracket
  for (let r = 0; r < roundsCount - 1; r++) {
    for (let m = 0; m < bracketRounds[r].length; m++) {
      const match = bracketRounds[r][m];
      const nextMatch = bracketRounds[r+1][Math.floor(m / 2)];
      const sourceText = `Por definir ${match.branchLabel}`;
      
      if (m % 2 === 0) {
        nextMatch.p1Source = sourceText;
        nextMatch.p1MinSeed = match.minSeed;
      } else {
        nextMatch.p2Source = sourceText;
        nextMatch.p2MinSeed = match.minSeed;
      }
      
      // If we've set both for the next match, compute its branchLabel
      if (m % 2 !== 0 && nextMatch.p1MinSeed !== undefined && nextMatch.p2MinSeed !== undefined) {
         nextMatch.minSeed = Math.min(nextMatch.p1MinSeed, nextMatch.p2MinSeed);
         nextMatch.branchLabel = `JUG ${nextMatch.p1MinSeed}/${nextMatch.p2MinSeed}`;
      }
    }
  }

  const bracket: NativeBracket = { id: categoryId, type, rounds: bracketRounds };

  if (type === 'single elimination') {
    // Add third place match if we have at least semifinals (i.e. >= 4 players bracket size)
    if (roundsCount >= 2) {
      const semiRoundIdx = roundsCount - 2;
      bracket.thirdPlaceMatch = {
        id: `${categoryId}_3RD`,
        round: -1,
        matchIndex: 0,
        p1: null,
        p2: null,
        p1Source: `Perdedor ${bracketRounds[semiRoundIdx][0].branchLabel}`,
        p2Source: `Perdedor ${bracketRounds[semiRoundIdx][1].branchLabel}`,
        winner: null,
        score: '',
        nextMatchId: null,
        isNextMatchP1: false,
        isThirdPlace: true
      };
      
      // Map semifinal losers to 3rd place match
      bracketRounds[semiRoundIdx][0].loserNextMatchId = bracket.thirdPlaceMatch.id;
      bracketRounds[semiRoundIdx][0].isLoserNextMatchP1 = true;
      bracketRounds[semiRoundIdx][1].loserNextMatchId = bracket.thirdPlaceMatch.id;
      bracketRounds[semiRoundIdx][1].isLoserNextMatchP1 = false;
    }
  } else if (type === 'double elimination') {
    // === DOBLE LLAVE SALINAS (HYBRID DOBULE ELIMINATION) ===
    // Creates a separate single elimination bronze bracket starting ONLY from the losers of the 1st round!
    // No crossover, no grand final reset, no Winner Bracket drops after round 1.
    const loserRounds: BracketMatch[][] = [];
    
    // The number of losers from round 1 equals bracketRounds[0].length.
    // If we have 16 players, we have 8 matches, so 8 losers => Bronze Bracket needs 3 rounds (Quarter, Semi, Final).
    const bronzeStartMatchesCount = bracketRounds[0].length / 2; 
    
    if (bronzeStartMatchesCount >= 1) {
      const bronzeRoundsCount = Math.log2(bracketRounds[0].length);
      
      for (let r = 0; r < bronzeRoundsCount; r++) {
         const matchesInRound = bracketRounds[0].length / Math.pow(2, r + 1);
         const roundMatches: BracketMatch[] = [];
         
         for (let m = 0; m < matchesInRound; m++) {
            const nextMatchId = r < bronzeRoundsCount - 1 ? `${categoryId}_L_R${r+1}_M${Math.floor(m/2)}` : null;
            roundMatches.push({
               id: `${categoryId}_L_R${r}_M${m}`,
               round: r,
               matchIndex: m,
               p1: null, p2: null,
               winner: null, score: '', nextMatchId,
               isNextMatchP1: m % 2 === 0
            });
         }
         loserRounds.push(roundMatches);
      }
      
      // Connect WB Round 0 losers to Bronze Round 0 (Losers bracket)
      for (let m = 0; m < bracketRounds[0].length; m++) {
         const bMatchIdx = Math.floor(m/2);
         const isP1 = m % 2 === 0;
         bracketRounds[0][m].loserNextMatchId = `${categoryId}_L_R0_M${bMatchIdx}`;
         bracketRounds[0][m].isLoserNextMatchP1 = isP1;
         
         const bMatch = loserRounds[0][bMatchIdx];
         const sourceText = `Perdedor ${bracketRounds[0][m].branchLabel}`;
         
         if (isP1) {
            bMatch.p1Source = sourceText;
            bMatch.p1MinSeed = bracketRounds[0][m].minSeed;
         } else {
            bMatch.p2Source = sourceText;
            bMatch.p2MinSeed = bracketRounds[0][m].minSeed;
         }
         
         if (!isP1 && bMatch.p1MinSeed !== undefined && bMatch.p2MinSeed !== undefined) {
             bMatch.minSeed = Math.min(bMatch.p1MinSeed, bMatch.p2MinSeed);
             bMatch.branchLabel = `JUG ${bMatch.p1MinSeed}/${bMatch.p2MinSeed}`;
         }
      }
      
      // Propagate branch labels within Bronze bracket
      for (let r = 0; r < bronzeRoundsCount - 1; r++) {
         for (let m = 0; m < loserRounds[r].length; m++) {
            const match = loserRounds[r][m];
            const nextMatch = loserRounds[r+1][Math.floor(m/2)];
            const sourceText = `Por definir ${match.branchLabel}`;
            
            if (m % 2 === 0) {
               nextMatch.p1Source = sourceText;
               nextMatch.p1MinSeed = match.minSeed;
            } else {
               nextMatch.p2Source = sourceText;
               nextMatch.p2MinSeed = match.minSeed;
            }
            
            if (m % 2 !== 0 && nextMatch.p1MinSeed !== undefined && nextMatch.p2MinSeed !== undefined) {
               nextMatch.minSeed = Math.min(nextMatch.p1MinSeed, nextMatch.p2MinSeed);
               nextMatch.branchLabel = `JUG ${nextMatch.p1MinSeed}/${nextMatch.p2MinSeed}`;
            }
         }
      }
      
      bracket.loserRounds = loserRounds;
    }
  }

  // Auto-Resolve BYEs for initial round
  for (let m = 0; m < bracketRounds[0].length; m++) {
    const rMatch = bracketRounds[0][m];
    // In winner bracket
    if (rMatch.p1?.isBye && rMatch.p2 && !rMatch.p2?.isBye) {
       resolveMatch(bracket, rMatch.id, 'p2');
    } else if (rMatch.p2?.isBye && rMatch.p1 && !rMatch.p1?.isBye) {
       resolveMatch(bracket, rMatch.id, 'p1');
    }
  }
  
  // NOTE: If testing with Salinas model, the BYE losers will advance to loserBracket. 
  // We need to automatically resolve them in loserBracket too!
  if (type === 'double elimination' && bracket.loserRounds && bracket.loserRounds.length > 0) {
      for (let m = 0; m < bracket.loserRounds[0].length; m++) {
          const lMatch = bracket.loserRounds[0][m];
          // After Auto-Resolving WB, the losers should be populated in LB if they are BYEs
          // BUT `resolveMatch` automatically pushes losers. Since they are BYEs, the BYE player object falls into LB.
          if (lMatch.p1?.isBye && lMatch.p2 && !lMatch.p2?.isBye) {
             resolveMatch(bracket, lMatch.id, 'p2');
          } else if (lMatch.p2?.isBye && lMatch.p1 && !lMatch.p1?.isBye) {
             resolveMatch(bracket, lMatch.id, 'p1');
          } else if (lMatch.p1?.isBye && lMatch.p2?.isBye) {
             resolveMatch(bracket, lMatch.id, 'p1'); // Both are BYEs, arbitrary
          }
      }
  }

  bracket.tournamentName = tournamentName;
  return bracket;
}

function generateRoundRobin(categoryId: string, players: {name: string, seed: number}[], tournamentName?: string): NativeBracket {
  const groups: RRGroup[] = [];
  const pCount = players.length;
  // Splitting logic: if <= 5 1 group. if >= 6, groups of 3 or 4
  let numGroups = pCount <= 5 ? 1 : Math.ceil(pCount / 4);
  
  // Sort by seed to snake draft (Serpentine distribution)
  const sorted = [...players].sort((a,b) => a.seed - b.seed);
  
  for(let i=0; i<numGroups; i++) {
     groups.push({ name: `Grupo ${String.fromCharCode(65+i)}`, players: [], matches: [] });
  }
  
  let dir = 1, gIdx = 0;
  for(let i=0; i<sorted.length; i++) {
     groups[gIdx].players.push(sorted[i]);
     
     if (numGroups > 1) {
        gIdx += dir;
        // Bounce at edges (Snake distribution)
        if (gIdx >= numGroups) { 
           gIdx = numGroups - 1; 
           dir = -1; 
        } else if (gIdx < 0) { 
           gIdx = 0; 
           dir = 1; 
        }
     }
  }
  
  // Generate Matches for each group (Round Robin with Berger algorithm)
  groups.forEach(g => {
    // Implement Berger Algorithm for Round Robin pairings
    const n = g.players.length;
    const dummy = n % 2 !== 0;
    const numPlayers = dummy ? n + 1 : n;
    
    // Create an array of player indices
    const indices = Array.from({ length: numPlayers }, (_, k) => k);
    let mIdx = 0;

    for (let round = 0; round < numPlayers - 1; round++) {
       // Match pairs for this round
       for (let i = 0; i < numPlayers / 2; i++) {
          const idx1 = indices[i];
          const idx2 = indices[numPlayers - 1 - i];
          
          // If neither is the dummy index
          if (idx1 < n && idx2 < n) {
             g.matches.push({
                id: `${categoryId}_${g.name}_F${round}_M${mIdx}`,
                round: round, // This stores the "Fecha"
                matchIndex: mIdx,
                p1: g.players[idx1],
                p2: g.players[idx2],
                winner: null,
                score: '',
                nextMatchId: null,
                isNextMatchP1: false
             });
             mIdx++;
          }
       }
       // Rotate indices (keep 0 fixed, rotate the rest clockwise)
       indices.splice(1, 0, indices.pop() as number);
    }
   });

   let rounds: BracketMatch[][] = [];
   let thirdPlaceMatch: BracketMatch | null = null;

   if (numGroups === 2) {
       rounds = [[
          {
             id: `${categoryId}_FINAL`,
             round: 0,
             matchIndex: 0,
             p1: null,
             p2: null,
             p1Source: '1º Grupo A',
             p2Source: '1º Grupo B',
             winner: null,
             score: '',
             nextMatchId: null,
             isNextMatchP1: false
          }
       ]];
       
       thirdPlaceMatch = {
           id: `${categoryId}_3RD`,
           round: -1,
           matchIndex: 0,
           p1: null,
           p2: null,
           p1Source: '2º Grupo A',
           p2Source: '2º Grupo B',
           winner: null,
           score: '',
           nextMatchId: null,
           isNextMatchP1: false,
           isThirdPlace: true
       };
   }
   
   return { id: categoryId, tournamentName, type: 'round robin', rounds, groups, standings: {}, thirdPlaceMatch };
}


// --- MATCH RESOLUTION LOGIC ---

export function getMatchById(bracket: NativeBracket, matchId: string): BracketMatch | null {
  if (!matchId) return null;
  if (bracket.thirdPlaceMatch && bracket.thirdPlaceMatch.id === matchId) return bracket.thirdPlaceMatch;
  if (bracket.grandFinal && bracket.grandFinal.id === matchId) return bracket.grandFinal;
  if (bracket.grandFinalReset && bracket.grandFinalReset.id === matchId) return bracket.grandFinalReset;
  
  for(const r of bracket.rounds) {
    for(const m of r) if(m.id === matchId) return m;
  }
  
  if (bracket.loserRounds) {
    for(const r of bracket.loserRounds) {
      for(const m of r) if(m.id === matchId) return m;
    }
  }
  
  if (bracket.groups) {
     for(const g of bracket.groups) {
        for(const m of g.matches) if (m.id === matchId) return m;
     }
  }
  return null;
}

export function renamePlayerInBracket(bracket: NativeBracket, oldName: string, newName: string): NativeBracket {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as NativeBracket;
  const updateMatch = (m: BracketMatch) => {
    if (m.p1 && m.p1.name === oldName) m.p1.name = newName;
    if (m.p2 && m.p2.name === oldName) m.p2.name = newName;
  };
  
  if (newBracket.thirdPlaceMatch) updateMatch(newBracket.thirdPlaceMatch);
  if (newBracket.grandFinal) updateMatch(newBracket.grandFinal);
  if (newBracket.grandFinalReset) updateMatch(newBracket.grandFinalReset);
  
  newBracket.rounds.forEach(r => r.forEach(updateMatch));
  if (newBracket.loserRounds) newBracket.loserRounds.forEach(r => r.forEach(updateMatch));
  
  if (newBracket.groups) {
    newBracket.groups.forEach(g => {
      g.players.forEach(p => { if (p.name === oldName) p.name = newName; });
      g.matches.forEach(updateMatch);
    });
    if (newBracket.standings && newBracket.standings[oldName]) {
       newBracket.standings[newName] = newBracket.standings[oldName];
       delete newBracket.standings[oldName];
    }
  }
  
  return newBracket;
}

export function setMatchWinner(bracket: NativeBracket, matchId: string, winnerTarget: 'p1' | 'p2' | null, score?: string): NativeBracket {
  const newBracket = JSON.parse(JSON.stringify(bracket)) as NativeBracket;
  return resolveMatch(newBracket, matchId, winnerTarget, score);
}

function clearDownstream(bracket: NativeBracket, match: BracketMatch) {
  if (match.nextMatchId) {
     const nextMatch = getMatchById(bracket, match.nextMatchId);
     if (nextMatch) {
       if (match.isNextMatchP1) nextMatch.p1 = null;
       else nextMatch.p2 = null;
       nextMatch.winner = undefined;
       nextMatch.score = undefined;
       clearDownstream(bracket, nextMatch);
     }
  }
  if (match.loserNextMatchId) {
     const nextLoserMatch = getMatchById(bracket, match.loserNextMatchId);
     if (nextLoserMatch) {
         if (match.isLoserNextMatchP1 !== undefined) {
             if (match.isLoserNextMatchP1) nextLoserMatch.p1 = null;
             else nextLoserMatch.p2 = null;
         } else {
             if (nextLoserMatch.p1 && (match.p1?.name === nextLoserMatch.p1.name || match.p2?.name === nextLoserMatch.p1.name)) {
                nextLoserMatch.p1 = null;
             } else if (nextLoserMatch.p2) {
                nextLoserMatch.p2 = null;
             }
         }
         nextLoserMatch.winner = undefined;
         nextLoserMatch.score = undefined;
         clearDownstream(bracket, nextLoserMatch);
     }
  }
  if (match.isGrandFinal && bracket.grandFinalReset) {
      bracket.grandFinalReset.p1 = null;
      bracket.grandFinalReset.p2 = null;
      bracket.grandFinalReset.winner = undefined;
      bracket.grandFinalReset.score = undefined;
  }
}

function resolveMatch(bracket: NativeBracket, matchId: string, winnerTarget: 'p1'|'p2'|null, score?: string): NativeBracket {
  const match = getMatchById(bracket, matchId);
  if (!match || !match.p1 || !match.p2) return bracket;

  // Si se limpia el resultado (winner === null)
  if (winnerTarget === null) {
      match.winner = undefined;
      match.score = undefined;
      clearDownstream(bracket, match);
      return bracket;
  }

  // Si cambia de ganador, deberíamos limpiar la rama subsecuente, por ahora solo sobreescribimos
  if (match.winner && match.winner !== winnerTarget) {
     clearDownstream(bracket, match);
  }

  match.winner = winnerTarget;
  if (score !== undefined) {
    match.score = score;
  }
  const advancingPlayer = winnerTarget === 'p1' ? match.p1 : match.p2;
  const losingPlayer = winnerTarget === 'p1' ? match.p2 : match.p1;

  // Forward Winner
  if (match.nextMatchId && advancingPlayer) {
     const nextMatch = getMatchById(bracket, match.nextMatchId);
     if (nextMatch) {
       if (match.isNextMatchP1) nextMatch.p1 = advancingPlayer;
       else nextMatch.p2 = advancingPlayer;
       
       // Handle BYE auto-advancement in winner block
       if (nextMatch.p1 && nextMatch.p2) {
          if (nextMatch.p1.isBye && !nextMatch.p2.isBye) resolveMatch(bracket, nextMatch.id, 'p2');
          else if (nextMatch.p2.isBye && !nextMatch.p1.isBye) resolveMatch(bracket, nextMatch.id, 'p1');
       }
     }
  }
  
  // Forward Loser
  if (match.loserNextMatchId && losingPlayer) {
     const nextLoserMatch = getMatchById(bracket, match.loserNextMatchId);
     if (nextLoserMatch) {
         if (match.isLoserNextMatchP1 !== undefined) {
             if (match.isLoserNextMatchP1) nextLoserMatch.p1 = losingPlayer;
             else nextLoserMatch.p2 = losingPlayer;
         } else {
             if (!nextLoserMatch.p1) nextLoserMatch.p1 = losingPlayer;
             else nextLoserMatch.p2 = losingPlayer;
         }
         
         if (nextLoserMatch.p1 && nextLoserMatch.p2) {
            if (nextLoserMatch.p1.isBye && !nextLoserMatch.p2.isBye) resolveMatch(bracket, nextLoserMatch.id, 'p2');
            else if (nextLoserMatch.p2.isBye && !nextLoserMatch.p1.isBye) resolveMatch(bracket, nextLoserMatch.id, 'p1');
         }
     }
  }
  
  // Special Grand Final Logic for Double Elims
  if (match.isGrandFinal) {
     // If p1 (Winner Bracket champion) loses, we trigger the reset
     if (winnerTarget === 'p2' && bracket.grandFinalReset) {
        bracket.grandFinalReset.p1 = match.p1;
        bracket.grandFinalReset.p2 = match.p2;
     } else if (winnerTarget === 'p1' && bracket.grandFinalReset) {
        bracket.grandFinalReset.p1 = null;
        bracket.grandFinalReset.p2 = null;
        bracket.grandFinalReset.winner = null;
     }
  }

  // Update standings if Round Robin
  if (bracket.type === 'round robin') {
     updateStandings(bracket);
  }

  return bracket;
}

function updateStandings(bracket: NativeBracket) {
   if (!bracket.groups) return;
   bracket.standings = {};
   bracket.groups.forEach(g => {
      g.players.forEach(p => {
         if (!bracket.standings) return;
         bracket.standings[p.name] = { p: 0, w: 0, l: 0, sw: 0, sl: 0, gw: 0, gl: 0, s: g.name };
      });
      g.matches.forEach(m => {
         if (m.winner && m.p1 && m.p2 && bracket.standings) {
            const wName = m.winner === 'p1' ? m.p1.name : m.p2.name;
            const lName = m.winner === 'p1' ? m.p2.name : m.p1.name;
            bracket.standings[wName].p += 1;
            bracket.standings[lName].p += 1;
            bracket.standings[wName].w += 1;
            bracket.standings[lName].l += 1;

            if (m.score) {
                const sets = m.score.split(' ').filter(s => s.trim());
                for (const set of sets) {
                    const parts = set.split('-');
                    if (parts.length === 2) {
                        const vp1 = parseInt(parts[0]);
                        const vp2 = parseInt(parts[1]);
                        if (!isNaN(vp1) && !isNaN(vp2)) {
                            const wGames = m.winner === 'p1' ? vp1 : vp2;
                            const lGames = m.winner === 'p1' ? vp2 : vp1;
                            
                            bracket.standings[wName].gw! += wGames;
                            bracket.standings[lName].gw! += lGames;
                            bracket.standings[wName].gl! += lGames;
                            bracket.standings[lName].gl! += wGames;
                            
                            if (wGames > lGames) {
                                bracket.standings[wName].sw! += 1;
                                bracket.standings[lName].sl! += 1;
                            } else if (lGames > wGames) {
                                bracket.standings[lName].sw! += 1;
                                bracket.standings[wName].sl! += 1;
                            }
                        }
                    }
                }
            }
         }
      });
   });

   // Auto-populate playoffs si corresponde (2 grupos)
   if (bracket.groups.length === 2 && bracket.rounds && bracket.rounds.length > 0) {
      const getSorted = (group: import('./bracket').RRGroup) => {
         return [...group.players].sort((a,b) => {
             const stA = bracket.standings?.[a.name] || { w:0, l:0, p:0 };
             const stB = bracket.standings?.[b.name] || { w:0, l:0, p:0 };
             if (stA.w !== stB.w) return stB.w - stA.w;
             return 0; // tie
         });
      };
      
      const sortedA = getSorted(bracket.groups[0]);
      const sortedB = getSorted(bracket.groups[1]);

      const finalMatch = bracket.rounds[0][0];
      if (finalMatch) {
         finalMatch.p1 = sortedA[0] || null;
         finalMatch.p2 = sortedB[0] || null;
      }

      const thirdMatch = bracket.thirdPlaceMatch;
      if (thirdMatch) {
         thirdMatch.p1 = sortedA[1] || null;
         thirdMatch.p2 = sortedB[1] || null;
      }
   }
}


