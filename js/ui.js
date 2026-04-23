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
            status: document.getElementById('status-msg'),
            editor: document.getElementById('code-editor')
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
        this.initVideoGrid();
    }

    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.dataset.tab;
                document.getElementById('tab-editor').classList.toggle('hidden', target !== 'editor');
                document.getElementById('tab-listing').classList.toggle('hidden', target !== 'listing');
            });
        });
    }

    initVideoGrid() {
        // En lugar de canvas, usaremos una rejilla de texto para mayor fidelidad de fuentes
        const container = document.querySelector('.video-container');
        container.innerHTML = '';
        this.videoGrid = document.createElement('div');
        this.videoGrid.className = 'video-grid-dom';
        this.videoGrid.style.display = 'grid';
        this.videoGrid.style.gridTemplateColumns = 'repeat(40, 1fr)';
        this.videoGrid.style.width = '100%';
        this.videoGrid.style.aspectRatio = '40/25';
        this.videoGrid.style.backgroundColor = 'black';
        this.videoGrid.style.fontFamily = 'monospace';
        this.videoGrid.style.fontSize = '12px';
        this.videoGrid.style.lineHeight = '1';

        this.cells = [];
        for (let i = 0; i < 1000; i++) {
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

    toOct(val, digits = 6) {
        return val.toString(8).padStart(digits, '0');
    }

    updateUI() {
        this.elems.pc.value = this.toOct(this.cpu.pc, 5);
        this.elems.ac.value = this.toOct(this.cpu.ac, 6);
        this.elems.ir.value = this.toOct(this.cpu.ir, 6);
        this.elems.lf.value = this.cpu.lf;
        this.elems.ma.value = this.toOct(this.cpu.ma, 5);
        this.elems.md.value = this.toOct(this.cpu.md, 6);
        this.elems.ia.value = this.toOct(this.cpu.ia, 5);
        this.elems.ib.value = this.toOct(this.cpu.ib, 5);
        
        this.elems.fsmAct.textContent = this.cpu.est_act;
        this.elems.fsmSig.textContent = this.cpu.est_sig;

        this.renderVideo();
        this.highlightListing();
    }

    renderVideo() {
        for (let i = 0; i < 1000; i++) {
            const addr = 4096 + i;
            const w = this.cpu.mem[addr];
            const charCode = w & 0xFF;
            const attr = (w >> 8) & 0xFF;

            const fg = attr & 0x07;
            const br = (attr >> 3) & 0x01;
            const bg = (attr >> 4) & 0x07;
            const bl = (attr >> 7) & 0x01;

            const cell = this.cells[i];
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
                <td>${item.line}</td>
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
            // Opcional: scroll suave hasta la fila activa
            // activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    setStatus(msg, type = 'info') {
        this.elems.status.textContent = msg;
        this.elems.status.style.color = type === 'error' ? 'var(--error)' : 'white';
    }
}
