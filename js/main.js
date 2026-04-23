import { SICProcessor } from './processor.js';
import { SICAssembler } from './assembler.js';
import { SICUI } from './ui.js';

const cpu = new SICProcessor();
const asm = new SICAssembler();
const ui = new SICUI(cpu, asm);

let intervalId = null;
let speed = 100;

// Programa de ejemplo por defecto (Suma de dos números)
const defaultCode = `; Programa: Suma de A + B
        ORG 0o000
START:  LAC A
        TAD B
        DAC RESULT
        HLT
        
A:      DATA 0o000005
B:      DATA 0o000010
RESULT: DATA 0o000000
`;

document.getElementById('code-editor').value = defaultCode;

// Botón Ensamblar
document.getElementById('btn-assemble').addEventListener('click', () => {
    const source = document.getElementById('code-editor').value;
    const result = asm.assemble(source);

    if (result.errors.length > 0) {
        ui.setStatus(result.errors[0], 'error');
        return;
    }

    // Si el ensamblador detectó un ORG, actualizamos el input de PC Inicio
    if (result.firstOrg !== null) {
        document.getElementById('start-pc-input').value = ui.toOct(result.firstOrg, 5);
    }

    const startPc = parseInt(document.getElementById('start-pc-input').value, 8) || 0;

    cpu.reset();
    cpu.pc = startPc;
    cpu.mem.set(result.instructions);
    ui.renderListing(result.listing);
    ui.updateUI();
    ui.setStatus('Ensamblado y cargado con éxito');
});

// Botón Paso a Paso
document.getElementById('btn-step').addEventListener('click', () => {
    stopRun();
    cpu.step();
    ui.updateUI();
});

// Botón Instrucción
document.getElementById('btn-inst').addEventListener('click', () => {
    stopRun();
    cpu.stepInstruction();
    ui.updateUI();
});

// Botón Ejecutar
document.getElementById('btn-run').addEventListener('click', () => {
    startRun();
});

// Botón Pausar
document.getElementById('btn-pause').addEventListener('click', () => {
    stopRun();
});

// Botón Reset
document.getElementById('btn-reset').addEventListener('click', () => {
    stopRun();
    cpu.reset();
    const startPc = parseInt(document.getElementById('start-pc-input').value, 8) || 0;
    cpu.pc = startPc;
    ui.updateUI();
    ui.setStatus('Simulador reiniciado');
});

// Selección de Velocidad
document.getElementById('speed-select').addEventListener('change', (e) => {
    speed = parseInt(e.target.value);
    if (intervalId) {
        stopRun();
        startRun();
    }
});

// Selección de Ejemplos
document.getElementById('example-select').addEventListener('change', async (e) => {
    const url = e.target.value;
    if (!url) return;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const code = await response.text();
            document.getElementById('code-editor').value = code;
            ui.setStatus(`Ejemplo ${url.split('/').pop()} cargado`);
        } else {
            ui.setStatus('Error al cargar el ejemplo', 'error');
        }
    } catch (err) {
        ui.setStatus('Error de red al cargar el ejemplo', 'error');
    }
});

// Selección de Documentación
document.getElementById('docs-select').addEventListener('change', (e) => {
    const url = e.target.value;
    if (url) {
        window.open(url, '_blank');
        e.target.value = ""; // Resetear selector
    }
});

// Botón Modo Video
document.getElementById('btn-video-mode').addEventListener('click', (e) => {
    const is40 = ui.videoCols === 40;
    const newCols = is40 ? 80 : 40;
    ui.setVideoMode(newCols);
    e.target.textContent = `Cambiar Modo (${is40 ? '80x25' : '40x25'})`;
});

function startRun() {
    if (intervalId) return;
    
    document.getElementById('btn-run').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    ui.setStatus('Ejecutando...', 'info');

    const runLoop = () => {
        // En modo MAX (speed=0), ejecutamos muchos ciclos por frame
        const cyclesPerFrame = speed === 0 ? 500 : 1;
        const delay = speed === 0 ? 0 : (1000 / speed);

        for (let i = 0; i < cyclesPerFrame; i++) {
            const nextState = cpu.step();
            if (nextState === 28) { // HLT
                stopRun();
                ui.setStatus('HLT alcanzado');
                break;
            }
        }
        
        ui.updateUI();
        
        if (intervalId) {
            if (speed === 0) {
                intervalId = requestAnimationFrame(runLoop);
            } else {
                intervalId = setTimeout(runLoop, delay);
            }
        }
    };

    if (speed === 0) {
        intervalId = requestAnimationFrame(runLoop);
    } else {
        intervalId = setTimeout(runLoop, 1000 / speed);
    }
}

function stopRun() {
    if (speed === 0) {
        cancelAnimationFrame(intervalId);
    } else {
        clearTimeout(intervalId);
    }
    intervalId = null;
    document.getElementById('btn-run').disabled = false;
    document.getElementById('btn-pause').disabled = true;
}

// Atajos de teclado
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'F5') {
        e.preventDefault();
        startRun();
    } else if (e.key === 'F10') {
        e.preventDefault();
        cpu.step();
        ui.updateUI();
    } else if (e.key === 'F11') {
        e.preventDefault();
        cpu.stepInstruction();
        ui.updateUI();
    } else if (e.key === 'F2') {
        e.preventDefault();
        cpu.reset();
        const startPc = parseInt(document.getElementById('start-pc-input').value, 8) || 0;
        cpu.pc = startPc;
        ui.updateUI();
    }
});

// Inicialización
ui.updateUI();
ui.setStatus('Bienvenido a EMU-SIC Web');
