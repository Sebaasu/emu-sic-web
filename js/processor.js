export class SICProcessor {
    constructor() {
        this.mem = new Uint32Array(8192);
        this.reset();
    }

    reset() {
        this.pc = 0;
        this.ac = 0;
        this.md = 0;
        this.ir = 0;
        this.ma = 0;
        this.ia = 0;
        this.ib = 0;
        this.lf = 0;

        this.est_act = 1;
        this.est_sig = 1;
        this.inicio = true;
        this.running = false;
        
        this.calculateNextState();
    }

    getBit(val, bitIndexFromLeft, totalBits = 18) {
        return (val >> (totalBits - 1 - bitIndexFromLeft)) & 1;
    }

    getBits(val, startFromLeft, endFromLeft, totalBits = 18) {
        const length = endFromLeft - startFromLeft + 1;
        const shift = totalBits - 1 - endFromLeft;
        return (val >> shift) & ((1 << length) - 1);
    }

    calculateNextState() {
        const state = this.est_act;
        const ir = this.ir;
        
        const ir_0_2 = this.getBits(ir, 0, 2);
        const ir_3_4 = this.getBits(ir, 3, 4);
        const ir_0_1 = this.getBits(ir, 0, 1);
        const ir_1_2 = this.getBits(ir, 1, 2);
        const ir_6_7 = this.getBits(ir, 6, 7);
        const ir_11_12 = this.getBits(ir, 11, 12);
        
        const ir_0 = this.getBit(ir, 0);
        const ir_2 = this.getBit(ir, 2);
        const ir_3 = this.getBit(ir, 3);
        const ir_4 = this.getBit(ir, 4);
        const ir_5 = this.getBit(ir, 5);
        const ir_10 = this.getBit(ir, 10);
        const ir_13 = this.getBit(ir, 13);
        const ir_14 = this.getBit(ir, 14);
        const ir_15 = this.getBit(ir, 15);
        const ir_16 = this.getBit(ir, 16);
        const ir_17 = this.getBit(ir, 17);
        
        const ac_0 = this.getBit(this.ac, 0);
        const ac_is_zero = (this.ac === 0);
        const f = (ir_15 && ac_is_zero) || 
                  (ir_16 && !ac_0 && !ac_is_zero) || 
                  (ir_17 && ac_0);

        let next = 0;
        
        if (state === 1) next = this.inicio ? 2 : 1;
        else if (state === 2) next = 3;
        else if (state === 3) next = 4;
        else if (state === 4) next = 5;
        else if (state === 5) next = (ir_0_2 === 7) ? 25 : 6;
        else if (state === 6) {
            if (ir_3_4 === 0) next = 13;
            else if (ir_3_4 === 1) next = 7;
            else next = 10;
        }
        else if (state === 7) next = 8;
        else if (state === 8) next = 9;
        else if (state === 9 || state === 11 || state === 12) next = 13;
        else if (state === 10) next = ir_4 ? 12 : 11;
        else if (state === 13) next = (ir_0_1 !== 3) ? 15 : 14;
        else if (state === 14) next = 2;
        else if (state === 15) next = ir_0 ? 21 : 16;
        else if (state === 16) next = (ir_1_2 === 0) ? 18 : 17;
        else if (state === 17) next = 24;
        else if (state === 18) next = 19;
        else if (state === 19) next = (this.md !== 0) ? 24 : 20;
        else if (state === 20) next = 24;
        else if (state === 21) next = 22;
        else if (state === 22) next = ir_2 ? 24 : 23;
        else if (state === 23) next = 24;
        else if (state === 24) next = 2;
        else if (state === 25) next = ir_3 ? 50 : 26;
        else if (state === 26) next = ir_5 ? 30 : 27;
        else if (state === 27) next = (ir_6_7 === 3) ? 1 : 29;
        else if (state === 29) next = 33;
        else if (state === 30) next = ir_4 ? 32 : 31;
        else if (state === 31 || state === 32) next = 33;
        else if (state === 33) next = ir_10 ? 40 : 34;
        else if (state === 34) {
            if (ir_11_12 === 0) next = 35;
            else if (ir_11_12 === 1) next = 37;
            else if (ir_11_12 === 2) next = 38;
            else if (ir_11_12 === 3) next = 39;
        }
        else if (state === 35) next = !(ir_13 && !this.lf) ? 43 : 36;
        else if (state === 37 || state === 38 || state === 39 || state === 41 || state === 42) next = 43;
        else if (state === 40) next = ir_4 ? 42 : 41;
        else if (state === 43) next = ir_14 ? 45 : 44;
        else if (state === 44) next = f ? 36 : 24;
        else if (state === 45) next = ir_4 ? 47 : 46;
        else if (state === 46 || state === 47 || state === 36) next = 24;
        else if (state === 50) next = 28; // HLT state mapping
        else if (state === 28) next = 28;

        this.est_sig = next;
    }

    executeState(state) {
        if (state === 2) this.ma = this.pc;
        else if (state === 3) this.md = this.mem[this.ma];
        else if (state === 4) this.ir = this.md;
        else if (state === 7) this.ma = this.getBits(this.ir, 5, 17);
        else if (state === 8) this.md = this.mem[this.ma];
        else if (state === 9) {
            const val = this.getBits(this.md, 5, 17);
            this.ir = ((this.ir & 0x3E000) | val) >>> 0;
        }
        else if (state === 11) {
            const val = (this.getBits(this.ir, 5, 17) + this.ia) & 0x1FFF;
            this.ir = ((this.ir & 0x3E000) | val) >>> 0;
        }
        else if (state === 12) {
            const val = (this.getBits(this.ir, 5, 17) + this.ib) & 0x1FFF;
            this.ir = ((this.ir & 0x3E000) | val) >>> 0;
        }
        else if (state === 14) this.pc = this.getBits(this.ir, 5, 17);
        else if (state === 15) this.ma = this.getBits(this.ir, 5, 17);
        else if (state === 16) this.md = this.mem[this.ma];
        else if (state === 17) {
            const ir_1_2 = this.getBits(this.ir, 1, 2);
            if (ir_1_2 === 0 || ir_1_2 === 1) this.ac = this.md;
            else if (ir_1_2 === 2) this.ac = (this.md & this.ac) >>> 0;
            else if (ir_1_2 === 3) {
                const res = this.md + this.ac;
                this.ac = (res & 0x3FFFF) >>> 0;
                this.lf = (res >> 18) & 1;
            }
        }
        else if (state === 18) this.md = (this.md + 1) & 0x3FFFF;
        else if (state === 20) this.pc = (this.pc + 1) & 0x1FFF;
        else if (state === 21) {
            const ir_2 = this.getBit(this.ir, 2);
            this.md = ir_2 ? this.ac : ((this.pc + 1) & 0x1FFF);
        }
        else if (state === 23) this.pc = this.getBits(this.ir, 5, 17);
        else if (state === 24) this.pc = (this.pc + 1) & 0x1FFF;
        else if (state === 29) {
            const ir_8_9 = this.getBits(this.ir, 8, 9);
            if (ir_8_9 === 1) this.ac = 0x3FFFF;
            else if (ir_8_9 === 2) this.ac = 0;
            else if (ir_8_9 === 3) this.ac = (~this.ac) & 0x3FFFF;
            
            const ir_6_7 = this.getBits(this.ir, 6, 7);
            if (ir_6_7 === 1) this.lf = 1;
            else if (ir_6_7 === 2) this.lf = 0;
        }
        else if (state === 31) {
            const val = (this.ac << 1) | this.lf;
            this.lf = (val >> 18) & 1;
            this.ac = (val & 0x3FFFF) >>> 0;
        }
        else if (state === 32) {
            const val = (this.lf << 18) | this.ac;
            this.lf = val & 1;
            this.ac = ((val >> 1) & 0x3FFFF) >>> 0;
        }
        else if (state === 36) this.pc = (this.pc + 1) & 0x1FFF;
        else if (state === 37) this.ac = this.getBit(this.ir, 13) ? this.ib : this.ia;
        else if (state === 38) {
            if (this.getBit(this.ir, 13)) this.ia = (this.ia + 1) & 0x1FFF;
            else this.ia = this.getBits(this.ac, 5, 17);
        }
        else if (state === 39) {
            if (this.getBit(this.ir, 13)) this.ib = (this.ib + 1) & 0x1FFF;
            else this.ib = this.getBits(this.ac, 5, 17);
        }
        else if (state === 41 || state === 46) {
            const val = (this.ac << 1) | this.lf;
            this.lf = (val >> 18) & 1;
            this.ac = (val & 0x3FFFF) >>> 0;
        }
        else if (state === 42 || state === 47) {
            const val = (this.lf << 18) | this.ac;
            this.lf = val & 1;
            this.ac = ((val >> 1) & 0x3FFFF) >>> 0;
        }
            
        if (state === 19 || state === 22) {
            this.mem[this.ma] = this.md;
        }
    }

    step() {
        this.executeState(this.est_act);
        this.est_act = this.est_sig;
        this.calculateNextState();
        return this.est_act;
    }

    stepInstruction() {
        // Ejecutar al menos un ciclo
        this.step();
        // Continuar hasta volver al estado de Fetch (2) o Halt (28)
        let count = 0;
        while (this.est_act !== 2 && this.est_act !== 28 && count < 100) {
            this.step();
            count++;
        }
        return this.est_act;
    }

    loadProgram(instructions, startAddr = 0) {
        for (let i = 0; i < instructions.length; i++) {
            if (startAddr + i < 8192) {
                this.mem[startAddr + i] = instructions[i];
            }
        }
    }
}
