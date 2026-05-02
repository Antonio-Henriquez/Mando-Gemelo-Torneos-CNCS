export const DIAS_CAL = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const CAT_COLORS = [
  '#818CF8', // Indigo
  '#34D399', // Emerald
  '#A78BFA', // Purple
  '#FBBF24', // Amber
  '#60A5FA', // Blue
  '#FB7185', // Rose
  '#22D3EE', // Cyan
  '#E879F9', // Fuchsia
  '#4ADE80', // Green
  '#F472B6', // Pink
  '#94A3B8'  // Slate
];

export const DIAS_TORNEO = [
  { y: 2026, m: 4, d: 2 }, { y: 2026, m: 4, d: 3 },
  { y: 2026, m: 4, d: 9 }, { y: 2026, m: 4, d: 10 },
  { y: 2026, m: 4, d: 16 }, { y: 2026, m: 4, d: 17 }
];

export const SEMANAS: Record<string, string> = {
  '2026-4-2': 'Semana 1 · 1era y 2da ronda',
  '2026-4-3': 'Semana 1 · 1era y 2da ronda',
  '2026-4-9': 'Semana 2 · 3era y 4ta ronda',
  '2026-4-10': 'Semana 2 · 3era y 4ta ronda',
  '2026-4-16': 'Semana 3 · Cuartos · Semi · Final',
  '2026-4-17': 'Semana 3 · Cuartos · Semi · Final'
};

export const HORAS_BASE = ['09:00', '11:00', '13:00', '15:00', '17:00'];

export const DEMO_CATS: Record<string, string[]> = {
  'Singles Honor': ['Gancarlo Stango', 'Bendel, R.', 'Torres, F.', 'Herrera, M.', 'Gallardo, J.', 'Ruiz, C.'],
  'Singles Varones Primera': ['García, R.', 'Marcos, F.', 'Gallardo, M.', 'Castro, D.', 'Peña, L.', 'Fuentes, A.', 'Vega, S.', 'Díaz, M.', 'López, C.', 'Soto, E.'],
  'Singles Varones Segunda': ['Núñez, P.', 'Espinoza, R.', 'Ríos, M.', 'Vargas, J.', 'Pinto, A.', 'Medina, C.'],
  'Singles Varones +70': ['Fernández, A.', 'Jiménez, H.', 'Contreras, G.', 'Salinas, R.'],
  'Dobles Varones Primera': ['Henriquez/Torres', 'Garrido/Muñoz', 'García/Marcos', 'Gallardo/Castro', 'Peña/Fuentes'],
  'Dobles Varones Segunda': ['Ruiz/Soto', 'Díaz/Vega', 'Núñez/Espinoza', 'Ríos/Vargas'],
  'Dobles Varones +70': ['Fernández/Jiménez', 'Contreras/Salinas', 'Medina/Pinto'],
  'Singles Damas': ['Rosemarie B.', 'Javiera Blanco', 'González, M.', 'Parra, C.', 'Campos, L.', 'Reyes, A.'],
  'Dobles Damas': ['Malandre/Marcos', 'Olea/Window', 'González/Parra', 'Campos/Reyes'],
  'Dobles Damas +65': ['López/Ríos', 'Espinoza/Pinto', 'Vargas/Medina'],
  'Dobles Mixto': ['Dazinger/Gil', 'Malandre/Malandre', 'García/Rosemarie', 'Torres/Javiera', 'Peña/González']
};

export type Jugador = { name: string; seed: number };

export type CategoriaData = {
  type: string;
  players: Jugador[];
};

export const CATEGORIAS = Object.entries(DEMO_CATS).reduce((acc, [cat, jugs]) => {
  acc[cat] = {
    type: 'single elimination',
    players: jugs.map((n, i) => ({ name: n, seed: i + 1 }))
  };
  return acc;
}, {} as Record<string, CategoriaData>);

export const dayKey = (y: number, m: number, d: number) => `${y}-${m}-${d}`;
export const slotKey = (dk: string, c: number, h: string) => `${dk}_${c}_${h}`;

export type Partido = {
  cat: string;
  j1: string;
  j2: string;
  ronda: string;
  c: number;
  h: string;
  dk: string;
  // Metadata for Native Bracket
  matchId?: number | string;
  tournamentId?: number;
  urlAlias?: string;
  player1_id?: number;
  player2_id?: number;
  rIndex?: number;
  mIndex?: number;
  winner?: 'p1' | 'p2';
  score?: string;
};

// Initial state data setup
export const getInitialPartidos = () => {
  const p: Record<string, Partido> = {};
  return p;
};

export const catColor = (cat: string) => {
  const ns = Object.keys(CATEGORIAS);
  return CAT_COLORS[ns.indexOf(cat) % CAT_COLORS.length];
};

export const horaMin = (h: string): number => {
  const [hh, mm] = h.split(':').map(Number);
  return hh * 60 + mm;
};

export const jugsArr = (j1: string, j2: string) => [j1, j2].join('/').split('/').map(j => j.trim().toLowerCase()).filter(j => j.length > 2);

// Replace fuzzy logic with strict equality to fix "Antonio V" and "Antonio S" conflict bug
export const sim = (a: string, b: string) => {
  const n = (s: string) => s.toLowerCase().replace(/[.,]/g, '').trim();
  return n(a) === n(b);
};
