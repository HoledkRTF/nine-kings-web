import { MinionKind } from '../minions/minion-types';

export interface PixelArtFrame {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

// Color palettes for dark fantasy pixel art
const PALETTES: Record<string, Record<string, string>> = {
  skeleton_grunt: {
    '.': 'transparent',
    '#': '#0c0a09', // Outline
    'W': '#f5f5f4', // Highlight bone
    'B': '#d6d3d1', // Base bone
    'D': '#78716c', // Dark shadow bone
    'C': '#38bdf8', // Cyan glowing eyes
    'I': '#94a3b8', // Iron blade
    'H': '#f8fafc', // Blade edge highlight
    'R': '#7f1d1d'  // Tattered shroud
  },
  bone_phalanx: {
    '.': 'transparent',
    '#': '#0f172a', // Outline
    'W': '#f8fafc', // Bone plate
    'B': '#cbd5e1', // Shaded plate
    'D': '#64748b', // Dark iron trim
    'G': '#f59e0b', // Gold skull crest
    'V': '#38bdf8', // Visor eye slit
    'S': '#f1f5f9', // Spear tip
    'I': '#475569'  // Shield grip
  },
  bloated_husk: {
    '.': 'transparent',
    '#': '#052e16', // Outline
    'G': '#4d7c0f', // Rotting skin
    'L': '#84cc16', // Bile green
    'P': '#bef264', // Volatile glowing pustules
    'D': '#14532d', // Deep necrotic shadow
    'S': '#1e293b', // Stitches
    'R': '#991b1b'  // Bloody cuts
  },
  carrion_specter: {
    '.': 'transparent',
    '#': '#082f49', // Dark spectral outline
    'U': '#0284c7', // Robe body
    'C': '#38bdf8', // Glowing cyan ectoplasm
    'A': '#bae6fd', // Ethereal highlight
    'E': '#ffffff', // Piercing white soul eyes
    'T': '#0369a1'  // Tattered trailing mist
  },
  stitched_abomination: {
    '.': 'transparent',
    '#': '#1c1917', // Outline
    'M': '#9f1239', // Blood flesh
    'O': '#3f6212', // Rotten olive flesh
    'T': '#78350f', // Leathery hide
    'X': '#fef08a', // Thick bone stitches
    'R': '#ef4444', // Glowing red eyes
    'I': '#64748b', // Iron cleaver
    'E': '#cbd5e1', // Cleaver edge
    'B': '#881337'  // Blood stain
  },
  tomb_acolyte: {
    '.': 'transparent',
    '#': '#1e1b4b', // Outline
    'V': '#581c87', // Deep dark purple cowl
    'P': '#9333ea', // Violet highlight
    'W': '#e2e8f0', // Skeletal bone hands
    'S': '#78716c', // Gnarled staff
    'L': '#334155', // Lantern cage
    'F': '#f472b6'  // Glowing soul flame
  }
};

// 16x16 / 18x18 Pixel Art Matrices (2 frames per minion for walk/float animation)
const PIXEL_MATRICES: Record<MinionKind, string[][]> = {
  skeleton_grunt: [
    // Frame 0: Walking step left
    [
      "....######......",
      "...#WWWWWW#.....",
      "..#WWCCWWCC#....",
      "..#WWCCWWCC#....",
      "..#WWWWWWWW#..H.",
      "...#W#WW#W#...IH",
      "....#WWWW#...II#",
      ".....#WW#...II#.",
      "...###WW###II#..",
      "..#R#WWWW#II#...",
      "..#R#DWWD#I#....",
      "...#R#WW#R#.....",
      "....#WWWW#......",
      "...#WD##DW#.....",
      "..#WD#..#DW#....",
      "..##......##...."
    ],
    // Frame 1: Walking step right
    [
      "....######......",
      "...#WWWWWW#.....",
      "..#WWCCWWCC#....",
      "..#WWCCWWCC#....",
      "..#WWWWWWWW#....",
      "...#W#WW#W#..H..",
      "....#WWWW#..IH..",
      ".....#WW#..II#..",
      "...###WW##II#...",
      "..#R#WWWW#I#....",
      "..#R#DWWD#I#....",
      "...#R#WW#R#.....",
      "....#WWWW#......",
      "...#DW##WD#.....",
      "..#DW#..#WD#....",
      "..##......##...."
    ]
  ],

  bone_phalanx: [
    // Frame 0: Braced shield forward
    [
      ".....#######......",
      "....#WWWWWWW#..S..",
      "...#WWWWWWWWW#.SS.",
      "...#WW#VVV#WW#.SS.",
      "...#WW#VVV#WW#.IS.",
      "..##WWWWWWWWW#IIS.",
      ".#DD#WWGGWW#DD#IS.",
      "#DDDD#WGGW#DDDD#I.",
      "#DPPD######DPPD#I.",
      "#DPPD#WWWW#DPPD#I.",
      "#DPPD#DWWD#DPPD#I.",
      "#DPPD#DWWD#DPPD#..",
      "#DDDD######DDDD#..",
      ".#DD#WWWWWW#DD#...",
      "..##WWWWWWWW##....",
      "...#DWW##WWD#.....",
      "...#DW#..#WD#.....",
      "....##....##......"
    ],
    // Frame 1: March stride
    [
      ".....#######......",
      "....#WWWWWWW#...S.",
      "...#WWWWWWWWW#..SS",
      "...#WW#VVV#WW#..SS",
      "...#WW#VVV#WW#..IS",
      "..##WWWWWWWWW#.IIS",
      ".#DD#WWGGWW#DD#IIS",
      "#DDDD#WGGW#DDDD#I.",
      "#DPPD######DPPD#I.",
      "#DPPD#WWWW#DPPD#I.",
      "#DPPD#DWWD#DPPD#I.",
      "#DPPD#DWWD#DPPD#..",
      "#DDDD######DDDD#..",
      ".#DD#WWWWWW#DD#...",
      "..##WWWWWWWW##....",
      "...#WWD##DWW#.....",
      "...#WD#..#DW#.....",
      "....##....##......"
    ]
  ],

  bloated_husk: [
    // Frame 0: Heavy wobble
    [
      "....########......",
      "...#GGGGGGGG#.....",
      "..#GG#SS#GGGG#....",
      "..#GGRSSRGGGGP#...",
      "..#GGGGGGGGGLP#...",
      ".#DD#SGGGS#GGLP#..",
      "#GGGG#SSS#GGGLP#..",
      "#GGLP#GGGG#GGLP#..",
      "#GLLPP#GGL#GGGG#..",
      "#GLLPP#GLL#DGG#...",
      "#GGPP##GGL#DGG#...",
      "#GGGG#GGGG#DGG#...",
      ".#GGGGGGGGGGG#....",
      "..#GGGGGGGGG#.....",
      "...#GG#S#GG#......",
      "...#DD#.#DD#......",
      "...#DD#.#DD#......",
      "....##...##......."
    ],
    // Frame 1: Pulse bulge
    [
      "....########......",
      "...#GGGGGGGG#.....",
      "..#GG#SS#GGGG#....",
      "..#GGRSSRGGGGP#...",
      "..#GGGGGGGGGLPP#..",
      ".#DD#SGGGS#GGLPP#.",
      "#GGGG#SSS#GGGLPP#.",
      "#GGLP#GGGG#GGLP#..",
      "#GLLPP#GGL#GGGG#..",
      "#GLLPP#GLL#DGG#...",
      "#GGPP##GGL#DGG#...",
      "#GGGG#GGGG#DGG#...",
      ".#GGGGGGGGGGG#....",
      "..#GGGGGGGGG#.....",
      "...#GG#S#GG#......",
      "...#DD#.#DD#......",
      "....##...##.......",
      ".................."
    ]
  ],

  carrion_specter: [
    // Frame 0: Floating hover
    [
      "....######......",
      "...#UUUUUU#.....",
      "..#UUCEECEU#....",
      "..#UUCEECEU#....",
      "..#UUUUUUUU#....",
      "...#UCCUUU#.....",
      "...#UUCCUU#.....",
      "..#UCCCCCCU#....",
      "..#ACCCCCCA#....",
      ".#AACCCCCCAA#...",
      ".#AACCCCCCAA#...",
      "..#ACCCCCCA#....",
      "...#CCCCCC#.....",
      "....#CCCC#......",
      ".....#TT#.......",
      "......##........"
    ],
    // Frame 1: Floating wave
    [
      "....######......",
      "...#UUUUUU#.....",
      "..#UUCEECEU#....",
      "..#UUCEECEU#....",
      "..#UUUUUUUU#....",
      "...#UUUCCU#.....",
      "...#UUCCUU#.....",
      "..#UCCCCCCU#....",
      "..#ACCCCCCA#....",
      ".#AACCCCCCAA#...",
      "..#ACCCCCCA#....",
      "...#CCCCCC#.....",
      "....#CCCC#......",
      ".....#TT#.......",
      "......#T#.......",
      ".......##......."
    ]
  ],

  stitched_abomination: [
    // Frame 0: 24x24 Colossal Patchwork Brute
    [
      ".......############.....",
      "......#MMMMMMMMOOOO#....",
      ".....#MMMRRMMMOORROO#...",
      ".....#MMMRRMMMOORROO#...",
      ".....#MMMMMMMMOOOOOO#...",
      "....#MMMMXXXXXOOOOOO#...",
      "...#MMMMMMMMMMOOOOOO#...",
      "...#MMM#MMMMMM#OOOOO#...",
      "..#TTTT#MMXXMM#TTTTT#...",
      ".#TTTTTT#XXXX#TTTTTT#...",
      ".#TTTTTT#MMMM#TTTTTT#...",
      "#II##TTT#OOOO#TTT##II#..",
      "#IEI#TTT#OOOO#TTT#IEI#..",
      "#IEEI###MMMMMM###IEEI#..",
      "#IEEI#MMMMXXMMMM#IEEI#..",
      "#IBEI#MMMMXXMMMM#IBEI#..",
      ".###.#MMMMXXMMMM#.###...",
      ".....#OOOOXXOOOO#.......",
      ".....#OOOOXXOOOO#.......",
      "....#TTTT####TTTT#......",
      "...#TTTT#....#TTTT#.....",
      "...#TTTT#....#TTTT#.....",
      "...#DDDD#....#DDDD#.....",
      "....####......####......"
    ],
    // Frame 1: Stride with cleavers
    [
      ".......############.....",
      "......#MMMMMMMMOOOO#....",
      ".....#MMMRRMMMOORROO#...",
      ".....#MMMRRMMMOORROO#...",
      ".....#MMMMMMMMOOOOOO#...",
      "....#MMMMXXXXXOOOOOO#...",
      "...#MMMMMMMMMMOOOOOO#...",
      "...#MMM#MMMMMM#OOOOO#...",
      "..#TTTT#MMXXMM#TTTTT#...",
      ".#TTTTTT#XXXX#TTTTTT#...",
      ".#TTTTTT#MMMM#TTTTTT#...",
      "#II##TTT#OOOO#TTT##II#..",
      "#IEI#TTT#OOOO#TTT#IEI#..",
      "#IEEI###MMMMMM###IEEI#..",
      "#IEEI#MMMMXXMMMM#IEEI#..",
      "#IBEI#MMMMXXMMMM#IBEI#..",
      ".###.#MMMMXXMMMM#.###...",
      ".....#OOOOXXOOOO#.......",
      "....#TTTT####TTTT#......",
      "...#TTTT#....#TTTT#.....",
      "...#TTTT#....#TTTT#.....",
      "...#DDDD#....#DDDD#.....",
      "....####......####......",
      "........................"
    ]
  ],

  tomb_acolyte: [
    // Frame 0: Dark hood chanting
    [
      ".....######.....",
      "....#VVVVVV#....",
      "...#VVPPPPVV#...",
      "...#VV#..#VV#...",
      "...#VV#..#VV#...",
      "...#VVV##VVV#..F",
      "....#VVVVVV#..FF",
      "...#VVVVVVVV#.LF",
      "..#VVVVVVVVVV#LS",
      "..#VVPWWWWPVV#SS",
      ".#VVV#WWWW#VVV#S",
      ".#VVV#SSSS#VVV#S",
      ".#VVV#SSSS#VVV#S",
      "..#VVVVVVVVVV#S.",
      "...#VVVVVVVV#S..",
      "....########...."
    ],
    // Frame 1: Soul flame flare
    [
      ".....######.....",
      "....#VVVVVV#....",
      "...#VVPPPPVV#...",
      "...#VV#..#VV#...",
      "...#VV#..#VV#...",
      "...#VVV##VVV#.FF",
      "....#VVVVVV#.FFF",
      "...#VVVVVVVV#.LF",
      "..#VVVVVVVVVV#LS",
      "..#VVPWWWWPVV#SS",
      ".#VVV#WWWW#VVV#S",
      ".#VVV#SSSS#VVV#S",
      ".#VVV#SSSS#VVV#S",
      "..#VVVVVVVVVV#S.",
      "...#VVVVVVVV#S..",
      "....########...."
    ]
  ]
};

// Cache rasterized pixel-art canvases so rendering runs at 60 FPS without allocations
const CACHED_SPRITES: Map<string, PixelArtFrame> = new Map();

export function getPixelArtMinion(kind: MinionKind, frameIndex: number, scale: number = 2): PixelArtFrame {
  const cacheKey = `${kind}_f${frameIndex}_s${scale}`;
  const existing = CACHED_SPRITES.get(cacheKey);
  if (existing) return existing;

  const frames = PIXEL_MATRICES[kind] || PIXEL_MATRICES.skeleton_grunt;
  const matrix = frames[frameIndex % frames.length];
  const palette = PALETTES[kind] || PALETTES.skeleton_grunt;

  const rows = matrix.length;
  const cols = matrix[0].length;

  const canvas = document.createElement('canvas');
  canvas.width = cols * scale;
  canvas.height = rows * scale;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingEnabled = false;

  for (let r = 0; r < rows; r++) {
    const row = matrix[r];
    for (let c = 0; c < cols; c++) {
      const char = row[c];
      const color = palette[char];
      if (color && color !== 'transparent') {
        ctx.fillStyle = color;
        ctx.fillRect(c * scale, r * scale, scale, scale);
      }
    }
  }

  const result: PixelArtFrame = {
    canvas,
    width: canvas.width,
    height: canvas.height
  };

  CACHED_SPRITES.set(cacheKey, result);
  return result;
}
