-- =====================================================================
--  Asadero Pío Pío · Control de pollos
--  Esquema de la base de datos PostgreSQL (versión 4.0)
--  © 2026 Juan Diego González Marín y Santiago Cardoso Padilla
--
--  El servidor C# ejecuta este archivo automáticamente al arrancar.
--  Es idempotente: se puede ejecutar varias veces sin borrar datos, y
--  actualiza las bases creadas con versiones anteriores (3.x).
--  Para ejecutarlo a mano:  psql -U postgres -d asadero_pio_pio -f 01_esquema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
--  USUARIOS Y ROLES
--  Roles: admin (todo), supervisor (reportes y caja, sin tocar inventario)
--  y cajero (solo vende). Los permisos de cada rol viven en el servidor
--  (Seguridad/Permisos.cs); aquí solo se guarda a qué rol pertenece cada usuario.
--  La contraseña NUNCA se guarda: solo su huella PBKDF2-SHA256 con sal.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(80)  NOT NULL,
    correo      VARCHAR(120) NOT NULL UNIQUE,
    clave_hash  TEXT         NOT NULL,
    rol         VARCHAR(10)  NOT NULL DEFAULT 'cajero',
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Migraciones de la versión 4.0 (seguras: no borran nada).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_clave BOOLEAN     NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_ingreso     TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos  INT         NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta    TIMESTAMPTZ;
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'supervisor', 'cajero'));

-- ---------------------------------------------------------------------
--  PRODUCTOS: presentaciones que se venden y cuántos pollos descuenta cada una
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentaciones (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(60)   NOT NULL UNIQUE,
    precio              NUMERIC(12,2) NOT NULL CHECK (precio > 0),
    equivalente_pollos  NUMERIC(6,2)  NOT NULL CHECK (equivalente_pollos > 0),
    orden               INT           NOT NULL DEFAULT 0,
    activa              BOOLEAN       NOT NULL DEFAULT TRUE
);

-- Ajustes generales (clave / valor). Ej.: stock_minimo = 5
CREATE TABLE IF NOT EXISTS configuracion (
    clave  VARCHAR(40) PRIMARY KEY,
    valor  TEXT        NOT NULL
);

-- ---------------------------------------------------------------------
--  INVENTARIO: entradas (compras), devoluciones y ajustes
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compras (
    id              SERIAL PRIMARY KEY,
    fecha           DATE          NOT NULL,
    cantidad        NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    costo_unitario  NUMERIC(12,2) NOT NULL CHECK (costo_unitario > 0),
    total           NUMERIC(14,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    proveedor       VARCHAR(120)  NOT NULL DEFAULT '',
    usuario_id      INT REFERENCES usuarios(id),
    anulada         BOOLEAN       NOT NULL DEFAULT FALSE,
    anulada_en      TIMESTAMPTZ,
    anulada_por     INT REFERENCES usuarios(id),
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE compras ADD COLUMN IF NOT EXISTS anulada BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS anulada_en TIMESTAMPTZ;
ALTER TABLE compras ADD COLUMN IF NOT EXISTS anulada_por INT REFERENCES usuarios(id);

-- Devoluciones parciales o completas al proveedor, con historial auditable.
CREATE TABLE IF NOT EXISTS devoluciones_compra (
    id              SERIAL PRIMARY KEY,
    compra_id       INT           NOT NULL REFERENCES compras(id),
    fecha           DATE          NOT NULL,
    cantidad        NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
    total           NUMERIC(14,2) NOT NULL CHECK (total > 0),
    motivo          VARCHAR(160)  NOT NULL DEFAULT '',
    usuario_id      INT REFERENCES usuarios(id),
    creado_en       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_devoluciones_compra ON devoluciones_compra (compra_id);

-- Ajustes de inventario: pollos que salen sin ser venta (merma, consumo del personal,
-- donación, conteo físico). La cantidad es con signo: negativo resta, positivo suma.
CREATE TABLE IF NOT EXISTS ajustes_inventario (
    id          SERIAL PRIMARY KEY,
    fecha       DATE          NOT NULL,
    tipo        VARCHAR(20)   NOT NULL CHECK (tipo IN ('merma', 'consumo', 'donacion', 'conteo_mas', 'conteo_menos')),
    cantidad    NUMERIC(10,2) NOT NULL CHECK (cantidad <> 0),
    motivo      VARCHAR(160)  NOT NULL,
    usuario_id  INT REFERENCES usuarios(id),
    creado_en   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
--  VENTAS (salidas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ventas (
    id           SERIAL PRIMARY KEY,
    fecha        DATE          NOT NULL,
    total        NUMERIC(14,2) NOT NULL CHECK (total >= 0),
    pollos       NUMERIC(10,2) NOT NULL CHECK (pollos > 0),
    usuario_id   INT REFERENCES usuarios(id),
    anulada      BOOLEAN       NOT NULL DEFAULT FALSE,
    anulada_en   TIMESTAMPTZ,
    anulada_por  INT REFERENCES usuarios(id),
    creado_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(15) NOT NULL DEFAULT 'efectivo'
    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta'));
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS nota VARCHAR(120) NOT NULL DEFAULT '';

-- Detalle de cada venta: qué presentaciones y a qué precio (se guarda el
-- precio del momento para que el historial no cambie si luego sube el precio).
CREATE TABLE IF NOT EXISTS venta_detalle (
    id                  SERIAL PRIMARY KEY,
    venta_id            INT           NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    presentacion_id     INT           NOT NULL REFERENCES presentaciones(id),
    cantidad            INT           NOT NULL CHECK (cantidad > 0),
    precio_unitario     NUMERIC(12,2) NOT NULL,
    equivalente_pollos  NUMERIC(6,2)  NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_compras_fecha ON compras (fecha);
CREATE INDEX IF NOT EXISTS ix_ventas_fecha  ON ventas (fecha) WHERE NOT anulada;
CREATE INDEX IF NOT EXISTS ix_detalle_venta ON venta_detalle (venta_id);

-- ---------------------------------------------------------------------
--  DINERO: gastos y cierres de caja
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gastos (
    id           SERIAL PRIMARY KEY,
    fecha        DATE          NOT NULL,
    concepto     VARCHAR(120)  NOT NULL,
    categoria    VARCHAR(20)   NOT NULL CHECK (categoria IN ('combustible', 'servicios', 'empaques', 'nomina', 'mantenimiento', 'otros')),
    valor        NUMERIC(14,2) NOT NULL CHECK (valor > 0),
    metodo       VARCHAR(15)   NOT NULL DEFAULT 'efectivo' CHECK (metodo IN ('efectivo', 'transferencia')),
    usuario_id   INT REFERENCES usuarios(id),
    anulado      BOOLEAN       NOT NULL DEFAULT FALSE,
    anulado_en   TIMESTAMPTZ,
    anulado_por  INT REFERENCES usuarios(id),
    creado_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_gastos_fecha ON gastos (fecha) WHERE NOT anulado;

-- Cada cierre guarda una "foto" de los números del día para poder revisarla después.
CREATE TABLE IF NOT EXISTS cierres_caja (
    id                   SERIAL PRIMARY KEY,
    fecha                DATE          NOT NULL,
    base                 NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base >= 0),
    ventas_efectivo      NUMERIC(14,2) NOT NULL DEFAULT 0,
    ventas_transferencia NUMERIC(14,2) NOT NULL DEFAULT 0,
    ventas_tarjeta       NUMERIC(14,2) NOT NULL DEFAULT 0,
    gastos_efectivo      NUMERIC(14,2) NOT NULL DEFAULT 0,
    esperado             NUMERIC(14,2) NOT NULL,
    contado              NUMERIC(14,2) NOT NULL CHECK (contado >= 0),
    diferencia           NUMERIC(14,2) NOT NULL,
    nota                 VARCHAR(160)  NOT NULL DEFAULT '',
    usuario_id           INT REFERENCES usuarios(id),
    creado_en            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
--  BITÁCORA: quién hizo qué y cuándo (solo se agrega, nunca se edita)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id              BIGSERIAL PRIMARY KEY,
    creado_en       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    usuario_id      INT,
    usuario_nombre  VARCHAR(80)  NOT NULL DEFAULT '',
    rol             VARCHAR(10)  NOT NULL DEFAULT '',
    accion          VARCHAR(40)  NOT NULL,
    detalle         TEXT         NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS ix_auditoria_fecha ON auditoria (creado_en DESC);

-- ---------------------------------------------------------------------
--  VISTAS (se recrean en cada arranque; no guardan datos)
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS v_movimientos;
DROP VIEW IF EXISTS v_stock;
DROP VIEW IF EXISTS v_costo_promedio;

-- Movimientos vigentes de inventario. Las anulaciones se conservan para auditoría.
-- tipo: c = compra, r = devolución al proveedor, v = venta, a = ajuste.
CREATE VIEW v_movimientos AS
    SELECT 'c'::TEXT AS tipo, c.id, c.fecha, c.cantidad AS pollos, c.total,
           c.proveedor::TEXT AS nota, c.creado_en, c.usuario_id
      FROM compras c
     WHERE NOT c.anulada
    UNION ALL
    SELECT 'r'::TEXT, r.id, r.fecha, (-r.cantidad)::NUMERIC(10,2), (-r.total)::NUMERIC(14,2),
           COALESCE(NULLIF(r.motivo, ''), 'Devolución al proveedor')::TEXT, r.creado_en, r.usuario_id
      FROM devoluciones_compra r JOIN compras c ON c.id = r.compra_id
     WHERE NOT c.anulada
    UNION ALL
    SELECT 'v'::TEXT, v.id, v.fecha, v.pollos, v.total,
           COALESCE((SELECT STRING_AGG(d.cantidad || 'x ' || p.nombre, ', ' ORDER BY p.orden)
                       FROM venta_detalle d JOIN presentaciones p ON p.id = d.presentacion_id
                      WHERE d.venta_id = v.id), '')::TEXT,
           v.creado_en, v.usuario_id
      FROM ventas v
     WHERE NOT v.anulada
    UNION ALL
    SELECT 'a'::TEXT, a.id, a.fecha, a.cantidad, 0::NUMERIC(14,2),
           (a.tipo || ': ' || a.motivo)::TEXT, a.creado_en, a.usuario_id
      FROM ajustes_inventario a;

-- Inventario = compras activas − devoluciones − ventas activas ± ajustes.
CREATE VIEW v_stock AS
    SELECT (SELECT COALESCE(SUM(cantidad), 0) FROM compras WHERE NOT anulada)
         - (SELECT COALESCE(SUM(r.cantidad), 0) FROM devoluciones_compra r JOIN compras c ON c.id = r.compra_id WHERE NOT c.anulada)
         - (SELECT COALESCE(SUM(pollos), 0) FROM ventas WHERE NOT anulada)
         + (SELECT COALESCE(SUM(cantidad), 0) FROM ajustes_inventario) AS disponibles;

-- Costo promedio de un pollo = lo gastado en compras (menos devoluciones) / pollos comprados.
-- Sirve para calcular la utilidad estimada. Si no hay compras, el costo es 0.
CREATE VIEW v_costo_promedio AS
    SELECT CASE WHEN q.cant > 0 THEN GREATEST(q.valor, 0) / q.cant ELSE 0 END AS costo
      FROM (SELECT (SELECT COALESCE(SUM(total), 0) FROM compras WHERE NOT anulada)
                 - (SELECT COALESCE(SUM(r.total), 0) FROM devoluciones_compra r JOIN compras c ON c.id = r.compra_id WHERE NOT c.anulada) AS valor,
                   (SELECT COALESCE(SUM(cantidad), 0) FROM compras WHERE NOT anulada)
                 - (SELECT COALESCE(SUM(r.cantidad), 0) FROM devoluciones_compra r JOIN compras c ON c.id = r.compra_id WHERE NOT c.anulada) AS cant) q;
