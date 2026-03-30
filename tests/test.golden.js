/*
 * tests/test.golden.js
 * Confronto deterministico: output JS (prng:'ocaml') vs golden OCaml.
 *
 * Prerequisito: tests/golden.json deve esistere (generato dal workflow GitHub Actions).
 *
 * Esegui con: node tests/test.golden.js
 */
"use strict";

var fs      = require('fs');
var path    = require('path');
var Polygen = require('../polygen.js');

var goldenPath = path.join(__dirname, 'golden.json');
if (!fs.existsSync(goldenPath)) {
  console.error('tests/golden.json non trovato.');
  console.error('Esegui prima il workflow GitHub Actions "Generate OCaml golden outputs".');
  process.exit(1);
}

var golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
var cases  = JSON.parse(fs.readFileSync(path.join(__dirname, 'cases.json'), 'utf8'));

var passed = 0, failed = 0;

for (var i = 0; i < cases.length; i++) {
  var tc  = cases[i];
  var src = fs.readFileSync(
    path.join(__dirname, 'grammars', tc.grammar + '.grm'), 'utf8');

  var got;
  try {
    got = Polygen.generate(src, {
      seed:   tc.seed,
      start:  tc.start  || 'S',
      labels: tc.labels || [],
      prng:   'ocaml'
    });
    got = got.trimEnd();
  } catch (e) {
    got = 'ERROR:' + e.message;
  }

  var expected = golden[tc.id];
  if (got === expected) {
    passed++;
  } else {
    failed++;
    console.log('  FAIL  ' + tc.id);
    console.log('        expected: ' + JSON.stringify(expected));
    console.log('        got:      ' + JSON.stringify(got));
  }
}

console.log('\n' + passed + ' passed, ' + failed + ' failed' +
  (failed > 0 ? ' ← PRNG OCaml non corrisponde' : ' ✓ PRNG OCaml compatibile'));
if (failed > 0) process.exit(1);
