---
name: polygen-grammar-authoring
description: Usa questa skill ogni volta che scrivi, modifichi o revisioni una grammatica Polygen (file .grm, o sorgente Polygen inline in JS/HTML) per questo porting (polygen.porting.claude.js). Raccoglie errori reali già commessi durante la scrittura delle grammatiche vetrina di questo progetto — spaziatura raddoppiata, gruppi mobili {} usati su clausole non simmetriche, binding locali fuori scope, disaccordo grammaticale fra simboli scelti indipendentemente, backslash persi quando il sorgente viene incorporato in una stringa JS — così da evitarli dall'inizio invece di scoprirli e autocorreggerli ogni volta da capo.
---

# Scrivere grammatiche Polygen senza gli errori già fatti

Questa skill non è una guida completa alla sintassi Polygen (per quella: `Polygen/docs/polygen-spec_IT.html`,
la specifica ufficiale di Alvise Spanò — o la sezione "Guida rapida" in `docs/dossier.html` di questo repo).
È una lista mirata di **errori reali commessi scrivendo le 9 grammatiche vetrina** di questo progetto
(`showcase/*.grm`, sessione 2026-07-28), ciascuno con la causa esatta e come evitarlo la prossima volta.

## 1. TERM vs NONTERM — maiuscola conta, letteralmente

Un simbolo che inizia con maiuscola (`Nome`) è un **riferimento a non-terminale**: deve essere definito
da qualche parte con `::=` o `:=`. Un simbolo che inizia con minuscola/cifra/apostrofo (`nome`, `7up`, `'e`)
è un **terminale letterale**: il testo prodotto è quello, non viene cercata alcuna definizione.

Errore fatto: scrivere `X ::= a | b | c | d | e;` aspettandosi che `a`, `b`, ecc. fossero alternative
letterali — corretto, perché sono minuscole. Ma il primo tentativo di un test aveva usato lettere
MAIUSCOLE (`A`, `B`, `C`...) per lo stesso scopo, causando `simbolo non definito: 'C'`. Se vuoi un
terminale letterale corto, usa minuscolo. Se ti serve un simbolo con nome "parlante" in maiuscolo, va
comunque definito da qualche parte.

## 2. Spaziatura automatica — non raddoppiarla

Polygen inserisce automaticamente **uno spazio singolo fra atomi consecutivi** in una sequenza (a meno
di usare `^` per glueare senza spazio). Se scrivi tu stesso uno spazio dentro una stringa fra virgolette
E l'atomo successivo riceve comunque lo spazio automatico, ottieni un doppio spazio.

Errore fatto: `"REGISTRO DI BORDO — " Nave` produceva `"REGISTRO DI BORDO —  Stazione..."` (due spazi),
perché la stringa finiva già con uno spazio e Polygen ne aggiungeva un altro prima di `Nave`.
Stesso problema con `"Comandante" ": " Frase` → `"Comandante :  Frase"` (spazio prima dei due punti,
che in italiano non ci va, PIÙ doppio spazio dopo).

**Regola pratica:**
- Per uno spazio singolo fra due parole: scrivile come due atomi separati, senza spazi extra nelle
  virgolette (`"parola1" "parola2"` → `"parola1 parola2"`).
- Per **nessuno spazio** (es. prima di `:`, `,`, `.`, `!`): usa `^` per glueare
  (`"Comandante" ^ ":" Frase` → `"Comandante: Frase"`, corretto).
- Non mettere MAI uno spazio a mano dentro una stringa se l'atomo successivo non è glueato con `^` —
  lo spazio arriva comunque da solo.

## 3. Gruppi mobili `{}` — solo per elementi davvero simmetrici

`{A} {B}` dice a Polygen "questi due possono scambiarsi di posto, sono intercambiabili". Va benissimo
per due aggettivi (`{distribuito} {critico}` → "distribuito critico" o "critico distribuito", entrambi
validi). **Non va bene per clausole con un ordine narrativo obbligato.**

Errore fatto: `{"controllare" Componente} {"e sperare"}` a volte produceva "e sperare controllare le
impostazioni" — rotto in italiano, perché "e sperare" presuppone testualmente che l'azione precedente sia
già stata nominata. Corretto: tolto `{}`, ordine fissato (`"controllare" Componente "e sperare"`).

**Domanda da farsi prima di usare `{}`:** se scambio l'ordine a mano, la frase ha ancora senso?
Se la risposta è no, non sono candidati per `{}`.

## 4. Binding locali (`:=`/`::=` dentro `(...)`) sono visibili SOLO dentro quella espressione

`(Sym := prod; espressione)` rende `Sym` visibile solo dentro `espressione`, non al resto della
grammatica. Se un ALTRO simbolo top-level ha bisogno dello stesso valore memoizzato, il binding va
messo a **livello globale** (semplice `Sym := prod;` fuori da ogni parentesi), non innestato.

Errore fatto: `S ::= (Nome := NomePolitico; Apertura ...)` con `Apertura` e `Chiusura` definiti come
regole globali separate che referenziavano `Nome` → `simbolo non definito: 'Nome'`, perché il binding
locale non usciva dalle parentesi di `S`. Corretto: spostare `Nome := NomePolitico;` a livello globale,
prima di `S`.

## 5. L'accordo grammaticale (singolare/plurale, genere) non è automatico fra simboli diversi

Se generi il soggetto con un simbolo e il verbo/aggettivo con un altro simbolo indipendente, le due
scelte casuali NON si coordinano da sole — puoi ottenere "gli scudi è in sovraccarico" (plurale +
verbo singolare).

Errore fatto: `Sistema` (poteva risolvere a "gli scudi", plurale, o "il nucleo", singolare) e
`StatoSistema` (sempre "e' ...", singolare) erano due riferimenti separati nella stessa sequenza.

**Come risolverlo bene:** accoppia soggetto e predicato **nello stesso simbolo**, un'alternativa per
ogni combinazione corretta:
```
SistemaStato ::= "il nucleo di dilitio" "e'" StatoSing
                | "gli scudi" "sono" StatoPlur;
```
Non provare a "correlare" due riferimenti separati con selettori di etichetta incrociati a meno di
sapere esattamente cosa stai facendo (le etichette filtrano le produzioni di UN simbolo, non
sincronizzano scelte fra simboli diversi).

## 6. Preposizione + articolo (italiano): "a la" non esiste, serve "alla"

Se componi `"a" NomeConCuiNonSaiComeIniziera` e quel simbolo a volte produce "la X", a volte "il Y",
ottieni "a la X" (sbagliato) invece di "alla X".

Errore fatto: `"un approccio... a" Problema` con `Problema` che a volte iniziava per "la...", "l'...",
"il...". **Due soluzioni**, in ordine di preferenza:
1. Scegli una preposizione che non richiede contrazione con l'articolo (`"per"` invece di `"a"`).
2. Se devi proprio usare quella preposizione, gestisci la contrazione dentro ogni alternativa del
   simbolo (più verboso, evitalo se puoi).

## 7. Capitalize `\` è un sentinel che "salta in avanti" oltre l'epsilon — comportamento sorprendente ma corretto

`\` non capitalizza "la prossima parola nella stessa produzione": inserisce un segnale nel flusso di
output finale che resta **in sospeso** finché non trova il prossimo testo non-vuoto, **anche
attraversando un blocco `[...]` opzionale successivo che è stato saltato**. Se il tuo `\` è seguito da
qualcosa che risolve a epsilon (es. un opzionale pesato quasi sempre vuoto), il "sospeso" può
capitalizzare del testo molto più avanti di quanto ti aspetti — anche testo che semanticamente non
c'entra nulla con quel `\`.

Questo NON è un bug della grammatica che stai scrivendo: è un comportamento reale e documentato
(verificato identico nel sorgente OCaml originale, `gen.ml`). Ma se non lo sai, il risultato sembra un
bug misterioso. **Prevenzione pratica**: se usi `\` prima di qualcosa che può risolvere a epsilon,
testa con abbastanza semi (20-30) e leggi l'output cercando maiuscole fuori posto, non fidarti di un
singolo seed.

## 8. Il costrutto posizionale a virgole (`A,B ... B,A`) — usalo con cautela

Esiste (`posel` nel parser), serve a correlare due o più scelte nella stessa sequenza tramite lo stesso
indice casuale (es. `Marca,Modello ... Modello,Marca`). **Al momento della scrittura di questa skill
esiste una divergenza nota, non ancora risolta, fra il nostro output e quello OCaml reale proprio su
questo costrutto** (vedi `real-oop.grm` nei golden test, e `tests/grammars/repro-positional-generation.grm`
per un caso minimo in verifica). Se stai scrivendo una grammatica che deve essere fedele byte-per-byte
a OCaml, evita questo costrutto finché la divergenza non è chiusa. Se ti serve solo output plausibile in
JS (non serve fedeltà OCaml), è comunque utilizzabile — ma testalo con più semi.

## 9. Import di sorgente `.grm` dentro una stringa JS (es. `demo.extended.html`)

Se incorpori il testo di una grammatica Polygen come template literal JS (backtick), **ogni backslash
va raddoppiato**: `\n` → `\\n`, `\"` → `\\"`, e soprattutto il capitalize `\ ` (backslash-spazio) →
`\\ ` — altrimenti JS interpreta il backslash come parte di un proprio escape (o lo scarta, se non lo
riconosce) PRIMA che Polygen veda il sorgente, e il capitalize sparisce silenziosamente senza errori.
Verifica sempre con un giro `Polygen.check()` + `Polygen.generate()` sul risultato finale incorporato,
non solo sul file `.grm` originale — l'escaping può rompersi solo nel passaggio, non nel sorgente.

## Checklist minima prima di dire "questa grammatica è pronta"

1. `Polygen.check(src)` → `{errors: [], warnings: []}` (i warning vanno letti, non solo tollerati)
2. Generare con almeno 10-15 semi diversi e **leggere davvero l'output**, non solo controllare che non
   crashi — cercare: spazi doppi, maiuscole fuori posto, disaccordi di genere/numero, frasi con ordine
   rotto da un `{}` mobile mal scelto
3. Se la grammatica userà mai `prng:'ocaml'` per un confronto di fedeltà, verificare che non usi il
   costrutto a virgole posizionale finché il punto 8 non è chiuso
4. Se il sorgente finisce embeddato in JS/HTML, ri-testare DOPO l'embedding, non solo prima
