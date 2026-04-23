export class SICAssembler {
    constructor() {
        this.DEPTH = 8192;
        this.WIDTH = 18;
        this.OPCODES_MRI = {
            "ISZ": 0b000, "LAC": 0b001, "AND": 0b010, "TAD": 0b011,
            "JMS": 0b100, "DAC": 0b101, "JMP": 0b110
        };
        this.MODES = { "I": 0b01, "IA": 0b10, "IB": 0b11 };
        this.OPCODES_IOP = {
            "NOP": 0o700000, "HLT": 0o706000, "CLA": 0o701000, "CMA": 0o701400,
            "STA": 0o700400, "CLL": 0o704000, "STL": 0o702000, "RAL": 0o710000,
            "RAR": 0o730000, "RAL2": 0o710200, "RAR2": 0o730200, "RAL3": 0o710210,
            "RAR3": 0o730210, "SKZ": 0o700004, "SKP": 0o700002, "SKN": 0o700001,
            "SZL": 0o700020, "DTA": 0o700100, "DTB": 0o700140, "DFA": 0o700040,
            "DFB": 0o700060, "INA": 0o700120, "INB": 0o700160,
            "IN": 0o760000, "OUT": 0o740000
        };
        this.reset();
    }

    reset() {
        this.symbols = {};
        this.instructions = new Uint32Array(this.DEPTH);
        this.listingData = [];
        this.pc = 0;
        this.maxAddr = 0;
        this.errors = [];
        this.firstOrg = null;
    }

    cleanLine(line) {
        return line.split(';')[0].trim();
    }

    parseValue(valStr) {
        if (this.symbols.hasOwnProperty(valStr)) {
            return this.symbols[valStr];
        }
        try {
            const lower = valStr.toLowerCase();
            if (lower.startsWith('0x')) return parseInt(lower.substring(2), 16);
            if (lower.startsWith('0o')) return parseInt(lower.substring(2), 8);
            if (lower.startsWith('0b')) return parseInt(lower.substring(2), 2);
            if (lower.startsWith('0d')) return parseInt(lower.substring(2), 10);
            const val = parseInt(valStr, 10);
            return isNaN(val) ? null : val;
        } catch (e) {
            return null;
        }
    }

    assemble(source) {
        this.reset();
        const lines = source.split('\n');
        this.firstPass(lines);
        this.secondPass(lines);
        return {
            instructions: this.instructions,
            listing: this.listingData,
            errors: this.errors,
            symbols: this.symbols,
            firstOrg: this.firstOrg
        };
    }

    firstPass(lines) {
        let currentPc = 0;
        for (let rawLine of lines) {
            let line = this.cleanLine(rawLine);
            if (!line) continue;

            let parts = line.split(/\s+/);
            if (parts[0].endsWith(':')) {
                const label = parts[0].slice(0, -1);
                this.symbols[label] = currentPc;
                parts.shift();
                if (parts.length === 0) continue;
            }

            const mnemonic = parts[0].toUpperCase();
            if (mnemonic === "ORG") {
                const val = this.parseValue(parts[1]);
                currentPc = (val !== null) ? val : 0;
                if (this.firstOrg === null) this.firstOrg = currentPc;
            } else if (mnemonic === "SYM") {
                if (parts.length > 2) {
                    this.symbols[parts[1]] = this.parseValue(parts[2]);
                }
            } else if (mnemonic === "DATA") {
                const dataStr = parts.slice(1).join("");
                const values = dataStr.split(',');
                currentPc += values.length;
            } else {
                currentPc += 1;
            }
        }
    }

    secondPass(lines) {
        this.pc = 0;
        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            let line = this.cleanLine(rawLine);
            if (!line) continue;

            let parts = line.split(/\s+/);
            if (parts[0].endsWith(':')) parts.shift();
            if (parts.length === 0) continue;

            const mnemonic = parts[0].toUpperCase();

            if (mnemonic === "ORG") {
                this.pc = this.parseValue(parts[1]) || 0;
                continue;
            }
            if (mnemonic === "SYM") continue;

            if (mnemonic === "DATA") {
                const dataStr = parts.slice(1).join("");
                const values = dataStr.split(',');
                for (let v of values) {
                    const val = this.parseValue(v);
                    if (val !== null) {
                        const word = (val & 0x3FFFF) >>> 0;
                        this.instructions[this.pc] = word;
                        this.listingData.push({ pc: this.pc, word, line: rawLine.trim() });
                    }
                    this.pc++;
                }
                continue;
            }

            if (this.OPCODES_MRI.hasOwnProperty(mnemonic)) {
                const opcode = this.OPCODES_MRI[mnemonic];
                let mode = 0;
                let addrVal = 0;
                let args = parts.slice(1);

                if (args.length > 0 && this.MODES.hasOwnProperty(args[0].toUpperCase())) {
                    mode = this.MODES[args[0].toUpperCase()];
                    args.shift();
                }

                if (args.length > 0) {
                    const val = this.parseValue(args[0]);
                    if (val === null) {
                        this.errors.push(`Error L${i + 1}: Símbolo '${args[0]}' no definido.`);
                    } else {
                        addrVal = val;
                    }
                }

                const word = ((opcode << 15) | (mode << 13) | (addrVal & 0x1FFF)) >>> 0;
                this.instructions[this.pc] = word;
                this.listingData.push({ pc: this.pc, word, line: rawLine.trim() });
                this.pc++;
            } else {
                let word = 0o700000;
                let isValid = false;
                for (let p of parts) {
                    const pUp = p.toUpperCase();
                    if (this.OPCODES_IOP.hasOwnProperty(pUp)) {
                        word |= this.OPCODES_IOP[pUp];
                        isValid = true;
                    }
                }

                if (!isValid) {
                    const rawVal = this.parseValue(mnemonic);
                    if (rawVal !== null) {
                        word = rawVal;
                        isValid = true;
                    } else {
                        this.errors.push(`Error L${i + 1}: Instrucción desconocida '${mnemonic}'`);
                        continue;
                    }
                }

                this.instructions[this.pc] = (word & 0x3FFFF) >>> 0;
                this.listingData.push({ pc: this.pc, word, line: rawLine.trim() });
                this.pc++;
            }
            if (this.pc > this.maxAddr) this.maxAddr = this.pc;
        }
    }
}
