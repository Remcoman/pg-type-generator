
export function createFormatter() {
    const lines = []
    let identation = 0
    let lineIndex = 0

    const identStr = () => ' '.repeat(identation * 4)

    return {
        write(text) {
            if (lines[lineIndex] === undefined) {
                lines[lineIndex] = identStr()
            }
            lines[lineIndex] += text
            return this
        },
        writeLine(line) {
            let i = lineIndex
            if (lines[lineIndex] !== undefined) {
                i = ++lineIndex
            }
            lines[i] = identStr() + line
            return this
        },
        break() {
            if (lines[lineIndex] !== undefined) {
                lineIndex++
            }
            return this
        },
        join(items, fn, sep) {
            let index = 0
            for (let item of items) {
                if (index > 0) {
                    this.write(sep)
                }
                fn(item, index)
                index++
            }
            return this
        },
        joinLines(items, fn) {
            items.forEach((item, index) => {
                if (index > 0) {
                    this.break()
                }
                fn(item, index)
            })
            return this
        },
        startIndent() {
            identation++
            return this
        },
        endIndent() {
            identation--
            return this
        },
        toString() {
            return lines.join('\n')
        }
    }
}