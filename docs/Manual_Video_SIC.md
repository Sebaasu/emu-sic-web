# Manual del Programador: Sistema de Video EMU-SIC

Este manual describe el funcionamiento, mapeo de memoria y control de atributos del sistema de video emulado en **EMU-SIC**.

## 1. Especificaciones Técnicas
El sistema de video de la arquitectura SIC utiliza un mapeo de memoria directo (**Memory-Mapped I/O**). El hardware de video escanea un rango específico de la memoria principal para representar caracteres y colores en pantalla.

*   **Rango de Memoria:** `4096` a `5095` (Decimal) / `0o10000` a `0o11747` (Octal).
*   **Resolución Estándar:** 40 columnas x 25 filas (1,000 palabras de memoria).
*   **Tipo de Renderizado:** Modo texto basado en celdas.
*   **Palabra de Datos:** 18 bits.

## 2. Anatomía de la Palabra de Video
Cada palabra en el rango de video controla un carácter y sus atributos visuales (colores, brillo y parpadeo). La estructura de la palabra de 18 bits es la siguiente:

| Bits | Función | Descripción |
| :--- | :--- | :--- |
| **0 - 7** | **ASCII** | Código del carácter a mostrar (32-126 para caracteres imprimibles). |
| **8 - 10** | **FG** | Color de frente (Foreground) - 3 bits. |
| **11** | **BR** | Brillo (Intensity/Bright) - 1 bit. |
| **12 - 14** | **BG** | Color de fondo (Background) - 3 bits. |
| **15** | **BL** | Parpadeo (Blink) - 1 bit. |
| **16 - 17** | **N/A** | No utilizados (deben ser 0). |

### Esquema de Bits (Visual):
```text
Bit:  17 16 | 15 | 14 13 12 | 11 | 10 09 08 | 07 06 05 04 03 02 01 00
Func:  [---]  BL   [--BG--]   BR   [--FG--]   [-------ASCII-------]
```

## 3. Tabla de Colores (CGA Standard)
Los campos **FG** (Frente) y **BG** (Fondo) utilizan 3 bits cada uno para representar los siguientes colores:

| Valor (Bin) | Valor (Dec) | Color | Con Brillo (BR=1) |
| :--- | :--- | :--- | :--- |
| `000` | 0 | Negro | Gris Oscuro |
| `001` | 1 | Azul | Azul Claro |
| `010` | 2 | Verde | Verde Claro |
| `011` | 3 | Cian | Cian Claro |
| `100` | 4 | Rojo | Rojo Claro |
| `101` | 5 | Magenta | Magenta Claro |
| `110` | 6 | Marrón | Amarillo |
| `111` | 7 | Gris | Blanco |

## 4. Cálculo de Valores
Para mostrar un carácter, se debe sumar el código ASCII con el valor de los atributos desplazados.

**Fórmula de Atributos:**
`Valor = (Blink << 15) | (BG << 12) | (Bright << 11) | (FG << 8) | ASCII`

### Ejemplo: Carácter 'A' (0x41), Frente Blanco, Fondo Azul.
1. **ASCII:** `0x41` (65)
2. **FG (Blanco):** `7` (Bin `111`) -> `7 << 8 = 0x700`
3. **BG (Azul):** `1` (Bin `001`) -> `1 << 12 = 0x1000`
4. **Bright:** `0`
5. **Blink:** `0`
6. **Resultado:** `0x1741` (Octal: `0o13501`)

## 5. Ejemplos en Ensamblador SIC

### Escribir 'H' en la esquina superior izquierda (4096)
```sic
        ORG 0o000
        LAC CHAR_H      ; Carga 'H' con atributos
        DAC 0o10000     ; Almacena en la primera dirección de video
        HLT

CHAR_H: DATA 0o007110   ; 'H' (0o110) + FG Blanco (0o007000)
```

### Limpiar pantalla (Llenar con espacios negros)
```sic
        ORG 0o000
        LAC SPACE       ; Carga espacio vacío
        DAC PTR         ; Inicializa puntero
LOOP:   LAC SPACE
        DAC I PTR       ; Almacena espacio en dirección apuntada
        ISZ PTR         ; Incrementa puntero
        LAC PTR
        AND LIMIT       ; Verifica si llegó al final (5096)
        SZA             ; Si no es cero, sigue
        JMP LOOP
        HLT

SPACE:  DATA 0o000040   ; Espacio ASCII 32 (0o40), Atributos 0
PTR:    DATA 0o10000    ; Inicio de video
LIMIT:  DATA 0o11750    ; Fin de video + 1
```

## 6. Consideraciones de Rendimiento
*   **80x25:** Si se activa el modo 80x25, el mapeo de memoria se extiende proporcionalmente, pero requiere una gestión más cuidadosa de los ciclos de CPU debido al mayor número de escrituras necesarias para llenar la pantalla.
*   **No Delay:** Para animaciones fluidas, se recomienda usar el modo de velocidad "MAX" en el simulador web.
