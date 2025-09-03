import 'module-alias/register';
import moduleAlias from 'module-alias';
import { getDevAliases } from './config/aliases';

// Configurar aliases para desarrollo
if (process.env.NODE_ENV !== 'production') {
  const devAliases = getDevAliases(__dirname);
  moduleAlias.addAliases(devAliases);

  console.log('🔗 Development aliases configured:', Object.keys(devAliases));
}
