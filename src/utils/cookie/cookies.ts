type BlockArray = number[];

export class CTokenGenerator {
    /** 常量 */
    private readonly paddingBits = [-2147483648, 8388608, 32768, 128];
    private readonly shifts = [24, 16, 8, 0];

    /** SHA1 state */
    private blocks!: BlockArray;
    private h0!: number;
    private h1!: number;
    private h2!: number;
    private h3!: number;
    private h4!: number;

    private block = 0;
    private start = 0;
    private bytes = 0;
    private hBytes = 0;

    private finalized = false;
    private hashed = false;
    private first = true;
    private lastByteIndex = 0;

    constructor() {
        this.reset();
    }

    /** 重置内部状态 */
    private reset(): void {
        this.blocks = new Array(17).fill(0);
        this.h0 = 0x67452301;
        this.h1 = 0xefcdab89;
        this.h2 = 0x98badcfe;
        this.h3 = 0x10325476;
        this.h4 = 0xc3d2e1f0;

        this.block = 0;
        this.start = 0;
        this.bytes = 0;
        this.hBytes = 0;

        this.finalized = false;
        this.hashed = false;
        this.first = true;
        this.lastByteIndex = 0;
    }

    /** 写入字符串数据 */
    update(input: string): this {
        if (this.finalized) return this;

        const blocks = this.blocks;
        let index = 0;
        const length = input.length;

        while (index < length) {
            if (this.hashed) {
                this.hashed = false;
                blocks[0] = this.block;
                blocks.fill(0, 1, 17);
            }

            let i = this.start;
            for (; index < length && i < 64; index++) {
                const code = input.charCodeAt(index);
                if (code < 0x80) {
                    blocks[i >> 2] |= code << this.shifts[i & 3];
                    i++;
                } else if (code < 0x800) {
                    blocks[i >> 2] |= (0xc0 | (code >> 6)) << this.shifts[i & 3];
                    i++;
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << this.shifts[i & 3];
                    i++;
                } else {
                    blocks[i >> 2] |= (0xe0 | (code >> 12)) << this.shifts[i & 3];
                    i++;
                    blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << this.shifts[i & 3];
                    i++;
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << this.shifts[i & 3];
                    i++;
                }
            }

            this.lastByteIndex = i;
            this.bytes += i - this.start;

            if (i >= 64) {
                this.block = blocks[16];
                this.start = i - 64;
                this.hashBlock();
                this.hashed = true;
            } else {
                this.start = i;
            }
        }

        if (this.bytes > 0xffffffff) {
            this.hBytes += (this.bytes / 0x100000000) << 0;
            this.bytes %= 0x100000000;
        }

        return this;
    }

    /** 核心 SHA1 轮函数 */
    private hashBlock(): void {
        const blocks = this.blocks;
        let a = this.h0;
        let b = this.h1;
        let c = this.h2;
        let d = this.h3;
        let e = this.h4;

        for (let i = 16; i < 80; i++) {
            const x = blocks[i - 3] ^ blocks[i - 8] ^ blocks[i - 14] ^ blocks[i - 16];
            blocks[i] = (x << 1) | (x >>> 31);
        }

        for (let i = 0; i < 80; i++) {
            let f: number;
            let k: number;

            if (i < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            } else if (i < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            } else if (i < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            } else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }

            const temp = ((a << 5) | (a >>> 27)) + f + e + k + blocks[i];
            e = d;
            d = c;
            c = (b << 30) | (b >>> 2);
            b = a;
            a = temp | 0;
        }

        this.h0 = (this.h0 + a) | 0;
        this.h1 = (this.h1 + b) | 0;
        this.h2 = (this.h2 + c) | 0;
        this.h3 = (this.h3 + d) | 0;
        this.h4 = (this.h4 + e) | 0;
    }

    /** 完成填充 */
    private finalize(): void {
        if (this.finalized) return;
        this.finalized = true;

        const blocks = this.blocks;
        const i = this.lastByteIndex;

        blocks[i >> 2] |= this.paddingBits[i & 3];

        if (i >= 56) {
            this.hashBlock();
            blocks.fill(0);
        }

        blocks[14] = (this.hBytes << 3) | (this.bytes >>> 29);
        blocks[15] = this.bytes << 3;
        this.hashBlock();
    }

    /** 输出 20 字节摘要 */
    digest(): number[] {
        this.finalize();
        return [
            this.h0 >>> 24, this.h0 >>> 16 & 255, this.h0 >>> 8 & 255, this.h0 & 255,
            this.h1 >>> 24, this.h1 >>> 16 & 255, this.h1 >>> 8 & 255, this.h1 & 255,
            this.h2 >>> 24, this.h2 >>> 16 & 255, this.h2 >>> 8 & 255, this.h2 & 255,
            this.h3 >>> 24, this.h3 >>> 16 & 255, this.h3 >>> 8 & 255, this.h3 & 255,
            this.h4 >>> 24, this.h4 >>> 16 & 255, this.h4 >>> 8 & 255, this.h4 & 255,
        ];
    }

    /** 业务方法：生成 Cookie */
    generateCookie(prefix: string): string {
        const index = parseInt(prefix[0], 16);
        let i = 0;
        while (true) {
            this.reset();
            this.update(prefix + i);
            const hash = this.digest();
            if (hash[index] === 0xb0 && hash[index + 1] === 0x0b) {
                return prefix + i;
            }
            i++;
        }
    }
}