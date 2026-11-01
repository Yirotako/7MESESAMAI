PROYECTO AMAI — GUÍA SENCILLA
=============================

IMPORTANTE
Este ZIP contiene el proyecto web y el esquema de base de datos. Antes de que funcione en internet hay que conectar Supabase. No subas claves secretas al repositorio.

1) CREAR EL PROYECTO SUPABASE
- Entra a https://supabase.com y crea un proyecto.
- En Authentication > Providers, habilita Anonymous Sign-Ins (para el acceso de invitado).
- En SQL Editor, abre supabase/schema.sql, copia todo y ejecútalo.
- En Authentication > URL Configuration, añade la URL de tu GitHub Pages a Site URL y Redirect URLs.
  Ejemplo: https://TU-USUARIO.github.io/TU-REPOSITORIO/**

2) CONFIGURAR LAS CLAVES
- En Supabase > Project Settings > API (o Connect), copia Project URL y la clave pública anon/publishable.
- Abre js/config.js.
- Sustituye:
  PEGA_AQUI_TU_SUPABASE_PROJECT_URL
  PEGA_AQUI_TU_SUPABASE_ANON_O_PUBLISHABLE_KEY
- Guarda el archivo.

3) CAMBIAR EL CÓDIGO DE INVITACIÓN
- En supabase/schema.sql, antes de ejecutarlo, cambia CAMBIA-ESTE-CODIGO por un código privado que solo compartas con la persona invitada.
- Si ya ejecutaste el SQL, cambia el código con una nueva inserción/actualización desde SQL Editor:
  update public.invitation_access
  set access_code_hash = crypt('TU-NUEVO-CODIGO', gen_salt('bf'))
  where nickname = 'YAIR PRUEBA';
- El nombre inicial configurado es YAIR PRUEBA. Puedes cambiarlo en la tabla invitation_access.
- El nickname no es un secreto: el código privado es lo que protege el acceso.

4) CREAR TU CUENTA DE ADMINISTRADOR
- En Supabase > Authentication > Users, crea un usuario con tu correo y contraseña.
- Copia el UUID (ID) de ese usuario.
- En SQL Editor ejecuta:
  insert into public.admin_users(user_id) values ('PEGA-AQUI-EL-UUID');
- Abre tu página en /admin.html e inicia sesión con ese correo y contraseña.
- No compartas estas credenciales.

5) PUBLICAR EN GITHUB PAGES
- Crea un repositorio en GitHub.
- Sube el contenido de esta carpeta (index.html debe quedar en la raíz).
- En Settings > Pages selecciona Deploy from a branch, rama main y carpeta / (root).
- Guarda y espera la URL publicada.

6) PERSONALIZAR
- Desde /admin.html podrás editar la pregunta, la carta, el mensaje secreto, los recuerdos, la fecha, la música, la galería, el juego y módulos.
- Para añadir una imagen/video a la galería, usa una URL pública https:// accesible sin iniciar sesión. No uses enlaces privados de Drive.
- La música es opcional: usa un enlace directo a un archivo mp3/ogg alojado públicamente. Los navegadores pueden exigir que la persona pulse el botón para reproducir.
- Puedes ocultar módulos desde el panel.

SEGURIDAD Y LIMITACIONES
- GitHub Pages solo aloja la interfaz; Supabase conserva datos y gestiona autenticación.
- El código de acceso de invitado se verifica en una función de base de datos; no se almacena en texto plano.
- El panel requiere un usuario autenticado incluido en admin_users.
- Nunca publiques service_role/secret keys.
- La respuesta NO registra una solicitud de reingreso; el administrador puede autorizarla desde el panel.
- El registro de eventos es deliberadamente mínimo. No se recopila ni bloquea la IP de visitantes.
- Este proyecto es una base funcional que necesita completar los pasos de configuración anteriores antes de publicar.
- Para una publicación pública real, revisa la configuración de correo, políticas de Supabase, límites anti-abuso y privacidad.
