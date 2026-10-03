# Pío Pío · Presentación para el comprador

## El problema
En un asadero, el negocio se pierde por los detalles:
- **¿Cuántos pollos quedan?** Se cuenta a ojo o en un cuaderno.
- **¿Por qué no cuadra la caja?** Nadie sabe si fue una venta no anotada, un regalo, una pérdida o un error.
- **¿Quién cambió ese precio?** O ese número. O esa cuenta.
- **¿Cuánto se gana de verdad?** Se sabe cuánto entra, no cuánto sobra.
- **Todos pueden tocar todo.** Y cuando algo falla, no hay responsable.

## La solución
**Pío Pío** lleva la cuenta de cada pollo, de cada venta y de cada peso, y **decide quién puede tocar qué**.

> **Solo el dueño modifica el inventario.** Los cajeros venden; los supervisores vigilan; nadie más altera las cuentas. Y todo cambio queda escrito con nombre y hora.

## Qué obtiene el comprador

### 1. Control real, no de adorno
- **3 roles** (Administrador, Supervisor, Cajero) con permisos que el **servidor hace cumplir**. Un cajero no puede modificar el inventario ni manipulando la página.
- **Bitácora inviolable:** quién compró, anuló, cambió un precio o creó un usuario, y cuándo.
- **Cada persona con su cuenta.** Contraseñas cifradas, bloqueo tras intentos fallidos, cambio obligatorio de clave temporal.
- **Los cambios de rol rigen al instante**, aunque la persona tenga la sesión abierta.

### 2. Inventario que no miente
- El stock **nunca se escribe a mano**: sale de compras − devoluciones − ventas ± ajustes.
- **Mermas, consumo del personal, donaciones y conteos físicos** con motivo obligatorio y responsable.
- **Alerta roja** y «alcanza para N días» según el ritmo real de ventas.
- El sistema **no deja vender pollos que no hay**, ni aunque dos cajas vendan a la vez.

### 3. Vender sin pensar
- Tarjetas grandes: **tocar, elegir pago, registrar.**
- **Calcula el cambio** y muestra el recibo (imprimible).
- Funciona en **computador, tablet o celular**, con una barra fija de cobro en pantallas pequeñas.

### 4. Dinero claro
- **Cierre de caja:** «debería haber $96.000, contaste $60.000: faltan $36.000». Queda guardado.
- **Gastos** (carbón, gas, nómina…) para una **utilidad estimada** honesta.
- **Reportes** de 7, 15 y 30 días por producto, forma de pago y vendedor; **exportables a Excel**.

### 5. Fácil de entender
- **Cada pantalla explica para qué sirve**, en una frase.
- **Recorrido de bienvenida** distinto para cada rol.
- **Centro de ayuda** con buscador, preguntas frecuentes y glosario.
- Menú que **solo muestra lo que el rol puede usar**: el cajero no ve pantallas que no le corresponden.

### 6. Fácil de instalar y mantener
- Un comando (`docker compose up -d`) o un doble clic.
- La base de datos **se crea y se actualiza sola**; las actualizaciones **conservan los datos**.
- Un solo archivo (`Permisos.cs`) define qué puede hacer cada rol.
- Respaldo con un script. Código en C# (ASP.NET Core 8) y PostgreSQL, tecnologías estándar con soporte a largo plazo.

## Antes y después

| | Antes (cuaderno / hoja de cálculo) | Con Pío Pío |
|---|---|---|
| ¿Cuántos pollos quedan? | Se cuenta a ojo | Número exacto, siempre |
| ¿Quién puede cambiar el inventario? | Cualquiera | Solo el administrador |
| Una venta equivocada | Se tacha, no se sabe quién | Se anula, queda anotado quién y cuándo |
| Cierre de caja | Calculadora y suerte | Cuadre automático y guardado |
| ¿Cuánto gano? | Se intuye | Utilidad estimada del día, la semana y el mes |
| Un empleado nuevo | Hay que explicarle todo | Recorrido de bienvenida y ayuda integrada |
| Auditoría | Imposible | Bitácora completa |

## Guion de demostración (5 minutos)

> Prepara antes: el sistema encendido, un administrador y un cajero creados, y unos pollos comprados.

**Minuto 1 · «Mire quién entra»**
1. Entra como **Administrador**. Muestra el **Inicio**: pollos, ventas del día, utilidad, siguiente paso.
2. Abre **Equipo y roles**. Muestra las tres tarjetas: *«Cada persona tiene un rol y el rol define qué puede hacer.»*

**Minuto 2 · «El cajero no puede tocar el inventario»**
3. Cierra sesión y entra como **Cajero**. Muestra que el menú es corto.
4. Abre **Inventario**: aviso **🔒 Solo lectura**, sin formularios, sin costos. *«Ni aunque quiera.»*

**Minuto 3 · «Vender en tres toques»**
5. En **Vender**: toca dos tarjetas, elige **Efectivo**, escribe `50000`. Señala el **cambio**.
6. **Registrar venta**: aparece el **recibo** y el confeti. Muestra que los pollos bajaron.

**Minuto 4 · «El dueño controla todo»**
7. Vuelve como **Administrador**. En **Inventario** registra una **compra** y un **ajuste de merma** (con motivo).
8. Abre la **Bitácora**: *«Aquí está quién hizo cada cosa y a qué hora. Nadie puede borrarlo.»*
9. En **Equipo y roles**, **desactiva** al cajero: *«Rige al instante»* (su sesión se cierra).

**Minuto 5 · «Y sabe cuánto gana»**
10. **Cierre de caja:** escribe un efectivo contado menor al esperado; muestra **«Faltan $…»**.
11. **Reportes:** utilidad estimada, gráfico, por producto y por vendedor. **Descargar CSV**.
12. Cierra con **Ayuda**: *«Y cada pantalla se explica sola.»*

## Preguntas que suele hacer el comprador

**¿Necesita internet?** No para funcionar: corre en el computador del local y se usa desde el WiFi del local. (Solo la tipografía se descarga de internet; sin conexión se usa una de respaldo.)

**¿Qué pasa si se va la luz?** Los datos están en PostgreSQL y no se pierden. Al volver, se enciende el programa y sigue donde quedó.

**¿Puedo ponerle más cajeros?** Sí, sin límite: una cuenta por persona.

**¿Se puede cambiar lo que puede hacer cada rol?** Sí, en un solo archivo (`Permisos.cs`). Ver [Roles y permisos](ROLES_Y_PERMISOS.md).

**¿Y si ya uso la versión anterior?** Se actualiza sola y conserva todos los datos. Ver el [CHANGELOG](CHANGELOG.md).

**¿Qué NO hace todavía?** Lo que conviene decir con honestidad: no tiene facturación electrónica DIAN, no maneja varias sucursales, no funciona sin el computador del local encendido y los respaldos son manuales (con script). Son extensiones naturales para una próxima versión.
