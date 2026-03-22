# polygen.js — Direct Porting

> **Status: pre-release alpha** — work in progress, API may change.

A direct, faithful translation of [Polygen](https://github.com/alvisespano/Polygen) (Alvise Spano', 2002) from OCaml to vanilla JavaScript.

Single file, no dependencies, browser-compatible.

## What is Polygen?

Polygen is a random text generator based on a formal grammar notation. You define a grammar and Polygen produces random sentences that conform to it. The original implementation is written in OCaml.

## This port vs. clean-room approaches

This is a **direct porting**: the internal structure mirrors the original OCaml pipeline module by module (lexer → parser → preprocessor → generator). No redesign, no added abstractions — just a faithful translation of the original logic into idiomatic JavaScript.

## Usage

```html
<script src="polygen.js"></script>
<script>
  const output = Polygen.generate(`S ::= "hello" "world" ;`, { start: "S" });
  console.log(output);
</script>
```

```js
// Node.js
const Polygen = require('./polygen.js');
const output = Polygen.generate(`S ::= "hello" "world" ;`, { start: "S" });
```

### API

```js
// Compile once, generate many times (efficient)
const grammar = Polygen.compile(grammarString);
const output  = Polygen.generate(null, { grammar, start: "S" });

// All-in-one
const output = Polygen.generate(src, {
  start:  "S",           // start symbol (default: "S")
  labels: ["sg", "m"],   // active labels (default: [])
  seed:   42             // PRNG seed (deterministic if set)
});

// Async with import resolution
const grammar = await Polygen.compileAsync(src, {
  loader: async (name) => fetch(`/grammars/${name}.grm`).then(r => r.text())
});

// Static analysis
const { errors, warnings } = Polygen.check(src);
```

## Pipeline

```
PRNG (mulberry32)
  ↓
Lexer        (lexer.mll)
  ↓
Parser       (parser.mly)   → Absyn0
  ↓
Preprocessor (pre.ml)       → Absyn1
  ↓
Generator    (gen.ml)       → string
```

## Supported grammar features

- Terminals: `"quoted"`, bare `words`
- Non-terminals: `Capitalized`
- Alternatives: `A | B`, weighted with `+` / `-` / `++`
- Optional: `[...]`
- Labels: `label: seq`, selector `NT.label`, multi-selector `NT.(l1|l2)`
- Capitalize: `\`, Concat: `^`
- Mobile groups: `{A} {B}` (permutation)
- Unfold: `> NT`, deep unfold: `>> ... <<`
- Lock: `< NT`
- Assignment (memoized): `:=`
- Local declarations: `(Sym ::= ...; expr)`
- Repetition: `(sub)+`
- Import: `import Name as Sym` (via `compileAsync` loader)

## Running tests

```bash
node test.js
```

## Original project

- Author: Alvise Spano'
- Repository: https://github.com/alvisespano/Polygen
- License: see original project
