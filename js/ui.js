export class SICUI {
    constructor(processor, assembler) {
        this.cpu = processor;
        this.asm = assembler;
        
        // Elementos de la UI
        this.elems = {
            pc: document.getElementById('reg-pc'),
            ac: document.getElementById('reg-ac'),
            ir: document.getElementById('reg-ir'),
            lf: document.getElementById('reg-lf'),
            ma: document.getElementById('reg-ma'),
            md: document.getElementById('reg-md'),
            ia: document.getElementById('reg-ia'),
            ib: document.getElementById('reg-ib'),
            fsmAct: document.getElementById('fsm-act'),
            fsmSig: document.getElementById('fsm-sig'),
            video: document.getElementById('video-canvas'),
            listing: document.querySelector('#listing-table tbody'),
            memory: document.querySelector('#memory-table tbody'),
            memStart: document.getElementById('mem-start-addr'),
            status: document.getElementById('status-msg')
        };

        this.colors = [
            '#000000', '#0000AA', '#00AA00', '#00AAAA',
            '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA'
        ];
        this.brightColors = [
            '#555555', '#5555FF', '#55FF55', '#55FFFF',
            '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF'
        ];

        this.blinkState = true;
        setInterval(() => {
            this.blinkState = !this.blinkState;
            this.renderVideo();
        }, 500);

        this.initTabs();
        this.videoCols = 40;
        this.initVideoGrid();
        
        this.memStartAddr = 0;
        this.initMemoryEvents();

        // Seguimiento de valores anteriores para Highlight
        this.prevRegs = {
            pc: -1, ac: -1, ir: -1, lf: -1,
            ma: -1, md: -1, ia: -1, ib: -1
        };
        this.prevMem = new Uint32Array(8192);
    }

    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.dataset.tab;
                document.getElementById('tab-editor').classList.toggle('hidden', target !== 'editor');
                document.getElementById('tab-about').classList.toggle('hidden', target !== 'about');
            });
        });
    }

    initMemoryEvents() {
        this.elems.memStart.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 8);
            if (!isNaN(val) && val >= 0 && val < 8192) {
                this.memStartAddr = val;
                this.renderMemory();
            }
        });
    }

    initVideoGrid() {
        const container = document.querySelector('.video-container');
        container.innerHTML = '';
        this.videoGrid = document.createElement('div');
        this.videoGrid.className = 'video-grid-dom';
        if (this.videoCols === 80) this.videoGrid.classList.add('mode-80');
        
        this.videoGrid.style.display = 'grid';
        this.videoGrid.style.gridTemplateColumns = `repeat(${this.videoCols}, 1fr)`;
        this.videoGrid.style.width = '100%';
        this.videoGrid.style.aspectRatio = `${this.videoCols}/25`;
        this.videoGrid.style.backgroundColor = 'black';
        this.videoGrid.style.fontFamily = 'monospace';
        this.videoGrid.style.fontSize = this.videoCols === 80 ? '8px' : '12px';
        this.videoGrid.style.lineHeight = '1';

        this.cells = [];
        const numCells = this.videoCols * 25;
        for (let i = 0; i < numCells; i++) {
            const cell = document.createElement('span');
            cell.textContent = ' ';
            cell.style.display = 'flex';
            cell.style.justifyContent = 'center';
            cell.style.alignItems = 'center';
            cell.style.height = '100%';
            this.videoGrid.appendChild(cell);
            this.cells.push(cell);
        }
        container.appendChild(this.videoGrid);
    }

    setVideoMode(cols) {
        this.videoCols = cols;
        this.initVideoGrid();
        this.renderVideo();
    }

    toOct(val, digits = 6) {
        return val.toString(8).padStart(digits, '0');
    }

    updateUI() {
        const regs = {
            pc: this.cpu.pc,
            ac: this.cpu.ac,
            ir: this.cpu.ir,
            lf: this.cpu.lf,
            ma: this.cpu.ma,
            md: this.cpu.md,
            ia: this.cpu.ia,
            ib: this.cpu.ib
        };

        for (const [key, val] of Object.entries(regs)) {
            const el = this.elems[key];
            const isChanged = val !== this.prevRegs[key];

            if (key === 'lf') {
                el.value = val;
            } else {
                el.value = this.toOct(val, (key === 'ac' || key === 'ir' || key === 'md') ? 6 : 5);
            }

            if (isChanged) {
                el.classList.add('changed');
            } else {
                el.classList.remove('changed');
            }

            this.prevRegs[key] = val;
        }

        this.elems.fsmAct.textContent = this.cpu.est_act;
        this.elems.fsmSig.textContent = this.cpu.est_sig;

        this.renderVideo();
        this.highlightListing();
        this.renderMemory();
    }

    renderMemory() {
        const start = this.memStartAddr;
        const end = Math.min(start + 64, 8192); // Reducido a 64 para mejor rendimiento en split view
        this.elems.memory.innerHTML = '';
        
        for (let i = start; i < end; i++) {
            const val = this.cpu.mem[i];
            const isChanged = val !== this.prevMem[i];
            const tr = document.createElement('tr');
            if (isChanged) tr.classList.add('mem-changed');
            
            const char = (val & 0xFF);
            const ascii = (char >= 32 && char <= 126) ? String.fromCharCode(char) : '.';
            
            tr.innerHTML = `
                <td>${this.toOct(i, 5)}</td>
                <td>${this.toOct(val, 6)}</td>
                <td>${val.toString(16).toUpperCase().padStart(5, '0')}</td>
                <td>${ascii}</td>
            `;
            this.elems.memory.appendChild(tr);
            this.prevMem[i] = val;
        }
    }

    renderVideo() {
        const numCells = this.videoCols * 25;
        for (let i = 0; i < numCells; i++) {
            const addr = 4096 + i;
            if (addr >= 8192) break;
            const w = this.cpu.mem[addr];
            const charCode = w & 0xFF;
            const attr = (w >> 8) & 0xFF;

            const fg = attr & 0x07;
            const br = (attr >> 3) & 0x01;
            const bg = (attr >> 4) & 0x07;
            const bl = (attr >> 7) & 0x01;

            const cell = this.cells[i];
            if (!cell) continue;
            
            cell.textContent = (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : ' ';
            cell.style.color = br ? this.brightColors[fg] : this.colors[fg];
            cell.style.backgroundColor = this.colors[bg];
            
            if (bl && !this.blinkState) {
                cell.style.visibility = 'hidden';
            } else {
                cell.style.visibility = 'visible';
            }
        }
    }

    renderListing(listing) {
        this.elems.listing.innerHTML = '';
        this.listingRows = {};
        listing.forEach(item => {
            const tr = document.createElement('tr');
            tr.dataset.pc = item.pc;
            tr.innerHTML = `
                <td>${this.toOct(item.pc, 5)}</td>
                <td>${this.toOct(item.word, 6)}</td>
                <td title="${item.line.replace(/"/g, '&quot;')}">${item.line}</td>
            `;
            this.elems.listing.appendChild(tr);
            this.listingRows[item.pc] = tr;
        });
    }

    highlightListing() {
        Object.values(this.listingRows || {}).forEach(row => row.classList.remove('pc-highlight'));
        if (this.listingRows && this.listingRows[this.cpu.pc]) {
            const activeRow = this.listingRows[this.cpu.pc];
            activeRow.classList.add('pc-highlight');
            activeRow.scrollIntoView({ block: 'nearest' });
        }
    }

    setStatus(msg, type = 'info') {
        this.elems.status.textContent = msg;
        this.elems.status.style.color = type === 'error' ? 'var(--error)' : 'white';
    }
}
