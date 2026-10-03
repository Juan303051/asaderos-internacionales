-- =====================================================================
--  Datos iniciales (el servidor los inserta solo si faltan).
--  El usuario administrador lo crea el servidor al primer arranque con el
--  correo y la contraseña de appsettings.json (sección "AdminInicial");
--  en su primer ingreso el sistema le pide cambiar esa contraseña.
--  Los precios se cambian desde la pantalla "Productos y precios" (solo admin).
-- =====================================================================

INSERT INTO presentaciones (nombre, precio, equivalente_pollos, orden) VALUES
    ('Pollo y medio', 42000, 1.50, 1),
    ('1 pollo',       32000, 1.00, 2),
    ('Medio pollo',   18000, 0.50, 3),
    ('1/4 de pollo',  12000, 0.25, 4)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO configuracion (clave, valor) VALUES ('stock_minimo', '5')
ON CONFLICT (clave) DO NOTHING;
