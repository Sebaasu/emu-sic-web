import { SICProcessor } from './processor.js';
import { SICAssembler } from './assembler.js';
import { SICUI } from './ui.js';

const cpu = new SICProcessor();
const asm = new SICAssembler();
const ui = new SICUI(cpu, asm);

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

// --- DEFINICIÓN DEL MODO SIC PARA ACE EDITOR ---
function defineSICMode() {
    ace.define('ace/mode/sic_highlight_rules', function(require, exports, module) {
        var oop = require("ace/lib/oop");
        var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

        var SICHighlightRules = function() {
            this.$rules = {
                "start": [
                    { token: "comment", regex: ";.*$" },
                    { token: "variable.label", regex: "^[a-zA-Z_][a-zA-Z0-9_]*:" },
                    { token: "keyword.directive", regex: "\\b(?:ORG|DATA|SYM)\\b", caseInsensitive: true },
                    // Instrucciones (MRI + IOP Unificadas)
                    { token: "support.function", regex: "\\b(?:ISZ|LAC|AND|TAD|JMS|DAC|JMP|NOP|HLT|CLA|CMA|STA|CLL|STL|RAL|RAR|RAL2|RAR2|RAL3|RAR3|SKZ|SKP|SKN|SZL|DTA|DTB|DFA|DFB|INA|INB|IN|OUT)\\b", caseInsensitive: true },
                    { token: "variable.parameter.mode", regex: "\\b(?:I|IA|IB)\\b", caseInsensitive: true },
                    { token: "constant.numeric", regex: "0x[0-9a-fA-F]+\\b|0o[0-7]+\\b|0b[01]+\\b|0d[0-9]+\\b|\\b[0-9]+\\b" },
                    { token: "text", regex: "\\s+" }
                ]
            };
        };
        oop.inherits(SICHighlightRules, TextHighlightRules);
        exports.SICHighlightRules = SICHighlightRules;
    });

    ace.define('ace/mode/sic', function(require, exports, module) {
        var oop = require("ace/lib/oop");
        var TextMode = require("ace/mode/text").Mode;
        var SICHighlightRules = require("ace/mode/sic_highlight_rules").SICHighlightRules;

        var Mode = function() {
            this.HighlightRules = SICHighlightRules;
        };
        oop.inherits(Mode, TextMode);
        exports.Mode = Mode;
    });
}

// Inicialización de Ace Editor con Modo SIC
let editor = null;
try {
    defineSICMode();
    editor = ace.edit("editor-container");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/sic");
    editor.setValue(defaultCode, -1);
    editor.setOptions({
        fontSize: "14px",
        showPrintMargin: false,
        displayIndentGuides: true,
        useSoftTabs: true,
        tabSize: 8
    });
} catch (e) {
    console.error("Error cargando Ace Editor:", e);
    ui.setStatus("Error cargando el editor", "error");
}

const fileNameDisplay = document.getElementById('file-name');
let intervalId = null;
let speed = 100;

function getCode() { return editor ? editor.getValue() : ""; }
function setCode(code) { if (editor) editor.setValue(code, -1); }

// Evento Ensamblar
document.getElementById('btn-assemble').addEventListener('click', () => {
    const source = getCode();
    const result = asm.assemble(source);
    if (result.errors.length > 0) {
        ui.setStatus(result.errors[0], 'error');
        return;
    }
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

document.getElementById('btn-step').addEventListener('click', () => { stopRun(); cpu.step(); ui.updateUI(); });
document.getElementById('btn-inst').addEventListener('click', () => { stopRun(); cpu.stepInstruction(); ui.updateUI(); });
document.getElementById('btn-run').addEventListener('click', () => startRun());
document.getElementById('btn-pause').addEventListener('click', () => stopRun());
document.getElementById('btn-reset').addEventListener('click', () => {
    stopRun(); cpu.reset();
    const startPc = parseInt(document.getElementById('start-pc-input').value, 8) || 0;
    cpu.pc = startPc; ui.updateUI();
    ui.setStatus('Simulador reiniciado');
});

document.getElementById('speed-select').addEventListener('change', (e) => {
    speed = parseInt(e.target.value);
    if (intervalId) { stopRun(); startRun(); }
});

document.getElementById('example-select').addEventListener('change', async (e) => {
    const url = e.target.value;
    if (!url) return;
    try {
        const response = await fetch(url);
        if (response.ok) {
            const code = await response.text();
            setCode(code);
            fileNameDisplay.textContent = url.split('/').pop();
            ui.setStatus(`Ejemplo cargado`);
        }
    } catch (err) { ui.setStatus('Error al cargar ejemplo', 'error'); }
});

document.getElementById('docs-select').addEventListener('change', (e) => {
    const url = e.target.value;
    if (url) { window.open(url, '_blank'); e.target.value = ""; }
});

document.getElementById('btn-video-mode').addEventListener('click', (e) => {
    const is40 = ui.videoCols === 40;
    const newCols = is40 ? 80 : 40;
    ui.setVideoMode(newCols);
    e.target.textContent = `Cambiar Modo (${is40 ? '80x25' : '40x25'})`;
});

document.getElementById('btn-save-local').addEventListener('click', () => {
    const blob = new Blob([getCode()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileNameDisplay.textContent || "programa.sic";
    a.click(); URL.revokeObjectURL(url);
});

document.getElementById('btn-load-local').addEventListener('click', () => {
    const sel = document.getElementById('file-selector');
    sel.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            setCode(ev.target.result);
            fileNameDisplay.textContent = file.name;
        };
        reader.readAsText(file);
    };
    sel.click();
});

function startRun() {
    if (intervalId) return;
    document.getElementById('btn-run').disabled = true;
    document.getElementById('btn-pause').disabled = false;
    ui.setStatus('Ejecutando...', 'info');
    const runLoop = () => {
        const cycles = speed === 0 ? 500 : 1;
        for (let i = 0; i < cycles; i++) {
            const next = cpu.step();
            if (next === 28) { stopRun(); ui.setStatus('HLT alcanzado'); break; }
        }
        ui.updateUI();
        if (intervalId) intervalId = speed === 0 ? requestAnimationFrame(runLoop) : setTimeout(runLoop, 1000/speed);
    };
    intervalId = speed === 0 ? requestAnimationFrame(runLoop) : setTimeout(runLoop, 1000/speed);
}

function stopRun() {
    if (speed === 0) cancelAnimationFrame(intervalId); else clearTimeout(intervalId);
    intervalId = null;
    document.getElementById('btn-run').disabled = false;
    document.getElementById('btn-pause').disabled = true;
}

window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('ace_text-input')) return;
    if (e.key === 'F5') { e.preventDefault(); startRun(); }
    else if (e.key === 'F10') { e.preventDefault(); cpu.step(); ui.updateUI(); }
    else if (e.key === 'F11') { e.preventDefault(); cpu.stepInstruction(); ui.updateUI(); }
    else if (e.key === 'F2') {
        cpu.reset(); cpu.pc = parseInt(document.getElementById('start-pc-input').value, 8) || 0;
        ui.updateUI();
    }
});

ui.updateUI();
ui.setStatus('Bienvenido a EMU-SIC Web');
