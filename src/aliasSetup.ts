import 'module-alias/register';
import moduleAlias from 'module-alias';
import { getDevAliases } from './config/aliases';

// Configurar aliases para desarrollo
if (process.env.NODE_ENV !== 'production') {
  const devAliases = getDevAliases(__dirname);
  moduleAlias.addAliases(devAliases);

  // Simple log para aliases (antes de que winston esté disponible)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔗 Development aliases configured:', Object.keys(devAliases));
  }
}
