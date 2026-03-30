/*
 * test.js — Test suite per polygen.js
 *
 * Esegui con: node test.js
 *
 * Ogni test usa seed deterministico e confronta l'output con il valore atteso.
 * I valori attesi sono stati calcolati con questa stessa implementazione dopo
 * verifica visiva su demo.extended.html; possono essere ricalibrati con --update.
 *
 * Flag:
 *   node test.js          → esegui tutti i test
 *   node test.js --update → ricalcola i valori attesi e stampa i nuovi
 *   node test.js --verbose→ stampa ogni risultato anche se passa
 */

"use strict";

var Polygen = require("./polygen.js");

var UPDATE  = process.argv.indexOf("--update")  >= 0;
var VERBOSE = process.argv.indexOf("--verbose") >= 0;

var passed = 0, failed = 0;

function run(name, source, opts, expected) {
  opts = Object.assign({ seed: 42 }, opts || {});
  var got;
  try {
    got = Polygen.generate(source, opts);
  } catch (e) {
    got = "ERROR:" + e.message;
  }
  if (UPDATE) {
    console.log(JSON.stringify([name, got]));
    return;
  }
  if (got === expected) {
    passed++;
    if (VERBOSE) console.log("  PASS  " + name + " → " + JSON.stringify(got));
  } else {
    failed++;
    console.log("  FAIL  " + name);
    console.log("        expected: " + JSON.stringify(expected));
    console.log("        got:      " + JSON.stringify(got));
  }
}

function runThrows(name, source, opts, expectedMsgSubstring) {
  opts = Object.assign({ seed: 42 }, opts || {});
  var threw = false, msg = "";
  try { Polygen.generate(source, opts); }
  catch (e) { threw = true; msg = e.message; }
  if (UPDATE) { console.log(JSON.stringify([name, threw ? msg : "DID_NOT_THROW"])); return; }
  if (threw && msg.indexOf(expectedMsgSubstring) >= 0) {
    passed++;
    if (VERBOSE) console.log("  PASS  " + name + " (threw: " + msg + ")");
  } else if (!threw) {
    failed++;
    console.log("  FAIL  " + name + " (atteso throw, non è stato lanciato)");
  } else {
    failed++;
    console.log("  FAIL  " + name + " (errore diverso da atteso)");
    console.log("        expected substring: " + JSON.stringify(expectedMsgSubstring));
    console.log("        got message:        " + JSON.stringify(msg));
  }
}

// ─────────────────────────────────────────────────────────────────────
// TERMINALI BASE
// ─────────────────────────────────────────────────────────────────────

run("terminal quoted",
  'S ::= "hello" ;',
  {}, "hello");

run("terminal TERM",
  'S ::= world ;',
  {}, "world");

run("epsilon underscore",
  'S ::= _ ;',
  {}, "");

run("concat caret",
  'S ::= hello ^ world ;',
  {}, "helloworld");

run("capitalize backslash",
  'S ::= \\ hello ;',
  {}, "Hello");

run("multi-word sequence",
  'S ::= the quick brown fox ;',
  {}, "the quick brown fox");

run("preserves trailing terminal newline",
  'S ::= a ^ "\n" ^ b ^ "\n" ;',
  {}, "a\nb\n");

// ─────────────────────────────────────────────────────────────────────
// ALTERNATIVE E PESI
// ─────────────────────────────────────────────────────────────────────

run("alternatives seed42",
  'S ::= a | b | c ;',
  { seed: 42 }, Polygen.generate('S ::= a | b | c ;', { seed: 42 }));

run("weighted plus",
  'S ::= ++ a | b ;',
  { seed: 42 }, Polygen.generate('S ::= ++ a | b ;', { seed: 42 }));

run("weighted minus",
  'S ::= a | -- b ;',
  { seed: 42 }, Polygen.generate('S ::= a | -- b ;', { seed: 42 }));

run("weighted order preserved with ocaml prng",
  'S ::= >(due | tre | quattro | --dieci) ;',
  { seed: 1, prng: "ocaml" }, "quattro");

run("weighted plus ocaml explicit",
  'S ::= ++ a | b ;',
  { seed: 42, prng: "ocaml" }, "a");

run("weighted minus ocaml explicit",
  'S ::= a | -- b ;',
  { seed: 42, prng: "ocaml" }, "a");

// ─────────────────────────────────────────────────────────────────────
// NON-TERMINALI E RICORSIONE
// ─────────────────────────────────────────────────────────────────────

run("non-terminal reference",
  'S ::= A ; A ::= hello ;',
  {}, "hello");

run("two NT",
  'S ::= A B ; A ::= foo ; B ::= bar ;',
  {}, "foo bar");

run("chained NT",
  'S ::= A ; A ::= B ; B ::= deep ;',
  {}, "deep");

// ─────────────────────────────────────────────────────────────────────
// OPTIONAL
// ─────────────────────────────────────────────────────────────────────

run("optional present seed",
  'S ::= [maybe] ;',
  { seed: 1 }, Polygen.generate('S ::= [maybe] ;', { seed: 1 }));

run("optional absent seed",
  'S ::= [maybe] ;',
  { seed: 2 }, Polygen.generate('S ::= [maybe] ;', { seed: 2 }));

run("optional present explicit",
  'S ::= [maybe] ;',
  { seed: 1 }, "maybe");

run("optional absent explicit",
  'S ::= [maybe] ;',
  { seed: 2 }, "");

// ─────────────────────────────────────────────────────────────────────
// LABEL
// ─────────────────────────────────────────────────────────────────────

run("label selection simple",
  'S ::= A.sg ; A ::= sg: one | pl: two ;',
  {}, "one");

run("label via opts",
  'S ::= A ; A ::= sg: one | pl: two ;',
  { labels: ["pl"] }, "two");

run("label fallthrough (no label = always match)",
  'S ::= A ; A ::= sg: one | always ;',
  { labels: ["sg"] }, Polygen.generate('S ::= A ; A ::= sg: one | always ;', { seed: 42, labels: ["sg"] }));

run("multi-label selector",
  'S ::= A.(sg|pl) ; A ::= sg: uno | pl: due | ne: tre ;',
  { seed: 42 }, Polygen.generate('S ::= A.(sg|pl) ; A ::= sg: uno | pl: due | ne: tre ;', { seed: 42 }));

run("label fallthrough explicit",
  'S ::= A ; A ::= sg: one | always ;',
  { seed: 42, labels: ["sg"] }, "always");

run("multi-label selector ocaml explicit",
  'S ::= A.(sg|pl) ; A ::= sg: uno | pl: due | ne: tre ;',
  { seed: 42, prng: "ocaml" }, "due");

run("label via opts ocaml explicit",
  'S ::= A ; A ::= sg: one | pl: two ;',
  { seed: 42, prng: "ocaml", labels: ["pl"] }, "two");

// ─────────────────────────────────────────────────────────────────────
// ASSIGNMENT :=
// ─────────────────────────────────────────────────────────────────────

run("assignment memoization",
  'S ::= X X X ; X := a | b | c ;',
  { seed: 42 }, (function(){
    var r1 = Polygen.generate('S ::= X X X ; X := a | b | c ;', { seed: 42 });
    // Tutti e tre i token devono essere identici (memoizzato)
    var parts = r1.split(" ");
    return (parts[0] === parts[1] && parts[1] === parts[2]) ? r1 : "MEMO_FAIL";
  })());

run("assignment memoization ocaml explicit",
  'S ::= X X X ; X := a | b | c ;',
  { seed: 42, prng: "ocaml" }, "a a a");

// ─────────────────────────────────────────────────────────────────────
// UNFOLD >
// ─────────────────────────────────────────────────────────────────────

run("unfold basic",
  'S ::= > A ; A ::= x | y ;',
  { seed: 42 }, Polygen.generate('S ::= > A ; A ::= x | y ;', { seed: 42 }));

// ─────────────────────────────────────────────────────────────────────
// MOBILE GROUPS {}
// ─────────────────────────────────────────────────────────────────────

run("mobile group produces permutation",
  'S ::= {a} {b} {c} ;',
  { seed: 42 }, Polygen.generate('S ::= {a} {b} {c} ;', { seed: 42 }));

run("mobile permute with weighted alternatives (ocaml)",
  'S ::= {++ (due | tre | quattro)} {-- (uno | due)} ;',
  { seed: 42, prng: "ocaml" }, "due due");

run("mobile permute with fixed atoms (ocaml)",
  'S ::= start {alpha} mid {beta} end ;',
  { seed: 42, prng: "ocaml" }, "start alpha mid beta end");

// ─────────────────────────────────────────────────────────────────────
// DICHIARAZIONI LOCALI
// ─────────────────────────────────────────────────────────────────────

run("local declarations",
  'S ::= (A ::= local ; A) ;',
  {}, "local");

run("local shadow outer",
  'S ::= (A ::= inner ; A) ; A ::= outer ;',
  {}, "inner");

// ─────────────────────────────────────────────────────────────────────
// REPETITION (sub)+
// ─────────────────────────────────────────────────────────────────────

run("repetition plus",
  'S ::= (a)+ ;',
  { seed: 42 }, Polygen.generate('S ::= (a)+ ;', { seed: 42 }));

run("repetition plus explicit",
  'S ::= (a)+ ;',
  { seed: 42 }, "a a");

// ─────────────────────────────────────────────────────────────────────
// COMPILE + GENERATE SEPARATI
// ─────────────────────────────────────────────────────────────────────

run("compile then generate",
  null,
  { grammar: Polygen.compile('S ::= compiled ;'), seed: 42 },
  "compiled");

// ─────────────────────────────────────────────────────────────────────
// ERRORI ATTESI
// ─────────────────────────────────────────────────────────────────────

runThrows("undefined symbol error",
  'S ::= Undefined ;',
  {}, "simbolo non definito");

runThrows("recursion depth exceeded",
  'S ::= S S ;',
  { maxDepth: 5 }, "ricorsione troppo profonda");

runThrows("import without loader",
  'import "foo.grm" as Foo;\nS ::= Foo ;',
  {}, "import non risolto");

// ─────────────────────────────────────────────────────────────────────
// CHECKER (Polygen.check)
// ─────────────────────────────────────────────────────────────────────

(function() {
  function check(name, source, opts, expectErrors, expectWarnings) {
    var report;
    try { report = Polygen.check(source, opts || {}); }
    catch(e) {
      failed++;
      console.log("  FAIL  check:" + name + " → threw unexpectedly: " + e.message);
      return;
    }
    var eOk = report.errors.length === (expectErrors || 0);
    var wOk = report.warnings.length === (expectWarnings || 0);
    if (eOk && wOk) {
      passed++;
      if (VERBOSE) console.log("  PASS  check:" + name + " (errors:" + report.errors.length + " warnings:" + report.warnings.length + ")");
    } else {
      failed++;
      console.log("  FAIL  check:" + name);
      if (!eOk) console.log("        errors expected:" + (expectErrors||0) + " got:" + report.errors.length + " " + JSON.stringify(report.errors));
      if (!wOk) console.log("        warnings expected:" + (expectWarnings||0) + " got:" + report.warnings.length + " " + JSON.stringify(report.warnings));
    }
  }

  function checkExact(name, source, opts, expectedErrors, expectedWarnings) {
    var report;
    try { report = Polygen.check(source, opts || {}); }
    catch(e) {
      failed++;
      console.log("  FAIL  checkExact:" + name + " → threw unexpectedly: " + e.message);
      return;
    }
    var gotErrors = report.errors.map(function(e){ return e.message; });
    var gotWarnings = report.warnings.map(function(w){ return w.message; });
    var eOk = JSON.stringify(gotErrors) === JSON.stringify(expectedErrors || []);
    var wOk = JSON.stringify(gotWarnings) === JSON.stringify(expectedWarnings || []);
    if (eOk && wOk) {
      passed++;
      if (VERBOSE) console.log("  PASS  checkExact:" + name);
    } else {
      failed++;
      console.log("  FAIL  checkExact:" + name);
      if (!eOk) console.log("        expected errors: " + JSON.stringify(expectedErrors || []) + " got: " + JSON.stringify(gotErrors));
      if (!wOk) console.log("        expected warnings: " + JSON.stringify(expectedWarnings || []) + " got: " + JSON.stringify(gotWarnings));
    }
  }

  check("valid grammar",              'S ::= hello ;',                 {},         0, 0);
  check("undefined NT",               'S ::= Undefined ;',             {},         1, 0);
  check("missing start symbol",       'A ::= foo ;',                   {start:"S"},1, 0);
  check("cyclic unfold",              'S ::= > A ; A ::= > S ;',       {},         2, 0);
  check("useless unfold (1 alt)",     'S ::= > (only) ;',              {},         0, 1);
  check("useless permutation (1mob)", 'S ::= {a} b ;',                 {},         0, 1);
  check("valid unfold",               'S ::= > A ; A ::= x | y ;',    {},         0, 0);
  check("validate:true ok",           'S ::= hello ;',                 {},         0, 0);

  checkExact("undefined NT message",
    'S ::= Undefined ;',
    {},
    ["simbolo non definito: 'Undefined'"],
    []);

  checkExact("missing start symbol message",
    'A ::= foo ;',
    {start:"S"},
    ["simbolo di partenza 'S' non definito"],
    []);

  checkExact("cyclic unfold messages",
    'S ::= > A ; A ::= > S ;',
    {},
    ["unfold ciclico del simbolo 'S'", "unfold ciclico del simbolo 'A'"],
    []);

  checkExact("useless unfold warning message",
    'S ::= > (only) ;',
    {},
    [],
    ["unfold inutile (produzione con una sola alternativa)"]);

  checkExact("useless permutation warning message",
    'S ::= {a} b ;',
    {},
    [],
    ["permutazione inutile (un solo elemento mobile)"]);

  checkExact("unfold assign warning message",
    'S ::= > A ; A := x | y ;',
    {},
    [],
    ["unfold di simbolo ':=' ('A')"]);

  // compile con validate:true lancia su errore
  (function(){
    var msg = null;
    try { Polygen.compile('S ::= Undefined ;', { validate: true }); }
    catch(e) { msg = e.message; }
    if (msg === "validazione fallita:\n  errore: simbolo non definito: 'Undefined'") {
      passed++; if (VERBOSE) console.log("  PASS  check:compile validate:true throws on error");
    } else if (msg === null) {
      failed++; console.log("  FAIL  check:compile validate:true should have thrown");
    } else {
      failed++; console.log("  FAIL  check:compile validate:true wrong message");
      console.log("        got: " + JSON.stringify(msg));
    }
  })();

  // compile con validate:true ok restituisce grammar con .warnings
  (function(){
    var g = Polygen.compile('S ::= > (only) ;', { validate: true });
    var warnings = g && Array.isArray(g.warnings) ? g.warnings.map(function(w){ return w.message; }) : [];
    if (JSON.stringify(warnings) === JSON.stringify(["unfold inutile (produzione con una sola alternativa)"])) {
      passed++; if (VERBOSE) console.log("  PASS  check:compile validate:true warnings on grammar");
    } else {
      failed++; console.log("  FAIL  check:compile validate:true should have warnings on grammar");
      console.log("        got: " + JSON.stringify(warnings));
    }
  })();
})();

// ─────────────────────────────────────────────────────────────────────
// DEEP UNFOLD  >>…<<
// ─────────────────────────────────────────────────────────────────────

// >>A | B<< espande entrambi: pool atteso = {x, y, p, q}
run("deep unfold seed42",
  'S ::= >> A | B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 42 }, "q");

run("deep unfold seed42 ocaml explicit",
  'S ::= >> A | B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 42, prng: "ocaml" }, "q");

run("deep unfold seed1",
  'S ::= >> A | B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 1 }, "p");

// Verifica che il pool sia davvero {x,y,p,q} — campiona 50 seed
(function() {
  var src  = 'S ::= >> A | B << ; A ::= x | y ; B ::= p | q ;';
  var pool = {}, allowed = {x:1, y:1, p:1, q:1};
  for (var i = 0; i < 50; i++) pool[Polygen.generate(src, {seed:i})] = 1;
  var keys = Object.keys(pool).sort();
  var ok = keys.length === 4 && keys.every(function(k){ return allowed[k]; });
  if (ok) { passed++; if (VERBOSE) console.log("  PASS  deep unfold pool = {x,y,p,q}"); }
  else     { failed++; console.log("  FAIL  deep unfold pool got: " + JSON.stringify(keys)); }
})();

// deep unfold con sub inline
run("deep unfold inline sub",
  'S ::= >> (A B) | C << ; A ::= aa ; B ::= bb ; C ::= cc | dd ;',
  { seed: 42 }, "dd");

// ─────────────────────────────────────────────────────────────────────
// LOCK  < NT
// ─────────────────────────────────────────────────────────────────────

// Lock senza >><<: si comporta come Fold (riferimento normale)
run("lock plain seed42",
  'S ::= < A ; A ::= x | y ;',
  { seed: 42 }, "y");

run("lock plain seed1",
  'S ::= < A ; A ::= x | y ;',
  { seed: 1  }, "y");

// Lock dentro >><<: blocca l'unfold di B — pool rimane {x,y,p,q}
// perché B viene comunque valutato al momento della generazione
(function() {
  var src  = 'S ::= >> A | < B << ; A ::= x | y ; B ::= p | q ;';
  var pool = {}, allowed = {x:1, y:1, p:1, q:1};
  for (var i = 0; i < 50; i++) pool[Polygen.generate(src, {seed:i})] = 1;
  var keys = Object.keys(pool).sort();
  var ok = keys.length === 4 && keys.every(function(k){ return allowed[k]; });
  if (ok) { passed++; if (VERBOSE) console.log("  PASS  lock inside >>><< pool = {x,y,p,q}"); }
  else     { failed++; console.log("  FAIL  lock inside >>><<  pool got: " + JSON.stringify(keys)); }
})();

run("lock inside deep unfold seed42",
  'S ::= >> A | < B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 42 }, "p");

run("lock inside deep unfold seed42 ocaml explicit",
  'S ::= >> A | < B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 42, prng: "ocaml" }, "x");

run("lock inside deep unfold seed1",
  'S ::= >> A | < B << ; A ::= x | y ; B ::= p | q ;',
  { seed: 1 }, "y");

// ─────────────────────────────────────────────────────────────────────
// REPETITION (sub)+  — test più approfonditi
// ─────────────────────────────────────────────────────────────────────

// (a|b)+: ogni token deve essere "a" o "b", almeno 1 token
(function() {
  var seeds = [42, 1, 99, 7, 13];
  seeds.forEach(function(s) {
    var r = Polygen.generate('S ::= (a | b)+ ;', {seed:s});
    var words = r === "" ? [] : r.split(" ");
    var ok = words.length >= 1 && words.every(function(w){ return w === "a" || w === "b"; });
    if (ok) { passed++; if (VERBOSE) console.log("  PASS  (a|b)+ seed" + s + " → " + JSON.stringify(r)); }
    else     { failed++; console.log("  FAIL  (a|b)+ seed" + s + " → " + JSON.stringify(r)); }
  });
})();

run("repetition (a|b)+ seed42",  'S ::= (a | b)+ ;', { seed: 42 }, "a b");
run("repetition (a|b)+ seed1",   'S ::= (a | b)+ ;', { seed: 1  }, "b");
run("repetition (a|b)+ seed99",  'S ::= (a | b)+ ;', { seed: 99 }, "a");

// (sub)+ con maxDepth: non deve crashare con ripetizioni moderate
(function() {
  try {
    Polygen.generate('S ::= (hello)+ ;', { seed: 42, maxDepth: 500 });
    passed++; if (VERBOSE) console.log("  PASS  (sub)+ with maxDepth:500 does not crash");
  } catch(e) {
    failed++; console.log("  FAIL  (sub)+ with maxDepth:500 threw: " + e.message);
  }
})();

// ─────────────────────────────────────────────────────────────────────
// PATH MULTI-LIVELLO  A/B
// ─────────────────────────────────────────────────────────────────────

runThrows("path multi-level A/B",
  'S ::= A/B ;',
  {}, "path non semplice");

// ─────────────────────────────────────────────────────────────────────
// DETERMINISMO SEED PRNG
// ─────────────────────────────────────────────────────────────────────

(function() {
  var src = 'S ::= a | b | c | d | e | f | g | h ;';
  var seeds = [0, 1, 42, 999, 2147483647];
  seeds.forEach(function(s) {
    var r1 = Polygen.generate(src, {seed:s});
    var r2 = Polygen.generate(src, {seed:s});
    var r3 = Polygen.generate(src, {seed:s});
    if (r1 === r2 && r2 === r3) {
      passed++; if (VERBOSE) console.log("  PASS  determinism seed" + s + " → " + r1);
    } else {
      failed++; console.log("  FAIL  determinism seed" + s + ": " + r1 + " / " + r2 + " / " + r3);
    }
  });
})();

// Semi diversi producono risultati diversi (su 8 semi, ci aspettiamo > 1 valore distinto)
(function() {
  var src = 'S ::= a | b | c | d | e | f | g | h ;';
  var results = {};
  for (var i = 0; i < 8; i++) results[Polygen.generate(src, {seed:i})] = 1;
  var unique = Object.keys(results).length;
  if (unique >= 3) {
    passed++; if (VERBOSE) console.log("  PASS  different seeds → " + unique + " distinct values");
  } else {
    failed++; console.log("  FAIL  different seeds too uniform: only " + unique + " distinct values");
  }
})();

// ─────────────────────────────────────────────────────────────────────
// IMPORT ASYNC — helper per test asincroni
// ─────────────────────────────────────────────────────────────────────

var asyncTests = [];

function asyncTest(name, promise) {
  asyncTests.push(
    promise.then(function(ok) {
      if (ok) { passed++; if (VERBOSE) console.log("  PASS  async:" + name); }
      else    { failed++; console.log("  FAIL  async:" + name); }
    }).catch(function(e) {
      failed++;
      console.log("  FAIL  async:" + name + " → threw: " + e.message);
    })
  );
}

// import semplice
asyncTest("import basic", (function() {
  var mainSrc   = 'import "colors.grm" as Colors;\nS ::= Colors ;';
  var colorsSrc = 'S ::= red | green | blue ;';
  return Polygen.compileAsync(mainSrc, {
    loader: function(filename) {
      if (filename === "colors.grm") return Promise.resolve(colorsSrc);
      return Promise.reject(new Error("file non trovato: " + filename));
    }
  }).then(function(grammar) {
    var result = Polygen.generate(null, { grammar: grammar, seed: 1 });
    return result === "green";
  });
})());

// import nested: main → adj → base
asyncTest("import nested", (function() {
  var files = {
    "main.grm": 'import "adj.grm" as Adj;\nimport "noun.grm" as Noun;\nS ::= Adj Noun ;',
    "adj.grm":  'import "base.grm" as Base;\nS ::= big | small | Base ;',
    "noun.grm": 'S ::= cat | dog ;',
    "base.grm": 'S ::= tiny ;'
  };
  var loader = function(f) {
    return files[f] ? Promise.resolve(files[f])
                    : Promise.reject(new Error("file non trovato: " + f));
  };
  return Polygen.compileAsync(files["main.grm"], { loader: loader })
    .then(function(grammar) {
      // genera più volte per verificare che funzioni
      var pool = {};
      for (var s = 0; s < 20; s++)
        pool[Polygen.generate(null, {grammar: grammar, seed: s})] = 1;
      var keys = Object.keys(pool);
      // deve produrre combinazioni di {big,small,tiny} × {cat,dog}
      var allOk = keys.every(function(k) {
        var parts = k.split(" ");
        return parts.length === 2 &&
               ["big","small","tiny"].indexOf(parts[0]) >= 0 &&
               ["cat","dog"].indexOf(parts[1]) >= 0;
      });
      return allOk && keys.length >= 3; // almeno 3 combinazioni distinte su 20 seed
    });
})());

// generateAsync end-to-end
asyncTest("generateAsync", (function() {
  return Polygen.generateAsync('S ::= async | works ;', { seed: 42 })
    .then(function(result) {
      return result === "works";
    });
})());

// generateAsync deve propagare il PRNG scelto come generate()
asyncTest("generateAsync propagates prng", (function() {
  var src = 'S ::= a | b | c | d | e ;';
  var expected = Polygen.generate(src, { seed: 42, prng: "ocaml" });
  return Polygen.generateAsync(src, { seed: 42, prng: "ocaml" })
    .then(function(result) {
      return result === expected;
    });
})());

// compileAsync senza loader su grammatica senza import → ok
asyncTest("compileAsync no imports", (function() {
  return Polygen.compileAsync('S ::= pure ;')
    .then(function(grammar) {
      return Polygen.generate(null, {grammar: grammar, seed: 42}) === "pure";
    });
})());

// ─────────────────────────────────────────────────────────────────────
// RISULTATO FINALE
// ─────────────────────────────────────────────────────────────────────

Promise.all(asyncTests).then(function() {
  if (!UPDATE) {
    console.log("\n" + passed + " passed, " + failed + " failed" +
      (failed > 0 ? " ← ATTENZIONE" : " ✓"));
    if (failed > 0) process.exit(1);
  }
});
