#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Leer el archivo aliases.ts y extraer la configuración
const aliasesFilePath = path.join(__dirname, '../src/config/aliases.ts');
const aliasesContent = fs.readFileSync(aliasesFilePath, 'utf8');

// Extraer el objeto aliases usando regex (simple pero efectivo)
const aliasesMatch = aliasesContent.match(/export const aliases = \{([\s\S]*?)\};/);
if (!aliasesMatch) {
  console.error('❌ No se pudo encontrar la configuración de aliases');
  process.exit(1);
}

// Parsear los aliases de forma simple
const aliasesText = aliasesMatch[1];
const aliases = {};

// Extraer cada línea que contiene un alias
const lines = aliasesText.split('\n');
lines.forEach(line => {
  const match = line.match(/['"`](@[^'"`]+)['"`]:\s*['"`]([^'"`]+)['"`]/);
  if (match) {
    const [, alias, relativePath] = match;
    aliases[alias] = relativePath;
  }
});

console.log('📋 Aliases encontrados:', aliases);

// Generar aliases para producción
const prodAliases = {};
Object.entries(aliases).forEach(([alias, relativePath]) => {
  prodAliases[alias] = path.join('dist', relativePath).replace(/\\/g, '/');
});

// Leer package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Actualizar _moduleAliases
packageJson._moduleAliases = prodAliases;

// Escribir package.json actualizado
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log('✅ Package.json aliases updated:', Object.keys(prodAliases));
