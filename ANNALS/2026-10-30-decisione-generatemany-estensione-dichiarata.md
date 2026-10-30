---
tipo: decisione
registro: fatto
esito: accettata
data: 2026-10-30
contributo: "Gabriele Motta (richiesta di coprire -X N; decisione di dichiarare la funzione come estensione e di registrarla), Claude Sonnet 5.5 (lettura dei sorgenti OCaml, disegno dell'API, implementazione, test)"
fonte: "commit 219e287; ../Polygen/src/polygen.ml righe 25, 68, 126; ../Polygen/src/polygen_lib.ml righe 47-52"
---

# generateMany: estensione dichiarata del porting, equivalente di -X N

## Contesto

Il porting traduce la libreria OCaml (`polygen_lib`) in `polygen.js`. Il binario
OCaml ha in più l'opzione `-X N`, definita in `polygen.ml` (riga 68), che genera
N testi di fila dalla stessa grammatica: il ciclo `for i = 1 to !times do`
(riga 126) chiama `Polygen_lib.generate` N volte sulla stessa grammatica già
preprocessata e stampa ogni testo seguito dalla stringa `-eof` (di default
`"\n"`).

`polygen_lib.generate` (righe 47-52 di `polygen_lib.ml`) produce un solo testo.
La ripetizione sta nel programma principale, fuori dalla libreria. `polygen.js`
non aveva niente di equivalente, e `Polygen.generate()` richiamata N volte con lo
stesso seed restituisce N testi identici, perché inizializza il PRNG a ogni
chiamata.

Il README affermava "No redesign, no added abstractions", mentre il file già
conteneva altre aggiunte rispetto a OCaml: `import ... as` (che l'OCaml non ha mai
supportato, `pre.ml` solleva `Unexpected`) e il limite `maxAlternatives` in
`preprocess()`.

## Sostanza

È stata aggiunta `Polygen.generateMany(source, opts)`, che restituisce un array di
`opts.times` stringhe. Il comportamento ricalca `polygen.ml`:

- la grammatica è letta e preprocessata una volta;
- il PRNG è inizializzato una volta con `opts.seed` e prosegue tra le generazioni;
- le memoizzazioni `:=` ripartono da zero a ogni generazione (in `gen.ml` la cache
  `ref None` è creata dentro ogni chiamata a `gen`);
- `times <= 0` restituisce un array vuoto, come un ciclo `for` senza iterazioni.

La funzione è dichiarata come **estensione** rispetto alla libreria OCaml: riproduce
una funzione del binario, e `polygen_lib` non la contiene. Dove il progetto
descrive le differenze rispetto all'originale, `generateMany` sta nella stessa
lista di `import` e di `maxAlternatives`.

Alternative considerate e scartate:

- un'opzione `times` su `generate()`: il tipo di ritorno cambierebbe (stringa o
  array) in base a un'opzione;
- un flag per far proseguire il PRNG tra chiamate successive di `generate()`: lo
  stato del PRNG resterebbe a carico di chi chiama, e `generate()` senza seed
  attiva comunque `doShuffle`, che il binario con `-seed` disattiva.

`generate()` non è stata modificata.

## Evidenza

- Commit `219e287` (`polygen.js`, `test.js`, `tests/test.golden.js`,
  `tests/cases.json`, `.github/workflows/golden.yml`).
- `node test.js`: 130 passati, 0 falliti, di cui 10 test nuovi su `generateMany`
  (numero di elementi, PRNG che prosegue, prima generazione uguale a `generate()`,
  determinismo, `times` 0, `:=` coerente dentro una generazione e ricalcolato
  tra generazioni, grammatica precompilata).
- `tests/cases.json` ha 299 casi nuovi con il campo `times` (4 generazioni a seed
  42 su tutte le grammatiche, 3 generazioni a seed 7 sulle 150 che usano `:=`).
- Non verificato al momento della scrittura (2026-10-30, 23:16): il confronto di
  quei 299 casi con l'output del binario OCaml. La run di GitHub Actions che
  produce i valori attesi era in corso. L'equivalenza con `-X N` è quindi
  dedotta dalla lettura di `polygen.ml` e `gen.ml` fino a quel confronto.

## Conseguenza

- README e intestazione di `polygen.js` elencano `generateMany` tra le estensioni.
- Chi cerca la fedeltà a `polygen_lib` può ignorare la funzione; chi vuole il
  comportamento di `-X N` nel browser la trova nell'API pubblica.
- L'esito del confronto con OCaml va registrato in un record separato, senza
  riscrivere questo.

## Facilitese

Il programma originale in OCaml può produrre più testi di fila con l'opzione
`-X`. La libreria interna dello stesso programma ne produce uno solo, e il porting
JavaScript traduceva la libreria. Ripetere la generazione dal JavaScript dava
sempre lo stesso testo, perché a ogni chiamata il generatore di numeri casuali
ripartiva dall'inizio. Ora esiste una funzione, `generateMany`, che parte una
volta sola e continua a estrarre numeri casuali per ogni testo, come fa `-X`. Il
progetto la segnala come aggiunta, perché l'originale non la ha nella libreria.

## Frase

Il 2026-10-30 è stata aggiunta `Polygen.generateMany` (commit `219e287`), che
riproduce l'opzione `-X N` del binario OCaml, assente da `polygen_lib`, ed è
dichiarata come estensione insieme a `import` e a `maxAlternatives`.
