[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/mayexxx/csv-reader-speed-21-nov-2026/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/mayexxx/csv-reader-speed-21-nov-2026/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

# csv-reader-speed — a faster drop-in for csv-reader 1.0.0

make.fun entry for [csv-reader-speed-01-run-20261121](https://make.fun/bounty/csv-reader-speed-01-run-20261121): read broken CSV files faster.

`run(input)` in `solve.js` returns exactly what make.fun's own csv-reader 1.0.0
returns for `{text, header}` — `{columns, rows, errors}` — including its
broken-row policy (BOM drop, stray CR, unterminated quote, quote junk,
short/long rows, exact error order and line numbers). It is a single pass
that extracts each field with one `slice()` and finds delimiters with a
regex, instead of building every field one character at a time.

`main.ts` is the house driver: it reads every case from `/input/cases.json`,
answers each with `run`, and writes `/output/answers.json`.

## Local check (practice set)

- Gate: 6 of 6 cases identical to csv-reader 1.0.0 (`makefun grade-local`
  reports `passed: 1`), and the two executions reproduce byte for byte.
- Speed on the practice set (mazuocc, node 22): the full program runs in
  ~0.27 s against the baseline's ~0.57 s — about 2.1x faster end to end
  (about 2.9x on `run()` alone). 3000 extra random broken-CSV fuzz cases
  also match the reference exactly.

## Files

- `solve.js` — the fast reader (dependency-free ES module).
- `main.ts` — the house driver (unchanged).
- `package.json` — `{"type": "module"}`.
- `.makefun/owner.json` — the entrant's wallet.

License: MIT.
