/*
 * polygen.js
 * Traduzione diretta da OCaml (Alvise Spano' 2002) a JavaScript browser-compatible.
 * Nessuna dipendenza esterna. Espone window.Polygen.
 *
 * API:
 *   Polygen.compile(source)              → grammarObject (riutilizzabile)
 *   Polygen.generate(source, opts)       → stringa generata
 *   Polygen.generate(null, opts)         → stringa (con opts.grammar = compilato)
 *   Polygen.seed(n)                      → imposta seed PRNG
 *
 *   opts: { start: "S", labels: ["lb1",...], seed: 42, grammar: compiled }
 */
(function (global) {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // PRNG
  // ══════════════════════════════════════════════════════════════

  // mulberry32 — default: leggero, veloce
  function makeMulberry32(seed) {
    var s = seed >>> 0;
    return function(n) {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return Math.floor(((t ^ (t >>> 14)) >>> 0) / 4294967296 * n);
    };
  }

  // OCaml Random — exact port of OCaml 4.x stdlib Random module.
  // Lagged Fibonacci F(55,24,+) with bit-mixing, MD5-based seeding.
  // Usare con opts.prng:'ocaml' per confronto deterministico col binario OCaml originale.

  // MD5 (RFC 1321) — necessario per il seeding di OCaml Random (Digest.string = MD5)
  var _md5K = [
    0xd76aa478,0xe8c7b756,0x242070db,0xc1bdceee,0xf57c0faf,0x4787c62a,0xa8304613,0xfd469501,
    0x698098d8,0x8b44f7af,0xffff5bb1,0x895cd7be,0x6b901122,0xfd987193,0xa679438e,0x49b40821,
    0xf61e2562,0xc040b340,0x265e5a51,0xe9b6c7aa,0xd62f105d,0x02441453,0xd8a1e681,0xe7d3fbc8,
    0x21e1cde6,0xc33707d6,0xf4d50d87,0x455a14ed,0xa9e3e905,0xfcefa3f8,0x676f02d9,0x8d2a4c8a,
    0xfffa3942,0x8771f681,0x6d9d6122,0xfde5380c,0xa4beea44,0x4bdecfa9,0xf6bb4b60,0xbebfbc70,
    0x289b7ec6,0xeaa127fa,0xd4ef3085,0x04881d05,0xd9d4d039,0xe6db99e5,0x1fa27cf8,0xc4ac5665,
    0xf4292244,0x432aff97,0xab9423a7,0xfc93a039,0x655b59c3,0x8f0ccc92,0xffeff47d,0x85845dd1,
    0x6fa87e4f,0xfe2ce6e0,0xa3014314,0x4e0811a1,0xf7537e82,0xbd3af235,0x2ad7d2bb,0xeb86d391
  ];
  var _md5S = [
    7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21
  ];
  function md5raw(str) {
    var n = str.length;
    var blocks = (((n + 8) >>> 6) + 1) << 4;
    var msg = [];
    for (var i = 0; i < blocks; i++) msg[i] = 0;
    for (var i = 0; i < n; i++)
      msg[i >> 2] |= (str.charCodeAt(i) & 0xFF) << ((i & 3) << 3);
    msg[n >> 2] |= 0x80 << ((n & 3) << 3);
    msg[blocks - 2] = n * 8;
    var a0 = 0x67452301, b0 = 0xEFCDAB89, c0 = 0x98BADCFE, d0 = 0x10325476;
    for (var off = 0; off < blocks; off += 16) {
      var a = a0, b = b0, c = c0, d = d0;
      for (var i = 0; i < 64; i++) {
        var f, g;
        if (i < 16)      { f = (b & c) | ((~b) & d); g = i; }
        else if (i < 32) { f = (d & b) | ((~d) & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d;             g = (3 * i + 5) % 16; }
        else             { f = c ^ (b | (~d));         g = (7 * i) % 16; }
        var tmp = d; d = c; c = b;
        var x = (a + f + _md5K[i] + msg[off + g]) | 0;
        b = (b + (((x << _md5S[i]) | (x >>> (32 - _md5S[i]))) >>> 0)) | 0;
        a = tmp;
      }
      a0 = (a0 + a) | 0; b0 = (b0 + b) | 0; c0 = (c0 + c) | 0; d0 = (d0 + d) | 0;
    }
    function w2s(w) {
      return String.fromCharCode(w & 0xFF, (w >>> 8) & 0xFF, (w >>> 16) & 0xFF, (w >>> 24) & 0xFF);
    }
    return w2s(a0) + w2s(b0) + w2s(c0) + w2s(d0);
  }

  function makeOcamlRandom(seed) {
    var st = new Array(55);
    var idx = 0;
    // full_init: inizializza con MD5 come OCaml stdlib Random.init
    for (var i = 0; i <= 54; i++) st[i] = i;
    var accu = "x";
    var seedStr = String(seed >>> 0);
    for (var i = 0; i <= 54 + 55; i++) {
      var j = i % 55;
      accu = md5raw(accu + seedStr);
      var extract = (accu.charCodeAt(0))
                  + (accu.charCodeAt(1) * 256)
                  + (accu.charCodeAt(2) * 65536)
                  + (accu.charCodeAt(3) * 16777216);
      st[j] = (st[j] ^ (extract | 0)) & 0x3FFFFFFF;
    }
    idx = 0;
    // bits: Lagged Fibonacci F(55,24,+) con bit-mixing sui 5 bit alti
    function bits() {
      idx = (idx + 1) % 55;
      var curval = st[idx];
      var newval = (st[(idx + 24) % 55] + (curval ^ ((curval >>> 25) & 0x1F))) | 0;
      var newval30 = newval & 0x3FFFFFFF;
      st[idx] = newval30;
      return newval30;
    }
    // intaux: rejection sampling per evitare modulo bias
    return function(n) {
      var r, v;
      do { r = bits(); v = r % n; } while (r - v > 0x3FFFFFFF - n + 1);
      return v;
    };
  }

  var _currentAlgo = 'mulberry32';
  var _nextInt = makeMulberry32(Date.now() >>> 0);

  function rndInt(n) { return _nextInt(n); }

  function seedPrng(n, algo) {
    algo = algo || _currentAlgo;
    _currentAlgo = algo;
    if (n == null) n = Date.now() >>> 0;
    _nextInt = (algo === 'ocaml') ? makeOcamlRandom(n >>> 0) : makeMulberry32(n >>> 0);
  }

  // ══════════════════════════════════════════════════════════════
  // ERRORI
  // ══════════════════════════════════════════════════════════════

  function PolygenError(msg) { this.message = msg; }
  PolygenError.prototype = Object.create(Error.prototype);
  PolygenError.prototype.name = "PolygenError";

  function fail(msg) { throw new PolygenError(msg); }

  // ══════════════════════════════════════════════════════════════
  // LABELSET  (prelude.ml — LabelSet)
  // ══════════════════════════════════════════════════════════════

  function LabelSet(arr) { this._a = arr ? arr.slice() : []; }
  LabelSet.empty = new LabelSet([]);
  LabelSet.ofLabels = function (arr) { return new LabelSet(arr || []); };
  LabelSet.prototype.add = function (lb) {
    if (this._a.indexOf(lb) >= 0) return this;
    var n = new LabelSet(this._a); n._a.push(lb); return n;
  };
  LabelSet.prototype.has     = function (lb) { return this._a.indexOf(lb) >= 0; };
  LabelSet.prototype.isEmpty = function ()   { return this._a.length === 0; };

  // ══════════════════════════════════════════════════════════════
  // ENVIRONMENT  (env.ml — lista associativa)
  // ══════════════════════════════════════════════════════════════

  var Env = {
    empty: [],
    bind: function (env, pairs) { return pairs.concat(env); },
    lookup: function (env, path) {
      if (path.parts.length > 0) fail("env.lookup: path non semplice non supportato");
      for (var i = 0; i < env.length; i++)
        if (env[i][0] === path.sym) return env[i][1];
      var defined = env.map(function(p){ return p[0]; }).join(", ");
      var e = new PolygenError(
        "simbolo non definito: '" + path.sym + "'" +
        (defined ? " (definiti: " + defined + ")" : " (nessun simbolo definito)")
      );
      e.notFound = true; throw e;
    }
  };

  // ══════════════════════════════════════════════════════════════
  // LEXER  (lexer.mll)
  // ══════════════════════════════════════════════════════════════

  function stripComments(src) {
    var out = "", i = 0, len = src.length;
    while (i < len) {
      if (src[i] === "(" && src[i+1] === "*") {
        i += 2; var depth = 1;
        while (i < len && depth > 0) {
          if      (src[i] === "(" && src[i+1] === "*") { depth++; i += 2; }
          else if (src[i] === "*" && src[i+1] === ")") { depth--; i += 2; }
          else i++;
        }
      } else { out += src[i++]; }
    }
    return out;
  }

  function tokenize(input) {
    var src = stripComments(input);
    var tokens = [], i = 0, len = src.length;

    function ahead(s) { return src.substr(i, s.length) === s; }
    function push(t, v) { tokens.push(v !== undefined ? {t:t,v:v} : {t:t}); }

    function readString() {
      var s = "";
      while (i < len) {
        var c = src[i];
        if (c === '"')  { i++; return s; }
        if (c === "\\") {
          i++;
          var e = src[i];
          if (/[0-9]/.test(e) && /[0-9]/.test(src[i+1]) && /[0-9]/.test(src[i+2])) {
            s += String.fromCharCode(parseInt(src.slice(i, i+3), 10));
            i += 3;
          } else {
            s += ({'"':'"','\\':'\\','n':'\n','r':'\r','b':'\b','t':'\t'}[e] || e);
            i++;
          }
          continue;
        }
        s += c; i++;
      }
      fail("stringa non terminata");
    }

    while (i < len) {
      var ch = src[i];
      if (/\s/.test(ch))    { i++; continue; }
      if (ahead("::="))     { push("DEF");      i+=3; continue; }
      if (ahead(":="))      { push("ASSIGN");   i+=2; continue; }
      if (ahead(">>"))      { push("GTGT");     i+=2; continue; }
      if (ahead("<<"))      { push("LTLT");     i+=2; continue; }
      if (ahead(".("))      { push("DOTBRA");   i+=2; continue; }
      if (ch === '"')       { i++; push("QUOTE", readString()); continue; }

      // .label  (. seguito da alnum)
      if (ch === "." && i+1 < len && /[a-zA-Z0-9]/.test(src[i+1])) {
        var j = i+1;
        while (j < len && /[a-zA-Z0-9']/.test(src[j])) j++;
        push("DOTLABEL", src.slice(i+1, j)); i = j; continue;
      }

      // singoli
      var singles = {
        ";":"EOL",":":"COLON","(":"BRA",")":"KET","[":"SQBRA","]":"SQKET",
        "|":"PIPE",">":"GT","<":"LT","{":"CBRA","}":"CKET","*":"STAR",
        "+":"PLUS","-":"MINUS","^":"CAP","_":"UNDERSCORE",".":"DOT",
        ",":"COMMA","\\":"BACKSLASH","/":"SLASH"
      };
      if (singles[ch]) { push(singles[ch]); i++; continue; }

      // TERM: inizia con minuscola/cifra/'
      if (/[a-z0-9']/.test(ch)) {
        var j = i;
        while (j < len && /[a-zA-Z0-9']/.test(src[j])) j++;
        var w = src.slice(i, j);
        if      (w === "import") push("IMPORT");
        else if (w === "as")     push("AS");
        else                     push("TERM", w);
        i = j; continue;
      }

      // NONTERM: inizia con maiuscola
      if (/[A-Z]/.test(ch)) {
        var j = i;
        while (j < len && /[a-zA-Z0-9]/.test(src[j])) j++;
        push("NONTERM", src.slice(i, j)); i = j; continue;
      }

      fail("carattere inatteso '" + ch + "' pos " + i);
    }
    tokens.push({t:"EOF"});
    return tokens;
  }

  // ══════════════════════════════════════════════════════════════
  // PARSER  (parser.mly → Absyn0)
  // ══════════════════════════════════════════════════════════════

  // Costruttori Absyn0
  var RESERVED = "__R";

  function mkPath(parts, sym)        { return {parts:parts, sym:sym}; }
  function aTerminal(t)              { return {type:"Terminal", terminal:t}; }
  function aSel(atom, label)         { return {type:"Sel",     atom:atom,      label:label};  }
  function aFold(u)                  { return {type:"Fold",    unfoldable:u}; }
  function aUnfold(u)                { return {type:"Unfold",  unfoldable:u}; }
  function aLock(u)                  { return {type:"Lock",    unfoldable:u}; }
  var tEps  = {type:"Epsilon"};
  var tCat  = {type:"Concat"};
  var tCap  = {type:"Capitalize"};
  function tTerm(s)                  { return {type:"Term", sym:s}; }
  function uNT(path)                 { return {type:"NonTerm", path:path}; }
  function uSub(mode, decls, prod)   { return {type:"Sub", mode:mode, decls:decls, prod:prod}; }
  function mkSeq(label, atoms)       { return {label:label, atoms:atoms}; }
  function mkProd(seqs)              { return {seqs:seqs}; }
  function mkBind(mode, sym, prod)   { return {type:"Bind",   mode:mode, sym:sym, prod:prod}; }
  function mkImport(sym, filename, decls) { return {type:"Import", sym:sym, filename:filename, decls:decls}; }

  // Helper: seq con un solo atom
  function seq1(a) { return mkSeq(null, [a]); }
  // optsub: (a | _)
  function optsub(a) {
    return uSub("Std", [], mkProd([seq1(aTerminal(tEps)), seq1(a)]));
  }
  // multisel: a.(l1|...|ln)  →  (__R ::= a; __R.l1 | ... | __R.ln)
  function multisel(a, lbs) {
    var res = aFold(uNT(mkPath([], RESERVED)));
    var b   = mkBind("Def", RESERVED, mkProd([mkSeq(null, [a])]));
    return aFold(uSub("Std", [b], mkProd(lbs.map(function(lb){
      return seq1(aSel(res, lb));
    }))));
  }
  // posel: gestione colonne posizionali
  function posel(atomss) {
    var n = atomss.reduce(function(z,a){ return Math.max(z, a.length); }, 1);
    if (n === 1) return atomss.map(function(a){ return a[0]; });
    var seqs = [];
    for (var k = 0; k < n; k++) {
      seqs.push(mkSeq(null, atomss.map(function(col){
        if (col.length === 1) return col[0];
        if (k < col.length)  return col[k];
        fail("numero eterogeneo di atomi posizionali");
      })));
    }
    return [aFold(uSub("Std", [], mkProd(seqs)))];
  }
  // expand: da lista [(peso,x),...] a lista ripetuta normalizzata
  function expand(l) {
    if (l.length === 0) fail("expand: lista vuota");
    var k = l.slice().sort(function(a,b){ return a[0]-b[0]; })[0][0];
    var r = [];
    l.forEach(function(item){
      for (var i = 0; i < item[0]-k+1; i++) r.push(item[1]);
    });
    return r;
  }
  // deep unfold
  function deepUnfoldAtom(a) {
    if (a.type === "Fold" || a.type === "Unfold")
      return aUnfold(deepUnfoldUnfoldable(a.unfoldable));
    if (a.type === "Sel") return aSel(deepUnfoldAtom(a.atom), a.label);
    return a;
  }
  function deepUnfoldSeq(s) { return mkSeq(s.label, s.atoms.map(deepUnfoldAtom)); }
  function deepUnfoldProd(p){ return mkProd(p.seqs.map(deepUnfoldSeq)); }
  function deepUnfoldUnfoldable(u) {
    if (u.type === "NonTerm") return u;
    return uSub(u.mode, u.decls, deepUnfoldProd(u.prod));
  }

  // ── parse principale ──────────────────────────────────────────

  function parse(input) {
    var tokens = tokenize(input);
    var pos = 0;

    function peek()  { return tokens[pos]; }
    function next()  { return tokens[pos++]; }
    function is(t,v) {
      var tk = tokens[pos];
      return tk && tk.t === t && (v === undefined || tk.v === v);
    }
    function expect(t) {
      if (!is(t)) fail("atteso " + t + ", trovato " + (peek()?peek().t:"EOF") + " pos:"+pos);
      return next();
    }

    function parseModif() {
      var n = 0, saw = false;
      while (is("PLUS") || is("MINUS")) { saw=true; n += is("PLUS")?1:-1; next(); }
      return saw ? n : 0;
    }

    function parsePath() {
      // costruisce lista in stile OCaml (reversed) poi Path(tl,hd)
      var parts = [expect("NONTERM").v];
      while (is("SLASH")) { next(); parts.push(expect("NONTERM").v); }
      var rev = parts.slice().reverse();
      return mkPath(rev.slice(1), rev[0]);
    }

    function parseLabels() {
      var items = [];
      while (true) {
        var w = parseModif();
        var lb = null;
        if      (is("NONTERM")) lb = next().v;
        else if (is("TERM"))    lb = next().v;
        else break;
        items.push([w, lb]);
        if (!is("PIPE")) break;
        next();
      }
      return expand(items);
    }

    function parseTerminal() {
      if (is("CAP"))        { next(); return tCat; }
      if (is("UNDERSCORE")) { next(); return tEps; }
      if (is("BACKSLASH"))  { next(); return tCap; }
      if (is("TERM"))       { return tTerm(next().v); }
      if (is("QUOTE"))      { return tTerm(next().v); }
      if (is("IMPORT"))     { next(); return tTerm("import"); }
      if (is("AS"))         { next(); return tTerm("as"); }
      return null;
    }

    function applyPostfix(a) {
      while (true) {
        if (is("DOTLABEL")) { a = aSel(a, next().v); continue; }
        if (is("DOTBRA"))   {
          next();
          var lbs = parseLabels();
          expect("KET");
          a = multisel(a, lbs); continue;
        }
        if (is("DOT")) {
          next();
          if (is("NONTERM") || is("TERM")) a = aSel(a, next().v);
          else a = aSel(a, null);
          continue;
        }
        break;
      }
      return a;
    }

    function parseSub(close) {
      var decls = [];
      // prova a parsare dichiarazioni locali NONTERM ::=|:= ... ;
      while (is("NONTERM")) {
        var saved = pos;
        var name = next().v;
        if (is("DEF") || is("ASSIGN")) {
          var mode = is("DEF") ? "Def" : "Assign";
          next();
          var p = parseProd();
          expect("EOL");
          decls.push(mkBind(mode, name, p));
        } else { pos = saved; break; }
      }
      // import dentro sub (non supportato, skip)
      while (is("IMPORT")) {
        next(); var f = expect("QUOTE").v; expect("AS"); var s = expect("NONTERM").v;
        if (is("EOL")) next();
        decls.push(mkImport(s, f, []));
      }
      var prod = parseProd();
      expect(close);
      return {decls:decls, prod:prod};
    }

    function parseUnfoldable() {
      if (is("NONTERM") || is("SLASH")) return uNT(parsePath());

      if (is("BRA")) {
        next();
        var sub = parseSub("KET");
        if (is("PLUS")) {
          next();
          var locSub  = uSub("Std", sub.decls, sub.prod);
          var subAtom = aFold(locSub);
          var xRef    = aFold(uNT(mkPath([], RESERVED)));
          var optX    = optsub(xRef);
          var seqR    = mkSeq(null, [subAtom, aFold(optX)]);
          var declR   = mkBind("Def", RESERVED, mkProd([seqR]));
          return uSub("Std", [declR], mkProd([seq1(xRef)]));
        }
        return uSub("Std", sub.decls, sub.prod);
      }

      if (is("SQBRA")) {
        next();
        var sub = parseSub("SQKET");
        return optsub(aFold(uSub("Std", sub.decls, sub.prod)));
      }

      if (is("CBRA")) {
        next();
        var sub = parseSub("CKET");
        return uSub("Mob", sub.decls, sub.prod);
      }

      if (is("GTGT")) {
        next();
        var sub = parseSub("LTLT");
        return uSub("Std", sub.decls, deepUnfoldProd(sub.prod));
      }

      fail("unfoldable atteso, trovato " + (peek()?peek().t:"EOF"));
    }

    function parseAtom() {
      var t = parseTerminal();
      if (t !== null) return applyPostfix(aTerminal(t));

      if (is("GT"))   { next(); return applyPostfix(aUnfold(parseUnfoldable())); }
      if (is("LT"))   { next(); return applyPostfix(aLock(parseUnfoldable()));  }

      if (is("NONTERM")||is("SLASH")||is("BRA")||is("SQBRA")||is("CBRA")||is("GTGT"))
        return applyPostfix(aFold(parseUnfoldable()));

      return null;
    }

    function parseAtomCol() {
      var a = parseAtom(); if (!a) return null;
      var atoms = [a];
      while (is("COMMA")) { next(); var a2=parseAtom(); if(!a2) fail("atom dopo ,"); atoms.push(a2); }
      return atoms;
    }

    var STOP = {PIPE:1,EOL:1,KET:1,SQKET:1,CKET:1,LTLT:1,EOF:1};

    function parseSeq0() {
      var cols = [];
      while (peek() && !STOP[peek().t]) {
        var col = parseAtomCol(); if (!col) break;
        cols.push(col);
      }
      return cols;
    }

    function parseSeqWithModif() {
      var modif = parseModif();
      var label = null;
      if (is("NONTERM") || is("TERM")) {
        var saved = pos, lbl = next().v;
        if (is("COLON")) { next(); label = lbl; }
        else pos = saved;
      }
      var cols  = parseSeq0();
      var atoms = cols.length ? posel(cols) : [];
      return [modif, mkSeq(label, atoms)];
    }

    function parseProd() {
      var items = [parseSeqWithModif()];
      while (is("PIPE")) { next(); items.push(parseSeqWithModif()); }
      return mkProd(expand(items));
    }

    function parseDecl() {
      if (is("IMPORT")) {
        next(); var f = expect("QUOTE").v; expect("AS"); var s = expect("NONTERM").v;
        return mkImport(s, f, []);
      }
      var name = expect("NONTERM").v;
      if (is("DEF"))    { next(); return mkBind("Def",    name, parseProd()); }
      if (is("ASSIGN")) { next(); return mkBind("Assign", name, parseProd()); }
      fail("::= o := atteso dopo " + name);
    }

    var decls = [];
    while (!is("EOF")) {
      decls.push(parseDecl());
      if (!is("EOF")) expect("EOL");
    }
    return decls;
  }

  // ══════════════════════════════════════════════════════════════
  // PREPROCESSORE  (pre.ml — Absyn0 → Absyn1)
  // ══════════════════════════════════════════════════════════════

  // comb: prodotto cartesiano di liste di liste
  function comb(ll) {
    if (ll.length === 0) return [];
    if (ll.length === 1) return ll[0].map(function(x){ return [x]; });
    var rest = comb(ll.slice(1));
    var out  = [];
    ll[0].forEach(function(x){ rest.forEach(function(l){ out.push([x].concat(l)); }); });
    return out;
  }

  // permute: tutte le permutazioni di una lista
  // Ordine identico all'implementazione OCaml (pre.ml: expl/perm)
  function permute(l) {
    if (l.length === 0) return [];
    if (l.length === 1) return [[l[0]]];
    function perm(h, x, t) {
      return permute(h.concat(t)).map(function(p){ return [x].concat(p); });
    }
    function expl(lst, h) {
      if (lst.length === 0) return [];
      var x = lst[0], xs = lst.slice(1);
      return expl(xs, [x].concat(h)).concat(perm(h, x, xs));
    }
    return expl(l, []);
  }

  // Former/Latter: tag per atomi mobili vs fissi
  function Former(x) { return {tag:"F", val:x}; }
  function Latter(x) { return {tag:"L", val:x}; }
  function isFormer(x){ return x.tag === "F"; }

  // arrange: genera tutte le disposizioni degli elementi mobili
  function arrange(mseq) {
    var mobiles = mseq.filter(isFormer);
    var perms   = mobiles.length === 0 ? [[]] : permute(mobiles);
    return perms.map(function(perm) {
      var pi = 0;
      return mseq.map(function(item){
        return isFormer(item) ? perm[pi++].val : item.val;
      });
    });
  }

  // Costruttori Absyn1
  function b1T(terminal)          { return {type:"Terminal", terminal:terminal}; }
  function b1NT(path)             { return {type:"NonTerm",  path:path}; }
  function b1Sel(atom, label)     { return {type:"Sel",  atom:atom, label:label}; }
  function b1Sub(decls, prod)     { return {type:"Sub",  decls:decls, prod:prod}; }
  function b1Seq(label, atoms)    { return {label:label, atoms:atoms, count:{v:0}}; }
  function b1Prod(seqs)           { return {seqs:seqs}; }
  function b1Bind(mode, sym, p)        { return {type:"Bind",       mode:mode, sym:sym, prod:p}; }
  function b1Import(sym, importedDecls1) { return {type:"ImportBind", sym:sym, importedDecls1:importedDecls1}; }

  // resolvedImports: mappa { sym → decls1 } per import già caricati
  function preprocess(decls0, resolvedImports) {
    resolvedImports = resolvedImports || {};

    function declare(env, decls) {
      return Env.bind(env, decls.map(function(d){
        if (d.type === "Import") return [d.sym, null]; // sentinel: non unfoldabile
        return [d.sym, d.prod];
      }));
    }

    function preAtom(env, a) {
      switch (a.type) {
        case "Terminal":
          return [Latter(b1T(a.terminal))];

        case "Sel":
          return preAtom(env, a.atom).map(function(ma){
            var s = b1Sel(ma.val, a.label);
            return isFormer(ma) ? Former(s) : Latter(s);
          });

        case "Lock":
        case "Fold": {
          var u = a.unfoldable;
          if (u.type === "NonTerm") return [Latter(b1NT(u.path))];
          var env2 = declare(env, u.decls);
          var s = b1Sub(preDecls(env2, u.decls), preProd(env2, u.prod));
          return u.mode === "Mob" ? [Former(s)] : [Latter(s)];
        }

        case "Unfold": {
          var u = a.unfoldable;
          if (u.type === "NonTerm") {
            var resolvedProd = Env.lookup(env, u.path);
            if (resolvedProd === null) fail("impossibile unfoldare un import: '" + u.path.sym + "'");
            var p1 = preProd(env, resolvedProd);
            return p1.seqs.map(function(seq){ return Latter(b1Sub([], b1Prod([seq]))); });
          }
          var env2 = declare(env, u.decls);
          var p1   = preProd(env2, u.prod);
          var mkS  = function(seq){ return b1Sub(preDecls(env2, u.decls), b1Prod([seq])); };
          return p1.seqs.map(function(seq){
            return u.mode === "Mob" ? Former(mkS(seq)) : Latter(mkS(seq));
          });
        }
      }
      fail("preAtom: tipo sconosciuto " + a.type);
    }

    function preSeq(env, seq) {
      var atomLists = seq.atoms.map(function(a){ return preAtom(env, a); });
      var combos    = atomLists.length ? comb(atomLists) : [];
      var newSeqs   = function(label, atomss){
        return atomss.map(function(atoms){ return b1Seq(label, atoms); });
      };
      var subs = combos.map(function(mseq){
        return b1Sub([], b1Prod(newSeqs(null, arrange(mseq))));
      });
      return newSeqs(seq.label, subs.map(function(s){ return [s]; }));
    }

    function preProd(env, prod) {
      var seqs = [];
      prod.seqs.forEach(function(seq){ preSeq(env, seq).forEach(function(s){ seqs.push(s); }); });
      return b1Prod(seqs);
    }

    function preDecls(env, decls) {
      return decls.map(function(d){
        if (d.type === "Import") {
          var imp = resolvedImports[d.sym];
          if (imp == null) fail("import non risolto: '" + d.sym + "' (file: " + d.filename + "). Usa compileAsync con un loader.");
          return b1Import(d.sym, imp);
        }
        return b1Bind(d.mode, d.sym, preProd(env, d.prod));
      });
    }

    var env = declare(Env.empty, decls0);
    return preDecls(env, decls0);
  }

  // ══════════════════════════════════════════════════════════════
  // GENERATORE  (gen.ml — Absyn1 → stringa)
  // ══════════════════════════════════════════════════════════════

  var doShuffle = true;

  // Sentinel objects per i terminali speciali (evitano collisioni con stringhe letterali)
  var T_EPS = {_sentinel:"Eps"};
  var T_CAT = {_sentinel:"Cat"};
  var T_CAP = {_sentinel:"Cap"};

  // post: lista di terminali Absyn2 → stringa
  function post(terms) {
    var cap = function(s){ return s; };
    var spc = "", out = "";
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (t === T_EPS) continue;
      if (t === T_CAT) { spc = ""; continue; }
      if (t === T_CAP) {
        cap = function(s){
          for (var j = 0; j < s.length; j++)
            if (/[A-Za-z]/.test(s[j]))
              return s.slice(0,j) + s[j].toUpperCase() + s.slice(j+1);
          return s;
        };
        continue;
      }
      out += spc + cap(t);
      spc  = " ";
      cap  = function(s){ return s; };
    }
    return out;
  }

  function plainSelect(seqs) {
    return seqs[rndInt(seqs.length)];
  }

  function shuffleSelect(seqs) {
    var sorted = seqs.slice().sort(function(a,b){ return a.count.v - b.count.v; });
    var mx     = sorted[sorted.length-1].count.v;
    var total  = sorted.reduce(function(z,s){ return z + (mx - s.count.v + 1); }, 0);
    var n      = rndInt(total + 1);
    var chosen = sorted[sorted.length-1];
    for (var i = 0; i < sorted.length; i++) {
      n -= (mx - sorted[i].count.v + 1);
      if (n <= 0) { chosen = sorted[i]; break; }
    }
    chosen.count.v++;
    return chosen;
  }

  var DEFAULT_MAX_DEPTH = 200;

  function generate(decls1, startSym, lbs, maxDepth) {
    lbs      = lbs      || LabelSet.empty;
    startSym = startSym || "S";
    maxDepth = maxDepth || DEFAULT_MAX_DEPTH;
    var select = doShuffle ? shuffleSelect : plainSelect;
    var depth  = 0;

    function declare(env, closureLbs, decls) {
      var envRef = {v: null};
      var pairs  = decls.map(function(d) {
        if (d.type === "ImportBind") {
          // Usa declare() ricorsivamente — gestisce import annidati correttamente
          var impEnv = declare(Env.empty, closureLbs, d.importedDecls1);
          return [d.sym, function(lbs2){
            return Env.lookup(impEnv, mkPath([], "S"))(lbs2);
          }];
        }
        if (d.type !== "Bind") fail("declare: tipo inatteso " + d.type);
        if (d.mode === "Def") {
          var prod = d.prod;
          return [d.sym, function(lbs2){ return genProd(envRef.v, lbs2, prod); }];
        } else {
          var prod = d.prod, cache = {v: null};
          return [d.sym, function(_){
            if (cache.v === null) cache.v = genProd(envRef.v, closureLbs, prod);
            return cache.v;
          }];
        }
      });
      envRef.v = Env.bind(env, pairs);
      return envRef.v;
    }

    function genAtom(env, lbs, a) {
      if (++depth > maxDepth) { depth--; fail("ricorsione troppo profonda (limite: " + maxDepth + ")"); }
      try {
        switch (a.type) {
          case "Terminal": {
            var t = a.terminal;
            if (t.type === "Epsilon")    return [T_EPS];
            if (t.type === "Concat")     return [T_CAT];
            if (t.type === "Capitalize") return [T_CAP];
            if (t.type === "Term")       return [t.sym];
            fail("terminale sconosciuto");
          }
          case "NonTerm":
            return Env.lookup(env, a.path)(lbs);
          case "Sel":
            if (a.label === null) return genAtom(env, LabelSet.empty, a.atom);
            return genAtom(env, lbs.add(a.label), a.atom);
          case "Sub":
            return genProd(declare(env, lbs, a.decls), lbs, a.prod);
        }
        fail("genAtom: tipo sconosciuto " + a.type);
      } finally {
        depth--;
      }
    }

    function genSeq(env, lbs, seq) {
      var out = [];
      seq.atoms.forEach(function(a){ genAtom(env, lbs, a).forEach(function(t){ out.push(t); }); });
      return out;
    }

    function genProd(env, lbs, prod) {
      var seqs = prod.seqs;
      if (!lbs.isEmpty())
        seqs = seqs.filter(function(s){ return s.label === null || lbs.has(s.label); });
      if (seqs.length === 0) return [T_EPS];
      return genSeq(env, lbs, select(seqs));
    }

    var env   = declare(Env.empty, lbs, decls1);
    var terms = genAtom(env, lbs, {type:"NonTerm", path:mkPath([], startSym)});
    return post(terms);
  }

  // ══════════════════════════════════════════════════════════════
  // CHECKER  (check.ml — check_flat + check_unfolding)
  // check_termination era già commentata nell'originale OCaml.
  // ══════════════════════════════════════════════════════════════

  // check_flat: esistenza dei non-terminali, permutazioni inutili
  function checkFlat(decls0) {
    var errors = [], warnings = [];

    function declareEnv(env, decls) {
      return Env.bind(env, decls.filter(function(d){ return d.type === "Bind"; })
        .map(function(d){ return [d.sym, d.prod]; }));
    }

    function isMobile(a) {
      if (a.type === "Fold" || a.type === "Unfold" || a.type === "Lock") {
        return a.unfoldable.type === "Sub" && a.unfoldable.mode === "Mob";
      }
      if (a.type === "Sel") return isMobile(a.atom);
      return false;
    }

    function checkUselessPerms(atoms) {
      var mobileCount = atoms.filter(isMobile).length;
      if (mobileCount === 1)
        warnings.push({ level: 2, message: "permutazione inutile (un solo elemento mobile)" });
    }

    function checkAtom(env, a) {
      switch (a.type) {
        case "Terminal": return;
        case "Sel": checkAtom(env, a.atom); return;
        case "Fold": case "Lock": case "Unfold": {
          var u = a.unfoldable;
          if (u.type === "NonTerm") {
            try { Env.lookup(env, u.path); }
            catch(e) {
              if (e.notFound) errors.push({ message: "simbolo non definito: '" + u.path.sym + "'" });
              else throw e;
            }
          } else {
            var env2 = declareEnv(env, u.decls);
            checkDecls(env2, u.decls);
            checkProd(env2, u.prod);
          }
          return;
        }
      }
    }

    function checkSeq(env, seq) {
      checkUselessPerms(seq.atoms);
      seq.atoms.forEach(function(a){ checkAtom(env, a); });
    }

    function checkProd(env, prod) {
      prod.seqs.forEach(function(s){ checkSeq(env, s); });
    }

    function checkDecls(env, decls) {
      decls.forEach(function(d){
        if (d.type === "Bind") checkProd(env, d.prod);
      });
    }

    var env = declareEnv(Env.empty, decls0);
    checkDecls(env, decls0);
    return { errors: errors, warnings: warnings };
  }

  // check_unfolding: unfold ciclici, unfold inutili, unfold su :=
  function checkUnfolding(decls0) {
    var errors = [], warnings = [];
    var uidCounter = 0;
    function freshUid(sym) { return sym + "_" + (++uidCounter); }

    function declareEnv(env, decls) {
      return Env.bind(env, decls.filter(function(d){ return d.type === "Bind"; })
        .map(function(d){ return [d.sym, { uid: freshUid(d.sym), mode: d.mode, prod: d.prod }]; }));
    }

    function checkUselessUnfold(a) {
      if (a.type === "Unfold" && a.unfoldable.type === "Sub") {
        if (a.unfoldable.prod.seqs.length === 1)
          warnings.push({ level: 2, message: "unfold inutile (produzione con una sola alternativa)" });
      }
    }

    function checkAtom(env, uids, a) {
      checkUselessUnfold(a);
      switch (a.type) {
        case "Terminal": return;
        case "Sel": checkAtom(env, uids, a.atom); return;
        case "Fold": case "Lock": return; // non tracciano
        case "Unfold": {
          var u = a.unfoldable;
          if (u.type === "NonTerm") {
            var entry;
            try { entry = Env.lookup(env, u.path); }
            catch(e) { return; } // già rilevato da checkFlat
            if (entry.mode === "Assign")
              warnings.push({ level: 2, message: "unfold di simbolo ':=' ('" + u.path.sym + "')" });
            if (uids.indexOf(entry.uid) >= 0)
              errors.push({ message: "unfold ciclico del simbolo '" + u.path.sym + "'" });
            else
              checkProd(env, [entry.uid].concat(uids), entry.prod);
          } else {
            var env2 = declareEnv(env, u.decls);
            checkDecls(env2, uids, u.decls);
            checkProd(env2, uids, u.prod);
          }
          return;
        }
      }
    }

    function checkSeq(env, uids, seq) {
      seq.atoms.forEach(function(a){ checkAtom(env, uids, a); });
    }

    function checkProd(env, uids, prod) {
      prod.seqs.forEach(function(s){ checkSeq(env, uids, s); });
    }

    function checkDecls(env, uids, decls) {
      decls.forEach(function(d){
        if (d.type !== "Bind") return;
        var entry = Env.lookup(env, mkPath([], d.sym));
        checkProd(env, [entry.uid].concat(uids), entry.prod);
      });
    }

    var env = declareEnv(Env.empty, decls0);
    checkDecls(env, [], decls0);
    return { errors: errors, warnings: warnings };
  }

  // ── API di validazione ───────────────────────────────────────────
  //
  // Polygen.check(source, opts)
  //   Ritorna { errors: [...], warnings: [...] } senza lanciare.
  //   opts: { start: "S" }
  //
  // Polygen.compile(source, { validate: true })
  //   Lancia PolygenError se ci sono errori.
  //   Aggiunge .warnings al grammar object se ci sono warning.

  function checkGrammar(source, opts) {
    opts = opts || {};
    var start   = opts.start || "S";
    var decls0  = (typeof source === "string") ? parse(source) : source;
    var errors  = [], warnings = [];

    var startDefined = decls0.some(function(d){ return d.type === "Bind" && d.sym === start; });
    if (!startDefined)
      errors.push({ message: "simbolo di partenza '" + start + "' non definito" });

    var flat = checkFlat(decls0);
    var unf  = checkUnfolding(decls0);
    errors   = errors.concat(flat.errors).concat(unf.errors);
    warnings = warnings.concat(flat.warnings).concat(unf.warnings);

    return { errors: errors, warnings: warnings };
  }

  // ══════════════════════════════════════════════════════════════
  // API PUBBLICA
  // ══════════════════════════════════════════════════════════════

  var Polygen = {
    /**
     * Compila (parse + preprocess) una grammatica.
     * @param {string} source
     * @param {object} opts   - opzionale: { validate: true, start: "S" }
     *   Se validate:true, lancia PolygenError in caso di errori e aggiunge
     *   .warnings all'oggetto restituito in caso di warning.
     */
    compile: function (source, opts) {
      opts = opts || {};
      if (opts.validate) {
        var report = checkGrammar(source, opts);
        if (report.errors.length > 0)
          fail("validazione fallita:\n" + report.errors.map(function(e){ return "  errore: " + e.message; }).join("\n"));
        var grammar = preprocess(parse(source));
        if (report.warnings.length > 0) grammar.warnings = report.warnings;
        return grammar;
      }
      return preprocess(parse(source));
    },

    /**
     * Valida una grammatica senza generare output.
     * @param {string} source
     * @param {object} opts   - opzionale: { start: "S" }
     * @returns {{ errors: Array, warnings: Array }}
     *   errors:   [{ message: string }]
     *   warnings: [{ level: 1|2, message: string }]
     */
    check: checkGrammar,

    /**
     * Genera una stringa da una grammatica.
     * @param {string|null} source  - sorgente grammatica (ignorato se opts.grammar fornito)
     * @param {object}      opts    - opzionale: { start, labels, seed, prng, grammar }
     *                                prng: 'mulberry32' (default) | 'ocaml'
     */
    generate: function (source, opts) {
      opts = opts || {};
      var start = opts.start  || "S";
      var lbs   = LabelSet.ofLabels(opts.labels || []);
      if (opts.seed != null) { seedPrng(opts.seed >>> 0, opts.prng || 'mulberry32'); doShuffle = false; }
      else                   { doShuffle = true; }
      var maxDepth = opts.maxDepth != null ? opts.maxDepth >>> 0 : DEFAULT_MAX_DEPTH;
      var decls1 = opts.grammar || preprocess(parse(source || ""));
      return generate(decls1, start, lbs, maxDepth);
    },

    /**
     * Compila una grammatica con supporto import asincrono.
     * @param {string} source  - sorgente grammatica
     * @param {object} opts    - opzionale: { loader: function(filename) → string|Promise<string> }
     * @returns {Promise<compiledGrammar>}
     *
     * Esempio:
     *   Polygen.compileAsync(src, {
     *     loader: function(filename) {
     *       return fetch(filename).then(r => r.text());
     *     }
     *   }).then(function(grammar) {
     *     var result = Polygen.generate(null, { grammar: grammar });
     *   });
     */
    compileAsync: function (source, opts) {
      opts = opts || {};
      var self = this;
      var loader = opts.loader || null;
      var decls0 = parse(source);
      var imports = decls0.filter(function(d){ return d.type === "Import"; });

      if (imports.length === 0) {
        return Promise.resolve(preprocess(decls0, {}));
      }
      if (!loader) {
        return Promise.reject(new PolygenError(
          "la grammatica contiene import ma nessun loader è stato fornito in opts.loader"
        ));
      }

      var promises = imports.map(function(imp) {
        var loaded = loader(imp.filename);
        return Promise.resolve(loaded).then(function(src) {
          return self.compileAsync(src, opts).then(function(compiled) {
            return [imp.sym, compiled];
          });
        });
      });

      return Promise.all(promises).then(function(pairs) {
        var resolvedImports = {};
        pairs.forEach(function(pair){ resolvedImports[pair[0]] = pair[1]; });
        return preprocess(decls0, resolvedImports);
      });
    },

    /**
     * Genera una stringa con supporto import asincrono.
     * @param {string|null} source
     * @param {object}      opts  - { start, labels, seed, maxDepth, grammar, loader }
     * @returns {Promise<string>}
     */
    generateAsync: function (source, opts) {
      opts = opts || {};
      var self = this;
      var grammarPromise = opts.grammar
        ? Promise.resolve(opts.grammar)
        : self.compileAsync(source || "", opts);
      return grammarPromise.then(function(grammar) {
        return self.generate(null, {
          grammar:  grammar,
          start:    opts.start,
          labels:   opts.labels,
          seed:     opts.seed,
          prng:     opts.prng,
          maxDepth: opts.maxDepth
        });
      });
    },

    /**
     * Imposta il seed del PRNG manualmente.
     * @param {number} n     - seed (ometti per seed casuale)
     * @param {string} algo  - 'mulberry32' (default) | 'ocaml'
     */
    seed: seedPrng
  };

  // Esporta
  if (typeof module !== "undefined" && module.exports) module.exports = Polygen;
  else global.Polygen = Polygen;

})(typeof window !== "undefined" ? window : this);
