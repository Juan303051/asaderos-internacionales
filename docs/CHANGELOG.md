# Historial de versiones

## Versión 4.0 · Roles, control y gestión completa

**La idea:** pasar de «un contador de pollos» a un sistema de gestión donde **solo el administrador modifica el inventario** y todo queda registrado.

### Nuevo
- **Tres roles con permisos reales:** Administrador, Supervisor (nuevo) y Cajero. Los permisos se validan en el servidor y están definidos en un solo archivo (`Seguridad/Permisos.cs`).
- **Menú por rol:** cada persona ve solo las pantallas que puede usar; los datos sensibles (costos, ventas de otros) tampoco viajan al navegador de quien no debe verlos.
- **Equipo y roles:** crear usuarios, cambiar roles, desactivar y restablecer contraseñas desde la página. Los cambios rigen **al instante**.
- **Bitácora de auditoría:** quién hizo qué y cuándo (compras, anulaciones, precios, usuarios, cierres…).
- **Ajustes de inventario:** merma, consumo del personal, donación y conteo físico, con motivo obligatorio.
- **Productos y precios** editables por el administrador (crear, cambiar precio, ocultar).
- **Forma de pago** en cada venta (efectivo, transferencia, tarjeta), **cálculo del cambio**, nota y **recibo imprimible**.
- **Historial de ventas** por día, con vendedor y anulación.
- **Cierre de caja** con cuadre automático (base + efectivo − gastos) y diferencia guardada.
- **Gastos** por categoría, en efectivo o transferencia.
- **Reportes** de 7, 15 y 30 días: ventas, compras, gastos, pérdidas, **utilidad estimada**, por producto/forma de pago/vendedor; **CSV** e impresión.
- **Inicio rediseñado:** saludo por rol, «siguiente paso» recomendado, comparación con ayer, días que alcanza el stock, accesos directos y lo más vendido.
- **Centro de ayuda** con buscador, matriz de permisos, guía de cada pantalla, preguntas frecuentes y glosario; **recorrido de bienvenida** por rol; **Mi cuenta**; buscador de pantallas (`Ctrl + K`); modo rápido.
- **Seguridad:** bloqueo de cuenta tras 5 intentos fallidos, cambio obligatorio de contraseña temporal, política de contraseña (8+ con letras y números), revalidación del rol en cada petición.
- Barra fija de cobro en celular/tablet, `manifest` para agregar a la pantalla de inicio y archivos estáticos que siempre revalidan.
- **Documentación completa** en `docs/` y script `scripts/prueba-permisos.sh`.

### Cambiado
- El cajero **ya no ve reportes ni costos** y solo ve **sus propias ventas** de hoy.
- «Comprar pollos» pasó a **Inventario**, junto a devoluciones y ajustes.
- El stock ahora incluye los **ajustes** (`v_stock`) y el historial los muestra (`v_movimientos`).
- El administrador creado en la primera instalación **debe cambiar su contraseña** al entrar.

### Corregido
- Las «ventas de hoy» en Docker usaban hora UTC; el `docker-compose.yml` ahora fija `TZ=America/Bogota`.
- La documentación mencionaba una carpeta `docs/` que no existía; ahora existe y está completa.

### Actualizar desde 3.2
1. Haz un respaldo.
2. Reemplaza los archivos (o `docker compose up -d --build`).
3. Arranca: la base se **actualiza sola** y **conserva todos los datos**. Las ventas anteriores quedan con forma de pago «efectivo».
4. Entra con tu usuario `admin` de siempre.

Cambios en la base de datos (todos aditivos): columnas nuevas en `usuarios` y `ventas`; tablas `ajustes_inventario`, `gastos`, `cierres_caja` y `auditoria`; el rol `supervisor` en la restricción de `usuarios`; las vistas se recrean.

---

## Versión 3.2
- Servidor en C# con PostgreSQL (ya no en el navegador).
- Ingreso real con contraseñas cifradas (PBKDF2-SHA256), sesión segura y roles admin/cajero.
- Máximo 8 intentos de ingreso por minuto.
- Ventas validadas en el servidor (no se vende más de lo que hay, ni con dos cajas a la vez).
- Anular ventas y compras; devoluciones parciales al proveedor.
- Pantalla de carga con la marca, cortina entre pantallas y navegación lateral o superior.
