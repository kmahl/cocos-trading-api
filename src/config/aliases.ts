import path from 'path';

// Configuración centralizada de aliases
export const aliases = {
  '@': '.',
  '@controllers': './controllers',
  '@services': './services',
  '@entities': './entities',
  '@utils': './utils',
  '@types': './types',
  '@config': './config',
  '@middlewares': './middlewares',
  '@dto': './dto',
  '@queues': './queues',
  '@helpers': './helpers',
  '@tests': '../tests',
};

// Para desarrollo (apunta a src/)
export const getDevAliases = (srcDir: string) => {
  const devAliases: Record<string, string> = {};
  Object.entries(aliases).forEach(([alias, relativePath]) => {
    devAliases[alias] = path.join(srcDir, relativePath);
  });
  return devAliases;
};

// Para producción (apunta a dist/)
export const getProdAliases = () => {
  const prodAliases: Record<string, string> = {};
  Object.entries(aliases).forEach(([alias, relativePath]) => {
    prodAliases[alias] = path.join('dist', relativePath);
  });
  return prodAliases;
};
