# Revisión técnica previa a la siguiente fase

Fecha: 29 de julio de 2026.

## Resultado

El repositorio queda limpio, compilable y verificable con una puerta de calidad reproducible. La aplicación pública y las protecciones de acceso funcionan sobre el servidor de producción local. Las integraciones que dependen de cuentas externas no se certifican de extremo a extremo porque la configuración local de Supabase no apunta a una instancia utilizable y no se ha autorizado una base de staging concreta.

No se ha ejecutado ninguna migración ni se han creado usuarios, cobros, publicaciones o llamadas de pago durante esta revisión.

## Evidencia automática

| Control | Resultado |
|---|---|
| Instalación desde `package-lock.json` | `npm ci` correcto; parche local aplicado de forma reproducible |
| ESLint | Correcto, sin avisos |
| TypeScript estricto | Correcto, incluidos símbolos sin usar y consistencia de mayúsculas |
| Pruebas | 57 correctas; 9 pruebas RLS de integración omitidas por no existir `SUPABASE_TEST_DB_URL` de staging |
| Código muerto | `knip` sin hallazgos |
| Compilación | Next.js 16.2.12 correcto; 65 páginas y rutas generadas |
| Dependencias | Auditoría completa y de producción: 0 vulnerabilidades conocidas |
| Licencias del árbol bloqueado | Sin licencias ausentes ni dependencias AGPL, GPL, SSPL o BUSL detectadas |
| SQL estático | 29 de 29 tablas con RLS; todas las funciones `SECURITY DEFINER` con `search_path` fijado |
| Secretos actuales | Ningún valor sensible de `.env.local` aparece en archivos seguidos por Git |
| Navegador de producción | Inicio, configuración, privacidad, términos y protección de `/dashboard` sin overlays ni errores de consola |
| Cabeceras | CSP de producción sin `unsafe-eval`, HSTS, `nosniff`, política de frames y sin `X-Powered-By` |
| API anónima | IA responde 401; la vista previa de desarrollo responde 404 en producción |

## Correcciones realizadas

### Dependencias y herramientas

- Actualización compatible a Next.js 16, React 19.2, Supabase 2.111 y sus tipos.
- Resolución de las alertas transitivas de PostCSS, Sharp y `brace-expansion` mediante `overrides` y un parche mínimo para la compatibilidad de Minimatch 3.
- Migración de ESLint a la configuración plana de Next.js 16.
- Incorporación de `knip`, auditoría de dependencias, comprobación de código muerto y la puerta completa `npm run check`.
- CI alineado con la misma puerta que se ejecuta en local.

### Seguridad y límites

- Validación central de variables para que los marcadores no se traten como credenciales reales.
- Separación explícita de módulos exclusivos de servidor para Supabase administrativo, OpenAI, Stripe, Meta y límites de uso.
- Límites de tamaño y validación uniforme de objetos JSON en todas las rutas que reciben cuerpos.
- Validación de acciones y proveedores antes de consumir cuota de IA.
- La auditoría determinista de Instagram ya no consume cuota cuando se omite la IA o el proveedor no está configurado.
- Los límites de usuarios autenticados se calculan por identificador estable, sin depender de una cabecera IP manipulable.
- Límites adicionales para checkout, portal de facturación, desconexión de Instagram y pruebas de webhook.
- CSP endurecida en producción y eliminación de iconos binarios corruptos.

### Autenticación e interfaz

- Los errores de configuración de Supabase ya no escapan de `signIn`, `signUp` ni OAuth.
- La navegación posterior al acceso se realiza en un efecto, no durante el renderizado.
- La pantalla de ajustes consulta el estado de OpenAI al servidor sin importar el SDK secreto en el cliente.
- La pantalla `/setup` y las guías reflejan los comandos y límites de seguridad actuales.

### Base de datos

- `public.handle_new_user()` fija `search_path = public` y deja de conceder ejecución a `PUBLIC`.
- Nueva migración de endurecimiento incluida en el orden oficial.
- Cada archivo de migración se ejecuta en una transacción independiente y usa verificación TLS de certificados.
- Prueba estática que falla si se añade una tabla sin RLS o una función `SECURITY DEFINER` sin `search_path` fijado.

### Instagram

- Publicaciones limitadas a 10 imágenes, 4 MB por imagen, 56 MB por petición y 2.200 caracteres de texto.
- Validación estricta de PNG en base64 antes de reservar memoria.
- Espera del estado `FINISHED` de los contenedores antes de publicar.
- Eliminación de los recursos temporales de Storage después del intento de publicación.
- Documentado el permiso `instagram_business_content_publish` que faltaba en la guía.

### Limpieza

- Eliminación de lógica OAuth antigua de Meta y de contratos TypeScript sin consumidores.
- Eliminación de un logotipo PNG huérfano de 1,2 MB y sustitución de iconos corruptos por un SVG válido.
- Documentación de arranque reescrita sin valores reales ni instrucciones obsoletas.

## Límites de esta certificación

1. La configuración local de Supabase no es utilizable. Por ello, el redireccionamiento de `/login` y de las páginas protegidas hacia `/setup` es el comportamiento correcto comprobado.
2. Las nueve pruebas RLS de integración exigen una base exclusiva de staging. No deben ejecutarse contra producción.
3. No se han probado con cuentas reales el alta de usuario, OpenAI, Stripe ni la publicación y sincronización de Instagram. La compilación, autenticación previa, firmas, validaciones y fallos seguros sí están comprobados.
4. `npm ls --all` en npm 11 sobre Windows marca como sobrantes cinco dependencias WASM de plataformas no compatibles instaladas por dependencias opcionales de Sharp/Tailwind. `npm ci`, la compilación y las auditorías terminan correctamente; es un comportamiento conocido del instalador y no afecta al repositorio ni al paquete de producción.
5. Existen versiones mayores nuevas de OpenAI, Lucide, ESLint y TypeScript. No se han mezclado migraciones incompatibles con esta limpieza; las versiones actuales no presentan vulnerabilidades conocidas.

## Acciones externas obligatorias

Antes de considerar cerrada la certificación completa de producción:

1. Rotar `SUPABASE_SERVICE_ROLE_KEY`. Una clave de servicio estuvo versionada en el historial compartido, al menos en el commit `88a9053`; limpiar el árbol actual no invalida ese secreto antiguo.
2. Configurar `.env.local` con la URL y la clave pública de un Supabase de desarrollo o staging.
3. Confirmar el destino y ejecutar `npm run migrate:all` en staging.
4. Ejecutar `npm run test:rls` con `SUPABASE_TEST_DB_URL` de staging.
5. Hacer pruebas controladas con cuentas de prueba de Supabase, OpenAI, Stripe y Meta antes del despliegue.

Reescribir y forzar el historial remoto no se ha realizado: afectaría al repositorio compartido y requiere coordinación con todos los colaboradores. La rotación de la clave es la medida inmediata e imprescindible.

## Referencias

- [Lista de comprobación de producción de Next.js](https://nextjs.org/docs/app/guides/production-checklist).
- [Actualización a Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16).
- [Lista de comprobación de producción de Supabase](https://supabase.com/docs/guides/deployment/going-into-prod).
- [Row Level Security en Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Claves publicables y secretas de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- [Colección oficial de Meta para la API de Instagram](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api).
- [Incidencia de npm sobre dependencias opcionales por plataforma](https://github.com/npm/cli/issues/8320).
- [Prevención de filtraciones de secretos en GitHub](https://docs.github.com/en/code-security/tutorials/secure-your-organization/prevent-data-leaks).
