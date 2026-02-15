/**
 * Font Atlas Generator for ASCII Effects
 * Generates a texture atlas of characters for GPU sampling
 */

export interface FontAtlas {
  texture: GPUTexture;
  width: number;
  height: number;
  charWidth: number;
  charHeight: number;
  cols: number;
  charset: string;
}

export interface FontAtlasOptions {
  charset?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  cols?: number;
  padding?: number;
  antiAliased?: boolean;
}

const DEFAULT_CHARSET = ' .:-=+*#%@';
const DEFAULT_OPTIONS: Required<FontAtlasOptions> = {
  charset: DEFAULT_CHARSET,
  fontSize: 24,
  fontFamily: 'monospace',
  fontWeight: 'normal',
  cols: 8,
  padding: 2,
  antiAliased: false,
};

/**
 * Generate a font atlas texture from a character set
 */
export async function generateFontAtlas(
  device: GPUDevice,
  options: FontAtlasOptions = {}
): Promise<FontAtlas> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const charset = opts.charset;
  
  // Calculate grid dimensions
  const charCount = charset.length;
  const cols = Math.min(opts.cols, charCount);
  const rows = Math.ceil(charCount / cols);
  
  // Determine character size by measuring the largest character
  const { charWidth, charHeight } = measureCharacterSize(opts);
  
  // Add padding
  const paddedCharWidth = charWidth + opts.padding * 2;
  const paddedCharHeight = charHeight + opts.padding * 2;
  
  // Calculate atlas dimensions
  const atlasWidth = paddedCharWidth * cols;
  const atlasHeight = paddedCharHeight * rows;
  
  // Create canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = atlasWidth;
  canvas.height = atlasHeight;
  const ctx = canvas.getContext('2d', { alpha: true })!;
  
  // Clear to black (transparent)
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, atlasWidth, atlasHeight);
  
  // Set up font
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  
  // Disable anti-aliasing for pixel-perfect rendering if requested
  if (!opts.antiAliased) {
    ctx.imageSmoothingEnabled = false;
  }
  
  // Render each character
  for (let i = 0; i < charCount; i++) {
    const char = charset[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    
    const x = col * paddedCharWidth + paddedCharWidth / 2;
    const y = row * paddedCharHeight + paddedCharHeight / 2;
    
    ctx.fillText(char, x, y);
  }
  
  // Create texture from canvas
  const texture = device.createTexture({
    label: 'Font Atlas',
    size: { width: atlasWidth, height: atlasHeight },
    format: 'rgba8unorm',
    usage: 
      GPUTextureUsage.TEXTURE_BINDING |
      GPUTextureUsage.COPY_DST |
      GPUTextureUsage.RENDER_ATTACHMENT,
  });
  
  // Copy canvas to texture
  device.queue.copyExternalImageToTexture(
    { source: canvas },
    { texture },
    { width: atlasWidth, height: atlasHeight }
  );
  
  return {
    texture,
    width: atlasWidth,
    height: atlasHeight,
    charWidth: paddedCharWidth,
    charHeight: paddedCharHeight,
    cols,
    charset,
  };
}

/**
 * Measure the size of characters for the atlas
 */
function measureCharacterSize(opts: Required<FontAtlasOptions>): { charWidth: number; charHeight: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  ctx.font = `${opts.fontWeight} ${opts.fontSize}px ${opts.fontFamily}`;
  
  // Measure all characters and find the maximum
  let maxWidth = 0;
  let maxHeight = 0;
  
  for (const char of opts.charset) {
    const metrics = ctx.measureText(char);
    const width = metrics.width;
    const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    
    maxWidth = Math.max(maxWidth, width);
    maxHeight = Math.max(maxHeight, height);
  }
  
  // Add some margin and round up to even numbers for better GPU alignment
  return {
    charWidth: Math.ceil(maxWidth + 4),
    charHeight: Math.ceil(maxHeight + 4),
  };
}

/**
 * Common character sets for ASCII art
 */
export const CHARSETS = {
  /** Minimal - high contrast */
  MINIMAL: ' .:-=+*#%@',
  /** Short - good balance */
  SHORT: ' .:-=+*#%@',
  /** Medium - default */
  MEDIUM: ' .\'`^",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  /** Long - detailed */
  LONG: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  /** Blocks - using block characters */
  BLOCKS: ' ░▒▓█',
  /** Braille - using braille patterns */
  BRAILLE: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏⠐⠑⠒⠓⠔⠕⠖⠗⠘⠙⠚⠛⠜⠝⠞⠟⠠⠡⠢⠣⠤⠥⠦⠧⠨⠩⠪⠫⠬⠭⠮⠯⠰⠱⠲⠳⠴⠵⠶⠷⠸⠹⠺⠻⠼⠽⠾⠿⡀⡁⡂⡃⡄⡅⡆⡇⡈⡉⡊⡋⡌⡍⡎⡏⡐⡑⡒⡓⡔⡕⡖⡗⡘⡙⡚⡛⡜⡝⡞⡟⡠⡡⡢⡣⡤⡥⡦⡧⡨⡩⡪⡫⡬⡭⡮⡯⡰⡱⡲⡳⡴⡵⡶⡷⡸⡹⡺⡻⡼⡽⡾⡿⢀⢁⢂⢃⢄⢅⢆⢇⢈⢉⢊⢋⢌⢍⢎⢏⢐⢑⢒⢓⢔⢕⢖⢗⢘⢙⢚⢛⢜⢝⢞⢟⢠⢡⢢⢣⢤⢥⢦⢧⢨⢩⢪⢫⢬⢭⢮⢯⢰⢱⢲⢳⢴⢵⢶⢷⢸⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣈⣉⣊⣋⣌⣍⣎⣏⣐⣑⣒⣓⣔⣕⣖⣗⣘⣙⣚⣛⣜⣝⣞⣟⣠⣡⣢⣣⣣⣤⣥⣦⣧⣨⣩⣪⣫⣬⣭⣮⣯⣰⣱⣲⣳⣴⣵⣶⣷⣸⣹⣺⣻⣼⣽⣾⣿',
  /** Numbers - digits only */
  NUMBERS: '0123456789',
  /** Letters - alphabet */
  LETTERS: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
};

/**
 * Get a character set by name or return custom
 */
export function getCharset(name: keyof typeof CHARSETS | string): string {
  if (name in CHARSETS) {
    return CHARSETS[name as keyof typeof CHARSETS];
  }
  return name;
}
