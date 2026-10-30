# Polygen.js — porting.claude.js — Grammatiche vetrina

Nove grammatiche nuove, scritte per questo progetto di porting diretto (`polygen.porting.claude.js`,
**non** il porting "white room" in `../polygen.js/`), aggiunte come entry 9-17 di
`demo.extended.html` accanto alle 9 già esistenti (0-8, costrutti isolati a scopo didattico).

A differenza di quelle didattiche, queste 9 sono **contenuto**: pezzi ispirati alle grammatiche
reali del corpus originale di Polygen (`../Polygen/grammars/`), riscritti da zero — non copiati —
complessificati e allungati, sempre con l'obiettivo di produrre periodi di senso compiuto, non
insalate di parole casuali. Ogni file sta anche in `showcase/*.grm` come sorgente standalone,
testabile con `node -e "require('./polygen.js').generate(...)"` senza passare dal browser.

**Stato:** committate nel repo insieme a `docs/dossier.html` (i report Fable restano invece
locali) — restano fuori da `tests/grammars/` (quella cartella è per il confronto byte-esatto con
OCaml via CI, questa è una vetrina, non un test di fedeltà).

## Indice

| # | File | Titolo | Ispirata a (corpus reale) | Costrutti principali |
|---|------|--------|---------------------------|----------------------|
| 9  | `crisi-ponte-comando.grm`   | Crisi sul ponte di comando        | `startrek.grm`, `sttng.grm`            | `:=`, label accoppiate, `(sub)+` |
| 10 | `helpdesk-escalation.grm`   | Escalation helpdesk                | `bofh.grm`, `compileline.grm`          | `>`, `>>...<<` + decl locale, pesi |
| 11 | `comizio-politico.grm`      | Comizio politico                   | `silvio.grm`, `girotondi.grm`          | `:=`, `(sub)+`, `{}` mobile, pesi |
| 12 | `lezione-architettura.grm`  | Lezione di architettura software   | `oop.grm`, `designpatterns.grm`        | `:=`, `>>...<<` + decl locale, `>` |
| 13 | `recensione-mostra.grm`     | Recensione di mostra d'arte        | `artex.grm`                            | `:=`, `>`, capitalize |
| 14 | `abstract-accademico.grm`   | Abstract accademico                | `paper.grm`, `designpatterns.grm`      | `:=`, `{}` mobile, pesi |
| 15 | `sitcom-assurda.grm`        | Sitcom assurda                     | `chicoypaco.grm`                       | `(sub)+` annidato, `:=`, pesi |
| 16 | `koan-zen.grm`              | Koan zen contemporaneo             | `real-zen.grm` (gia' in `tests/grammars`), `blues.grm` | epsilon `_`, alternanza esplicita |
| 17 | `postmortem-devops.grm`     | Postmortem incidente DevOps        | `rcstalk.grm`, `compileline.grm`, `manager.grm` | `(sub)+`, `>`, pesi |

**Nota su "comizio-politico"**: politico e partito sono interamente inventati (nomi di fantasia),
nessun riferimento a persone reali — a differenza di `silvio.grm` originale, che prende di mira
una figura pubblica specifica per nome.

## Un vincolo di leggibilità trovato e corretto durante la scrittura

Scrivendo queste grammatiche sono emersi due errori di accordo/coerenza, sistemati prima di
integrarle nel demo — utili da ricordare per chi ne scriverà altre:

1. **`{}` mobile su clausole intere, non solo aggettivi**: `{"controllare" X} {"e sperare"}`
   (in `helpdesk-escalation.grm`, prima versione) produceva a volte "e sperare controllare X" —
   grammaticalmente rotto, perché "e sperare" presuppone testualmente che l'azione precedente sia
   già stata nominata. `{}` va usato solo per elementi **davvero simmetrici** (due aggettivi
   interscambiabili), mai per clausole con un ordine narrativo obbligato. Corretto rendendo fisso
   l'ordine in `helpdesk-escalation.grm` e `postmortem-devops.grm` (vedi commento inline in
   quest'ultimo su `StatoA`/`StatoB`).

2. **Accordo singolare/plurale attraverso riferimenti a simboli diversi**: in
   `crisi-ponte-comando.grm`, generare separatamente il soggetto ("gli scudi") e il verbo
   ("e' in sovraccarico") produceva "gli scudi e' in sovraccarico" (plurale + verbo singolare),
   perché le due scelte casuali sono indipendenti. Risolto accoppiando soggetto e verbo nello
   stesso simbolo (`SistemaStato`), invece di provare a correlarli con label o selettori
   incrociati — più semplice e a prova di errore.

## Perché non queste grammatiche non sono state usate per la caccia ai bug

Le 9 vetrine usano deliberatamente solo costrutti già verificati solidi (label, `{}`, `:=`,
`(sub)+`, `>`, `>>...<<`, pesi, epsilon) — **non** la sintassi a colonne posizionali con virgola
(`A,B ... B,A`) trovata in `oop.grm` durante la caccia ai bug (vedi `resume.direct-porting.with-
fable.prompt.md` e la sessione 2026-07-28 in memoria): quel costrutto ha ancora una divergenza
di conteggio delle estrazioni PRNG non risolta rispetto all'OCaml originale, quindi non è il caso
di esporlo in una vetrina pensata per "fare bella figura".
