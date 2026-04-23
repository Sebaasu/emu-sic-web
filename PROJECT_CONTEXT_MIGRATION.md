# Contexto del Proyecto: Migración de EMU-SIC (Desktop -> Web)

Este documento sirve como base de conocimiento para la migración del proyecto **EMU-SIC** a una plataforma web alojada en GitHub Pages.

## 1. El Procesador: Small Instructional Computer (SIC)
- **Arquitectura:** Basada en el libro *"Digital Systems: Hardware Organization and Design"* (Hill & Peterson).
- **Palabra de datos:** 18 bits (Bit 0 = MSB, Bit 17 = LSB).
- **Memoria:** 8192 palabras (13 bits de direccionamiento).
- **Registros:**
  - `PC` (13 bits): Contador de programa.
  - `AC` (18 bits): Acumulador.
  - `IR` (18 bits): Registro de instrucción.
  - `MA` (13 bits): Dirección de memoria.
  - `MD` (18 bits): Datos de memoria.
  - `IA`, `IB` (13 bits): Registros de índice.
  - `LF` (1 bit): Link Flag (acarreo/enlace).
- **FSM:** Emulación fiel ciclo a ciclo de la Unidad de Control (aprox. 50 estados).

## 2. Estado Actual (Versión 6.0 Desktop)
- **Lenguaje:** Python 3.12 con Tkinter.
- **Ensamblador (`assembler.py`):** 
  - Dos pasos. 
  - Directivas: `ORG`, `DATA` (unificada), `SYM`.
  - Soporta MRI (Referencia a memoria) y IOP (Operación combinables).
  - Prefijos numéricos: `0x` (Hex), `0o` (Oct), `0b` (Bin), `0d` (Dec).
- **Interfaz:**
  - Editor de código con pestañas (Editor / Listing / About).
  - Desensamblado dinámico en la pestaña Listing con resaltado de PC.
  - Múltiples vistas de memoria configurables (inicio/fin en octal).
  - Display flotante (Toplevel) emulando salida de video (40x25 / 80x25).
  - Mapeo de video: Direcciones `4096-5095`. Cada palabra contiene código ASCII (8 bits) y atributos (FG, BG, Brillo, Parpadeo).

## 3. Objetivo de la Migración
- **Plataforma:** GitHub Pages (`github.io`).
- **Stack Tecnológico:** HTML5, CSS3 (Modo Oscuro nativo), JavaScript (ES6+).
- **Rendimiento:** Uso de `TypedArrays` (`Uint32Array`) para la memoria y registros.
- **Visualización:**
  - Reemplazar Tkinter por un layout responsivo basado en Flexbox/Grid.
  - Renderizado de video mediante `<canvas>` o rejilla de DOM optimizada.
  - Integración de documentación PDF nativa del navegador.

## 4. Lógica Pendiente e Ideas Futuras
- **Lógica NO DELAY:** Optimización de la FSM para saltar estados decisionales puros en el mismo ciclo de reloj (sin consumir pulso de `clk`).
- **UART/Teclado:** Implementar entrada de datos desde el teclado hacia el simulador.
- **Portabilidad:** El ensamblador debe ser portado a JS para funcionar íntegramente en el cliente.

## 5. Instrucciones para el Nuevo Agente
1. Lee `sic_core.py` para entender la FSM y tradúcela a una clase `SICProcessor` en JavaScript.
2. Lee `assembler.py` para portar la lógica de parsing y generación de binarios a JS.
3. Diseña una UI moderna que mantenga la organización por categorías de los registros.
4. El repositorio `emu-sic` original está disponible como subcarpeta/clon para referencia de lógica y archivos de documentación en `docs/`.
