const DIFFICULTIES = {
  beginner: { label:'Başlangıç', badge:'beginner', icon:'🌱', givens:50, hints:5, maxErrors:3, scoreMultiplier:1,
              allowedTechniques: new Set(['naked_single']),
              unlockRequires: null },
  easy:     { label:'Kolay',     badge:'easy',     icon:'🌿', givens:42, hints:3, maxErrors:3, scoreMultiplier:2,
              allowedTechniques: new Set(['naked_single','hidden_single']),
              unlockRequires: { diff:'beginner', count:3 } },
  medium:   { label:'Orta',      badge:'medium',   icon:'🌊', givens:34, hints:3, maxErrors:3, scoreMultiplier:4,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair']),
              unlockRequires: { diff:'easy', count:3 } },
  hard:     { label:'Zor',       badge:'hard',     icon:'⛰️', givens:28, hints:3, maxErrors:3, scoreMultiplier:8,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple']),
              unlockRequires: { diff:'medium', count:5 } },
  expert:   { label:'Uzman',     badge:'expert',   icon:'🌋', givens:24, hints:3, maxErrors:3, scoreMultiplier:16,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing']),
              unlockRequires: { diff:'hard', count:5 } },
  master:      { label:'Usta',      badge:'master',      icon:'🌌', givens:22, hints:3, maxErrors:3, scoreMultiplier:32,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing','y_wing']),
              unlockRequires: { diff:'expert', count:7 } },
  grandmaster: { label:'Üstat',     badge:'grandmaster', icon:'🌠', givens:20, hints:2, maxErrors:2, scoreMultiplier:64,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing','y_wing']),
              unlockRequires: { diff:'master', count:7 } },
  legend:      { label:'Şampiyon',  badge:'legend',      icon:'✨', givens:18, hints:1, maxErrors:2, scoreMultiplier:128,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing','y_wing']),
              unlockRequires: { diff:'grandmaster', count:10 } },
  tanri:       { label:'Efsane',    badge:'tanri',       icon:'⚡', givens:17, hints:1, maxErrors:1, scoreMultiplier:256,
              allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing','y_wing']),
              unlockRequires: { diff:'legend', count:10 } },
  daily: { label:'Günlük', badge:'expert', icon:'📅', givens:24, hints:3, maxErrors:3, scoreMultiplier:1,
         allowedTechniques: new Set(['naked_single','hidden_single','naked_pair','hidden_pair','naked_triple','x_wing']),
              unlockRequires: null },
};

const TECHNIQUE_NAMES = {
  naked_single:  'Naked Single (Tek aday)',
  hidden_single: 'Hidden Single (Gizli tekli)',
  naked_pair:    'Naked Pair (Çıplak çift)',
  hidden_pair:   'Hidden Pair (Gizli çift)',
  naked_triple:  'Naked Triple (Çıplak üçlü)',
  x_wing:        'X-Wing',
  y_wing:        'Y-Wing (XY-Wing)',
};

// ═══════════════════════════════════════════════
//  SUDOKU GENERATOR
// ═══════════════════════════════════════════════

// Seeded shuffle
function seededShuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = Math.abs(Math.sin(seed * 9301 + i * 49297) * 233280) % 1;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Check if placing num at idx is valid
function isValidPlacement(grid, idx, num) {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    if (grid[row * 9 + i] === num) return false;      // same row
    if (grid[i * 9 + col] === num) return false;      // same col
    const br = boxRow + Math.floor(i / 3);
    const bc = boxCol + (i % 3);
    if (grid[br * 9 + bc] === num) return false;      // same box
  }
  return true;
}

// Generate a complete solved grid
function generateSolution(seed) {
  const grid = new Array(81).fill(0);

  function fill(pos) {
    if (pos === 81) return true;
    if (grid[pos] !== 0) return fill(pos + 1);
    const nums = seededShuffle([1,2,3,4,5,6,7,8,9], seed + pos);
    for (const n of nums) {
      if (isValidPlacement(grid, pos, n)) {
        grid[pos] = n;
        if (fill(pos + 1)) return true;
        grid[pos] = 0;
      }
    }
    return false;
  }

  fill(0);
  return grid;
}

// Count solutions (stop at 2)
function countSolutions(puzzle) {
  const grid = [...puzzle];
  let count = 0;

  function solve(pos) {
    if (count > 1) return;
    if (pos === 81) { count++; return; }
    if (grid[pos] !== 0) { solve(pos + 1); return; }

    const row = Math.floor(pos / 9);
    const col = pos % 9;
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    const used = new Set();

    for (let i = 0; i < 9; i++) {
      used.add(grid[row * 9 + i]);
      used.add(grid[i * 9 + col]);
      used.add(grid[(boxRow + Math.floor(i/3)) * 9 + (boxCol + (i%3))]);
    }

    for (let n = 1; n <= 9; n++) {
      if (!used.has(n)) {
        grid[pos] = n;
        solve(pos + 1);
        grid[pos] = 0;
      }
    }
  }

  solve(0);
  return count;
}

// ═══════════════════════════════════════════════
//  HUMAN-LOGIC SOLVER
// ═══════════════════════════════════════════════

// Get all peer indices for a cell (same row, col, box) — excluding itself
function getPeers(idx) {
  const peers = new Set();
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let i = 0; i < 9; i++) {
    peers.add(row * 9 + i);      // same row
    peers.add(i * 9 + col);      // same col
    peers.add((boxRow + Math.floor(i/3)) * 9 + (boxCol + (i%3))); // same box
  }
  peers.delete(idx);
  return [...peers];
}

// Get all 27 houses (9 rows + 9 cols + 9 boxes)
function getHouses() {
  const houses = [];
  for (let i = 0; i < 9; i++) {
    const row = [], col = [], box = [];
    const br = Math.floor(i / 3) * 3;
    const bc = (i % 3) * 3;
    for (let j = 0; j < 9; j++) {
      row.push(i * 9 + j);
      col.push(j * 9 + i);
      box.push((br + Math.floor(j/3)) * 9 + (bc + (j%3)));
    }
    houses.push(row, col, box);
  }
  return houses;
}

// Build candidate sets from grid
function buildCandidates(grid) {
  const cands = Array.from({length: 81}, () => new Set([1,2,3,4,5,6,7,8,9]));
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) {
      cands[i] = new Set();
      for (const peer of getPeers(i)) {
        cands[peer].delete(grid[i]);
      }
    }
  }
  return cands;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function setUnion(sets) {
  const u = new Set();
  for (const s of sets) for (const v of s) u.add(v);
  return u;
}

// Human solver — returns { solved, techniquesUsed }
// allowedTech: Set of technique names to use (undefined = tümüne izin ver)
function humanSolve(puzzleIn, allowedTech) {
  const grid = [...puzzleIn];
  const used = new Set();
  const HOUSES = getHouses();
  const allow = t => !allowedTech || allowedTech.has(t);
  let changed = true;

  while (changed) {
    changed = false;
    const cands = buildCandidates(grid);

    // ── 1. NAKED SINGLE ──
    if (allow('naked_single')) {
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0 && cands[i].size === 1) {
        grid[i] = [...cands[i]][0];
        used.add('naked_single');
        changed = true;
      }
    }
    }
    if (changed) continue;

    // ── 2. HIDDEN SINGLE ──
    if (allow('hidden_single')) {
    for (const house of HOUSES) {
      for (let num = 1; num <= 9; num++) {
        const cells = house.filter(i => grid[i] === 0 && cands[i].has(num));
        if (cells.length === 1) {
          grid[cells[0]] = num;
          used.add('hidden_single');
          changed = true;
        }
      }
    }
    }
    if (changed) continue;

    // ── 3. NAKED PAIR ──
    if (allow('naked_pair')) {
    for (const house of HOUSES) {
      const empty = house.filter(i => grid[i] === 0);
      for (let a = 0; a < empty.length; a++) {
        for (let b = a + 1; b < empty.length; b++) {
          const ca = cands[empty[a]], cb = cands[empty[b]];
          if (ca.size === 2 && setsEqual(ca, cb)) {
            for (const idx of empty) {
              if (idx !== empty[a] && idx !== empty[b]) {
                for (const n of ca) {
                  if (cands[idx].has(n)) { cands[idx].delete(n); used.add('naked_pair'); changed = true; }
                }
              }
            }
          }
        }
      }
    }
    }
    if (changed) continue;

    // ── 4. HIDDEN PAIR ──
    if (allow('hidden_pair')) {
    for (const house of HOUSES) {
      const empty = house.filter(i => grid[i] === 0);
      for (let n1 = 1; n1 <= 8; n1++) {
        for (let n2 = n1 + 1; n2 <= 9; n2++) {
          const cells = empty.filter(i => cands[i].has(n1) && cands[i].has(n2));
          const n1only = empty.filter(i => cands[i].has(n1));
          const n2only = empty.filter(i => cands[i].has(n2));
          if (cells.length === 2 && n1only.length === 2 && n2only.length === 2) {
            for (const idx of cells) {
              for (let n = 1; n <= 9; n++) {
                if (n !== n1 && n !== n2 && cands[idx].has(n)) {
                  cands[idx].delete(n); used.add('hidden_pair'); changed = true;
                }
              }
            }
          }
        }
      }
    }
    }
    if (changed) continue;

    // ── 5. NAKED TRIPLE ──
    if (allow('naked_triple')) {
    for (const house of HOUSES) {
      const empty = house.filter(i => grid[i] === 0 && cands[i].size >= 2 && cands[i].size <= 3);
      for (let a = 0; a < empty.length; a++) {
        for (let b = a+1; b < empty.length; b++) {
          for (let c = b+1; c < empty.length; c++) {
            const union = setUnion([cands[empty[a]], cands[empty[b]], cands[empty[c]]]);
            if (union.size === 3) {
              for (const idx of house.filter(i => grid[i] === 0)) {
                if (idx !== empty[a] && idx !== empty[b] && idx !== empty[c]) {
                  for (const n of union) {
                    if (cands[idx].has(n)) { cands[idx].delete(n); used.add('naked_triple'); changed = true; }
                  }
                }
              }
            }
          }
        }
      }
    }
    }
    if (changed) continue;

    // ── 6. X-WING ──
    if (allow('x_wing')) {
    for (let num = 1; num <= 9; num++) {
      // Row-based
      const rowData = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          if (grid[r*9+c] === 0 && cands[r*9+c].has(num)) cols.push(c);
        }
        if (cols.length === 2) rowData.push({r, cols});
      }
      for (let i = 0; i < rowData.length; i++) {
        for (let j = i+1; j < rowData.length; j++) {
          if (rowData[i].cols[0] === rowData[j].cols[0] && rowData[i].cols[1] === rowData[j].cols[1]) {
            const [c1, c2] = rowData[i].cols;
            for (let r = 0; r < 9; r++) {
              if (r !== rowData[i].r && r !== rowData[j].r) {
                for (const c of [c1, c2]) {
                  if (grid[r*9+c] === 0 && cands[r*9+c].has(num)) {
                    cands[r*9+c].delete(num); used.add('x_wing'); changed = true;
                  }
                }
              }
            }
          }
        }
      }
    }
    }
    if (changed) continue;

    // ── 7. Y-WING ──
    if (allow('y_wing')) {
    const bivalue = [];
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0 && cands[i].size === 2) bivalue.push(i);
    }

    const sees = (a, b) => {
      const ar = Math.floor(a/9), ac = a%9;
      const br = Math.floor(b/9), bc = b%9;
      return ar===br || ac===bc || (Math.floor(ar/3)*3+Math.floor(ac/3) === Math.floor(br/3)*3+Math.floor(bc/3));
    };

    outer:
    for (const pivot of bivalue) {
      const [px, py] = [...cands[pivot]];
      for (const wingA of bivalue) {
        if (wingA === pivot || !sees(pivot, wingA)) continue;
        const wa = [...cands[wingA]];
        const sharedA = wa.includes(px) ? px : wa.includes(py) ? py : null;
        if (!sharedA) continue;
        const z = wa.find(v => v !== sharedA);
        const otherPivot = sharedA === px ? py : px;

        for (const wingB of bivalue) {
          if (wingB === pivot || wingB === wingA || !sees(pivot, wingB)) continue;
          const wb = [...cands[wingB]];
          if (!wb.includes(otherPivot) || !wb.includes(z)) continue;
          // Eliminate z from cells seeing both wingA and wingB
          for (let i = 0; i < 81; i++) {
            if (i !== wingA && i !== wingB && grid[i] === 0 && cands[i].has(z)
                && sees(i, wingA) && sees(i, wingB)) {
              cands[i].delete(z); used.add('y_wing'); changed = true;
            }
          }
        }
      }
    }
    }
  }

  return { solved: grid.every(v => v !== 0), grid, techniquesUsed: used };
}

// ═══════════════════════════════════════════════
//  PUZZLE GENERATOR WITH REAL DIFFICULTY
// ═══════════════════════════════════════════════

function generatePuzzle(mode, seed) {
  const cfg = DIFFICULTIES[mode];
  const target = 81 - cfg.givens;
  const solution = generateSolution(seed);
  const puzzle = [...solution];
  const order = seededShuffle([...Array(81).keys()], seed);

  let removed = 0;
  for (const idx of order) {
    if (removed >= target) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;
    if (countSolutions(puzzle) === 1) {
      removed++;
    } else {
      puzzle[idx] = backup;
    }
  }

  const res = humanSolve([...puzzle], cfg.allowedTechniques);
  return { puzzle, solution, techniquesUsed: res.techniquesUsed };
}

