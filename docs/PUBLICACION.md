# Publicación por marca (B-21)

La configuración está preparada en `deploy/`, pero no hay un dominio de producción ni acceso de hosting registrado. No se publicó ninguna marca.

Destino preparado: servidor Linux, Node 24, MySQL compatible con las migraciones y Caddy para HTTPS. El mismo `dist/` sirve las tres marcas; cada dominio mantiene su almacenamiento del navegador y sus cookies. Las cuentas de API usan la misma base. B-21 solo estará completa cuando DNS, HTTPS y acceso por los tres dominios estén verificados.

1. Elegir tres nombres: `FITAPP_HOST`, `QIVOX_HOST` y `FITNESSGROUP_HOST`. Para selección automática usar respectivamente `fitapp.`, `qivox.` y `fitnessgroup.` al principio del hostname. Los dominios de los gimnasios requieren su acuerdo.
2. Apuntar sus registros DNS al servidor. Configurar esas tres variables para Caddy; usar `deploy/Caddyfile`. HTTPS necesita que DNS y puertos 80/443 estén disponibles.
3. Copiar el proyecto a `/srv/fitapp`, instalar dependencias con `npm ci` y `npm --prefix api ci`, generar `npm run build`. La raíz pública es exclusivamente `dist/`: no exponer repositorio, `api/` ni `.env`.
4. Crear el usuario de servicio `fitapp` y la base MySQL. Copiar `api/.env.example` a `/etc/fitapp/api.env`, completar credenciales y poner `COOKIE_SECURE=true`. Dar lectura solo al servicio. No guardar secretos en Git ni en `dist/`.
5. Instalar `deploy/fitapp-api.service`, ajustar la ruta de Node si hace falta y arrancar la API. Al iniciar aplica las migraciones pendientes. Hacer respaldo de MySQL antes de actualizar.
6. Validar Caddy con sus variables configuradas, arrancarlo y verificar `/api/health`, registro/ingreso, guardado y restauración en cada dominio. Comprobar `data-brand` y manifest, aislamiento local, animaciones y PWA por HTTPS.

La marca se selecciona por `?marca=`, subdominio o preferencia local. El primer acceso de cada dominio debe mostrar la marca esperada sin parámetros. Los subdominios diferentes separan los datos locales; una cuenta puede conservar sus datos al ingresar en otra marca porque la API es compartida. Si se necesita aislamiento entre gimnasios también en cuentas, hace falta un modelo de organizaciones, fuera de B-21.

Para Graphik (B-20) faltan el archivo webfont y la licencia entregados por Qivox. La variante actual utiliza Inter 800, según `docs/DESIGN.md`. El cambio de fuente se hará cuando estén disponibles; no se copian fuentes de la web pública.
