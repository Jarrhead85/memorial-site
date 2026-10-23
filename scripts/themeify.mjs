import fs from 'node:fs'

const file = process.argv[2]
let s = fs.readFileSync(file, 'utf8')
const before = (s.match(/var\(--color/g) || []).length
s = s.split('background: #16161f;').join('background: var(--color-memorial-card);')
s = s.split('background: #0a0a0f;').join('background: var(--color-memorial-dark);')
s = s.split('color: #e8e6e3;').join('color: var(--color-memorial-text);')
s = s.split('color: #c9a84c;').join('color: var(--color-memorial-gold);')
s = s.split('background: #c9a84c;').join('background: var(--color-memorial-gold);')
s = s.split('border-color: #c9a84c;').join('border-color: var(--color-memorial-gold);')
s = s.split('color: #0a0a0f;').join('color: #14100a;')
s = s.split('border: 1px solid #2a2a3a;').join('border: 1px solid var(--color-memorial-border);')
s = s.split('border-color: #2a2a3a;').join('border-color: var(--color-memorial-border);')
s = s.split('color: #8a8a9a;').join('color: var(--color-memorial-muted);')
fs.writeFileSync(file, s, 'utf8')
const after = (s.match(/var\(--color/g) || []).length
console.log(`${file}: vars ${before} -> ${after}`)
