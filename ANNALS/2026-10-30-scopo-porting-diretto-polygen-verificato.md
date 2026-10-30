---
tipo: scopo
registro: fatto
esito: accettata
data: 2026-10-30
contributo: "Gabriele Motta (scelta del porting diretto come seconda linea accanto al progetto clean-room, nome del repository, requisito di verifica contro il binario originale), Claude Opus 4.6 e Claude Sonnet 5 e 5.5 (traduzione, test e confronto nelle sessioni successive)"
fonte: "README.md; commit 590dd1d (2026-03-22); ~/.claude/history.jsonl, sessione d6f55107, prompt del 2026-03-22 21:21-21:26 sul nome e sul rapporto con il progetto clean-room"
---

# Porting diretto di Polygen da OCaml a un solo file JavaScript, verificato contro il binario originale

## Contesto

Polygen è un generatore di testo casuale basato su grammatiche formali, scritto in
OCaml da Alvise Spano' nel 2002 (repository `alvisespano/Polygen`). Esisteva già
un altro progetto di Gabriele Motta, `polygen.js`, sviluppato con
approccio clean-room, cioè senza tradurre il codice originale.

Il 2026-03-22, nella sessione `d6f55107`, Gabriele Motta ha proposto di fare una
seconda linea come "porting" accanto a quella clean-room (prompt: "farei questo
come 'porting'") e ha scelto come nome del repository `polygen.js.direct.porting`.
Il primo commit del repository è `590dd1d`, dello stesso giorno, con l'etichetta
pre-alpha.

## Sostanza

Lo scopo del progetto al 2026-10-30:

1. tradurre i sorgenti OCaml di Polygen, modulo per modulo (lexer, parser,
   preprocessore, generatore), in un unico file `polygen.js` senza dipendenze, che
   giri nel browser e in Node;
2. mantenere la logica di generazione fedele all'originale, e dimostrarlo
   confrontando l'output con quello del binario OCaml compilato dai sorgenti
   originali, a parità di grammatica, seed, simbolo di partenza, label e numero di
   generazioni;
3. dichiarare per iscritto ciò che il porting contiene in più o in meno rispetto
   all'originale.

Dentro il perimetro: la pipeline lexer, parser, preprocessore, generatore; il
controllo statico di `check.ml` (senza `check_termination`, già disattivata
nell'OCaml); le aggiunte elencate nel README alla sezione "Additions to the
original" (`generateMany`, `import`, i limiti `maxAlternatives` e `maxDepth`).

Fuori dal perimetro: lettura e scrittura di file (`io.ml`, `load.ml`), il numero di
versione del binario, e il tracciamento di riga e colonna negli errori, che l'OCaml
ha e il porting non ha.

Il progetto clean-room `polygen.js` resta separato. Le due linee non si
scambiano codice né architettura.

## Evidenza

- `README.md` descrive il progetto come "direct, faithful translation" e contiene
  la tabella delle aggiunte.
- Commit `590dd1d` (2026-03-22): primo commit del repository.
- `node tests/test.golden.js`: 1436 casi su 1436 identici all'output del binario
  OCaml (record `2026-10-30-scoperta-golden-1436-casi-zero-divergenze`).
- `~/.claude/history.jsonl` contiene i prompt del 2026-03-22 sul nome e sul
  rapporto con il progetto clean-room. Il transcript della sessione `d6f55107` è
  stato cancellato dalla pulizia automatica a 30 giorni, quindi le risposte del
  modello di quella sessione non sono più disponibili.

## Conseguenza

- Una modifica che cambia l'output rispetto a OCaml è un difetto del porting, da
  correggere, salvo che sia una delle aggiunte dichiarate.
- Ogni funzione assente dalla libreria OCaml entra nella tabella "Additions to the
  original" del README prima di essere considerata parte del progetto.
- Il codice del progetto clean-room non entra qui, e questo non entra là.
- Lo scopo è registrato come istantanea del 2026-10-30. Se cambia, questo record
  passa a `esito: superata` e il nuovo lo cita in `fonte`.

## Facilitese

Polygen è un programma del 2002 che inventa frasi seguendo regole scritte
dall'utente. Era scritto in un linguaggio, OCaml, che non gira dentro una pagina
web. Questo progetto riscrive lo stesso programma in JavaScript, che gira nel
browser, seguendo il codice originale passo per passo, e poi controlla che le frasi
prodotte siano identiche a quelle del programma originale. Esiste un secondo
progetto, separato, che ottiene lo stesso risultato senza guardare il codice
originale. Quando il porting fa qualcosa che l'originale non fa, lo scrive nel
README.

## Frase

Dal 2026-03-22 `polygen.js.direct.porting` traduce Polygen da OCaml a un solo file
JavaScript, e al 2026-10-30 produce lo stesso output del binario OCaml in 1436 casi
su 1436.
