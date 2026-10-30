---
tipo: scoperta
registro: fatto
esito: accettata
data: 2026-10-30
contributo: "Gabriele Motta (richiesta di coprire l'intero corpus e le opzioni del binario; indicazione di non pubblicare materiale non pertinente), Claude Sonnet 5.5 (generazione dei casi, correzione di golden.yml, esecuzione dei confronti)"
fonte: "tests/golden.json (commit 3e2d748); tests/cases.json; .github/workflows/golden.yml; run GitHub Actions 41136730001"
---

# Confronto con OCaml su 1436 casi: nessuna divergenza oltre ai due bug del 28 luglio

## Contesto

Il 2026-07-28 il confronto con il binario OCaml copriva 24 delle 128 grammatiche
del corpus originale e aveva fatto emergere due bug del porting: `capitalize`
(`\`) che modificava più del primo carattere, e `posel()` (generazione
posizionale) che costruiva le alternative in ordine inverso a `tab` di
`prelude.ml`. Restavano 104 grammatiche mai confrontate, e si ignorava se
contenessero altri bug dello stesso tipo. Due casi (`real-oop/1`, `real-oop/99`)
fallivano per la decodifica dell'output del binario nello script CI.

## Sostanza

Il 2026-10-30 il confronto è stato esteso in quattro passi. A ogni passo il
valore atteso è l'output del binario OCaml autentico, generato dal workflow
`golden.yml` e salvato in `tests/golden.json`.

| passo | casi aggiunti | totale | esito |
|---|---|---|---|
| 104 grammatiche mancanti, seed 1, 42, 99 | 312 | 455 | 455 su 455 |
| seed 7, 123, 31337 sulle 128 grammatiche; 256 casi con altri simboli di partenza (`-S`); 42 casi con un label attivo (`-l`) | 682 | 1137 | 1137 su 1137 |
| opzione `-X N` (4 generazioni a seed 42 su tutte le grammatiche; 3 generazioni a seed 7 sulle 150 che usano `:=`) | 299 | 1436 | 1436 su 1436 |

Nessun passo ha prodotto una divergenza, e nessuna correzione del porting è
stata necessaria per allinearlo all'output OCaml in questa sessione. Le
modifiche a `polygen.js` sono l'aggiunta di `generateMany` (vedi il record sulla
decisione omonima).

Cause trovate lungo il percorso, tutte nell'infrastruttura di confronto:

- il runner `ubuntu-latest` è diventato `ubuntu-26.04` (GCC 15), su cui OCaml
  4.11.2 non compila. La run `41131515572` è fallita dopo 50 secondi nel passo
  "Set up OCaml 4.11". Il runner è stato fissato a `ubuntu-24.04`;
- lo script leggeva l'output del binario come UTF-8: un byte isolato 0xE8,
  prodotto dall'escape `\232`, diventava U+FFFD in `golden.json`. Ora i byte non
  UTF-8 sono letti come Latin-1. `real-oop/1` e `real-oop/99` passano;
- aggiungere casi in `tests/cases.json` non avviava la CI, perché il file non era
  nei percorsi del workflow. Ora lo è.

Verifiche sulla qualità del confronto: nel golden non ci sono voci `ERROR:` né
vuote; in tutti i 298 casi con `-S` o `-l` l'output OCaml differisce da quello con
simbolo `S` e senza label; in 275 dei 299 casi `-X` l'output comincia con il testo
del caso a generazione singola, ed è più lungo.

Limiti del confronto:

- tutti i casi usano `-seed`, che nel binario disattiva `do_shuffle`. Il selettore
  `shuffle_select` di `gen.ml` (generazione senza seed) non è mai stato confrontato
  con OCaml, perché non è deterministico;
- i casi usano il PRNG compatibile con OCaml (`prng: 'ocaml'`); il PRNG di default
  del porting (mulberry32) produce sequenze diverse per scelta di progetto;
- non sono coperti: più label attivi insieme, simboli di partenza oltre i primi
  due di ogni grammatica, le modalità `-pre` e `-t` del binario, e l'opzione `-eof`.

## Evidenza

- `node tests/test.golden.js`: 1436 passati, 0 falliti. `node test.js`: 130
  passati, 0 falliti.
- Commit: `1f58115` e `b581871` (casi), `219e287` (casi `-X`), `fb1e047`,
  `6e82d74` e `04ee2e4` (workflow). Valori attesi: commit del bot `2c0b43d`,
  `9af6805`, `3e2d748`.
- Run GitHub Actions: `41132511128` (455 casi), `41133851907` (1137 casi),
  `41136730001` (1436 casi).

## Conseguenza

- Le 128 grammatiche reali del corpus sono confrontate con il binario OCaml con
  sei seed, e le opzioni `-S`, `-l` e `-X` sono esercitate. Sul perimetro coperto
  non risulta nessuna differenza di output.
- Un bug che si manifesti solo in condizioni non coperte (elenco dei limiti sopra)
  resta possibile.
- Se la CI fallisce prima di eseguire le grammatiche, la prima verifica è
  l'immagine del runner.

## Facilitese

Per controllare che il porting scriva gli stessi testi del programma originale, lo
stesso insieme di grammatiche e di numeri casuali viene passato a entrambi, e i
testi prodotti vengono confrontati lettera per lettera. A luglio il confronto
riguardava 24 grammatiche su 128 e aveva trovato due errori. Oggi riguarda tutte e
128, con più numeri casuali, con partenze da altri punti della grammatica, con
parole-chiave attive e con più testi di fila: 1436 prove in tutto, tutte uguali.
I problemi incontrati strada facendo riguardavano il sistema che esegue il
programma originale.

## Frase

Il 2026-10-30 il porting JavaScript ha prodotto lo stesso output del binario OCaml
in 1436 casi su 1436, su tutte le 128 grammatiche del corpus originale.
