/**
 * Utility for loading WGSL shader files
 */

const shaderCache = new Map<string, string>();

/**
 * Load a WGSL shader file
 */
export async function loadShader(name: string): Promise<string> {
  if (shaderCache.has(name)) {
    return shaderCache.get(name)!;
  }
  
  try {
    const response = await fetch(`/src/shaders/${name}.wgsl`);
    if (!response.ok) {
      throw new Error(`Failed to load shader: ${name}`);
    }
    const code = await response.text();
    shaderCache.set(name, code);
    return code;
  } catch (error) {
    console.error(`Error loading shader ${name}:`, error);
    throw error;
  }
}

/**
 * Preload multiple shaders
 */
export async function preloadShaders(names: string[]): Promise<Record<string, string>> {
  const results = await Promise.all(
    names.map(async (name) => {
      const code = await loadShader(name);
      return [name, code] as const;
    })
  );
  
  return Object.fromEntries(results);
}

/**
 * Inline shader strings (for bundling)
 * These will be replaced with actual shader code at build time
 */
export const SHADERS = {
  asciiCompute: '', // Will be imported
  asciiRender: '',  // Will be imported
  postProcess: '',  // Will be imported
  passThrough: '',  // Will be imported
} as const;
