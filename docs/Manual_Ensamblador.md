# Manual del Ensamblador SIC (V2.5)

Este documento describe la sintaxis y las capacidades del **Ensamblador V2** para el procesador SIC. Esta versión unifica las directivas de datos y mejora el soporte para múltiples bases numéricas.

## 1. Estructura de una Línea de Código

Cada línea en un archivo `.sic` sigue el formato:
`[ETIQUETA:] MNEMÓNICO [MODO] [ARGUMENTO] [; Comentario]`

- **ETIQUETA:** Opcional. Debe terminar en `:` (ej. `INICIO:`). Almacena la dirección actual del PC.
- **MNEMÓNICO:** Instrucción del procesador o directiva del ensamblador.
- **MODO:** Solo para instrucciones de referencia a memoria (MRI). Opciones: `I` (Indirecto), `IA` (Índice A), `IB` (Índice B).
- **ARGUMENTO:** Valor numérico o nombre de etiqueta/símbolo.
- **COMENTARIO:** Todo lo que sigue a un `;` es ignorado.

## 2. Directivas del Ensamblador

Las directivas son órdenes para el ensamblador y no generan instrucciones de CPU directamente.

### `ORG <dirección>` (Origin)
Establece la dirección de memoria donde se colocará la siguiente instrucción.
*Ejemplo:* `ORG 0o1000 ; El código empezará en 512 decimal`

### `DATA <valor1>[, <valor2>, ...]`
Inserta valores constantes de 18 bits directamente en la memoria. Reemplaza a las antiguas directivas `DEC`, `OCT` y `HEX`. Soporta múltiples valores separados por comas.
*Ejemplo:* `CONSTANTES: DATA 10, 0o77, 0xFF, 0b1010`

### `SYM <nombre> <valor>` (Symbol)
Define una constante global que no ocupa espacio en memoria, sino que se reemplaza en el código donde se use.
*Ejemplo:* `SYM LIMITE 0o2000`

## 3. Formatos Numéricos

El ensamblador detecta la base numérica según el prefijo:
- **Octal:** Prefijo `0o` (ej. `0o777`).
- **Hexadecimal:** Prefijo `0x` (ej. `0x3FFFF`).
- **Binario:** Prefijo `0b` (ej. `0b1101`).
- **Decimal:** Prefijo `0d` o sin prefijo (ej. `123`).

## 4. Instrucciones de Referencia a Memoria (MRI)

Ocupan una palabra y referencian una dirección de memoria (13 bits).

| Mnemónico | Opcode (Bin) | Descripción |
| :--- | :--- | :--- |
| **ISZ** | 000 | Incrementa y salta si es cero. |
| **LAC** | 001 | Carga el AC con el contenido de memoria. |
| **AND** | 010 | Operación AND lógica entre AC y memoria. |
| **TAD** | 011 | Suma el contenido de memoria al AC. |
| **JMS** | 100 | Salto a subrutina (guarda PC en la dirección). |
| **DAC** | 101 | Deposita el AC en la memoria. |
| **JMP** | 110 | Salto incondicional. |

### Modos de Direccionamiento
- `LAC 100` : **Directo**. AC <- Mem[100].
- `LAC I 100` : **Indirecto**. AC <- Mem[Mem[100]].
- `LAC IA 100`: **Indexado A**. AC <- Mem[100 + IA].
- `LAC IB 100`: **Indexado B**. AC <- Mem[100 + IB].

## 5. Instrucciones de Operación / I/O (IOP)

Son instrucciones de 18 bits que realizan micro-operaciones. Algunas se pueden **combinar** en una sola línea separándolas por espacios.
Puede referirse al diagrama FD_47Pasos.pdf para comprender las posibles combinaciones.

| Mnemónico | Valor (Octal) | Descripción |
| :--- | :--- | :--- |
| **HLT** | 706000 | Detiene la ejecución. |
| **CLA** | 701000 | Limpia el AC (AC = 0). |
| **CMA** | 701400 | Complementa el AC (NOT). |
| **CLL** | 704000 | Limpia el Link Flag (LF = 0). |
| **STL** | 702000 | Establece el Link Flag (LF = 1). |
| **RAL/RAR**| 710000/730000| Rota AC y LF a Izq/Der. |
| **SKZ/SKP/SKN**| 700004/2/1 | Saltar si AC es Cero / Positivo / Negativo. |
| **DTA/DTB** | 700100/140 | Transfiere AC a registro de índice A o B. |
| **DFA/DFB** | 700040/060 | Transfiere registro de índice A o B al AC. |
| **INA/INB** | 700120/160 | Incrementa registro de índice A o B. |

*Ejemplo de combinación:* `CLA CMA ; Limpia y complementa (deja el AC en 777777)`
