# Fahrerverteilung: Verfahrensvergleich

```
Szenario       : real
Zeitraum       : 2025-06-19 bis 2026-08-11 (143 Fahrten)
Etappengewichte: w1=1, w2=1
Teilnehmer     : Mike(Stopp 1), Martin(Stopp 1), Falko(Stopp 1), Falk(Stopp 2)
  Mike dabei      :  89 von 143 (62 %)
  Martin dabei    :  92 von 143 (64 %)
  Falko dabei     : 108 von 143 (76 %)
  Falk dabei      :  55 von 143 (38 %)
Besetzungen    : 11 verschiedene Kombinationen
```

## Massstab A: Pflicht teilen sich die Fahrberechtigten der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Historisch (was wirklich passiert ist) | Mike | 1 | 42.8 | 43 | +0.2 |
| Historisch (was wirklich passiert ist) | Martin | 1 | 46.3 | 46 | -0.3 |
| Historisch (was wirklich passiert ist) | Falko | 1 | 53.8 | 54 | +0.2 |
| Historisch (was wirklich passiert ist) | Mike | 2 | 34.5 | 35 | +0.5 |
| Historisch (was wirklich passiert ist) | Martin | 2 | 36.0 | 36 | +0.0 |
| Historisch (was wirklich passiert ist) | Falko | 2 | 45.0 | 45 | +0.0 |
| Historisch (was wirklich passiert ist) | Falk | 2 | 27.5 | 27 | -0.5 |
| Buckets (Ist-Algorithmus) | Mike | 1 | 42.8 | 43 | +0.2 |
| Buckets (Ist-Algorithmus) | Martin | 1 | 46.3 | 46 | -0.3 |
| Buckets (Ist-Algorithmus) | Falko | 1 | 53.8 | 54 | +0.2 |
| Buckets (Ist-Algorithmus) | Mike | 2 | 35.5 | 36 | +0.5 |
| Buckets (Ist-Algorithmus) | Martin | 2 | 36.5 | 36 | -0.5 |
| Buckets (Ist-Algorithmus) | Falko | 2 | 43.5 | 43 | -0.5 |
| Buckets (Ist-Algorithmus) | Falk | 2 | 27.5 | 28 | +0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | Mike | 1 | 42.8 | 43 | +0.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Martin | 1 | 46.3 | 46 | -0.3 |
| Saldo / Pflicht bei den Fahrberechtigten | Falko | 1 | 53.8 | 54 | +0.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Mike | 2 | 35.0 | 35 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | Martin | 2 | 37.0 | 37 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | Falko | 2 | 43.5 | 43 | -0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | Falk | 2 | 27.5 | 28 | +0.5 |
| Saldo / Pflicht bei allen Mitfahrern | Mike | 1 | 42.8 | 43 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Martin | 1 | 46.3 | 46 | -0.3 |
| Saldo / Pflicht bei allen Mitfahrern | Falko | 1 | 53.8 | 54 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Mike | 2 | 35.0 | 37 | +2.0 |
| Saldo / Pflicht bei allen Mitfahrern | Martin | 2 | 37.0 | 38 | +1.0 |
| Saldo / Pflicht bei allen Mitfahrern | Falko | 2 | 43.5 | 46 | +2.5 |
| Saldo / Pflicht bei allen Mitfahrern | Falk | 2 | 27.5 | 22 | -5.5 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Historisch (was wirklich passiert ist) | 0.50 | 1.00 |
| Buckets (Ist-Algorithmus) | 0.50 | 1.00 |
| Saldo / Pflicht bei den Fahrberechtigten | 0.50 | 1.00 |
| Saldo / Pflicht bei allen Mitfahrern | 0.50 | 8.00 |

## Massstab B: Pflicht teilen sich alle Mitfahrer der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Historisch (was wirklich passiert ist) | Mike | 1 | 42.8 | 43 | +0.2 |
| Historisch (was wirklich passiert ist) | Martin | 1 | 46.3 | 46 | -0.3 |
| Historisch (was wirklich passiert ist) | Falko | 1 | 53.8 | 54 | +0.2 |
| Historisch (was wirklich passiert ist) | Mike | 2 | 37.2 | 35 | -2.2 |
| Historisch (was wirklich passiert ist) | Martin | 2 | 38.2 | 36 | -2.2 |
| Historisch (was wirklich passiert ist) | Falko | 2 | 45.8 | 45 | -0.8 |
| Historisch (was wirklich passiert ist) | Falk | 2 | 21.8 | 27 | +5.2 |
| Buckets (Ist-Algorithmus) | Mike | 1 | 42.8 | 43 | +0.2 |
| Buckets (Ist-Algorithmus) | Martin | 1 | 46.3 | 46 | -0.3 |
| Buckets (Ist-Algorithmus) | Falko | 1 | 53.8 | 54 | +0.2 |
| Buckets (Ist-Algorithmus) | Mike | 2 | 37.2 | 36 | -1.2 |
| Buckets (Ist-Algorithmus) | Martin | 2 | 38.2 | 36 | -2.2 |
| Buckets (Ist-Algorithmus) | Falko | 2 | 45.8 | 43 | -2.8 |
| Buckets (Ist-Algorithmus) | Falk | 2 | 21.8 | 28 | +6.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Mike | 1 | 42.8 | 43 | +0.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Martin | 1 | 46.3 | 46 | -0.3 |
| Saldo / Pflicht bei den Fahrberechtigten | Falko | 1 | 53.8 | 54 | +0.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Mike | 2 | 37.2 | 35 | -2.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Martin | 2 | 38.2 | 37 | -1.2 |
| Saldo / Pflicht bei den Fahrberechtigten | Falko | 2 | 45.8 | 43 | -2.8 |
| Saldo / Pflicht bei den Fahrberechtigten | Falk | 2 | 21.8 | 28 | +6.2 |
| Saldo / Pflicht bei allen Mitfahrern | Mike | 1 | 42.8 | 43 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Martin | 1 | 46.3 | 46 | -0.3 |
| Saldo / Pflicht bei allen Mitfahrern | Falko | 1 | 53.8 | 54 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Mike | 2 | 37.2 | 37 | -0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Martin | 2 | 38.2 | 38 | -0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Falko | 2 | 45.8 | 46 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | Falk | 2 | 21.8 | 22 | +0.2 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Historisch (was wirklich passiert ist) | 0.50 | 7.33 |
| Buckets (Ist-Algorithmus) | 0.50 | 9.00 |
| Saldo / Pflicht bei den Fahrberechtigten | 0.50 | 9.00 |
| Saldo / Pflicht bei allen Mitfahrern | 0.50 | 0.33 |

## Fahrten je Person

| Verfahren | Mike | Martin | Falko | Falk |
|---|---|---|---|---|
| Historisch (was wirklich passiert ist) - Etappe 1 | 43 | 46 | 54 | 0 |
| Buckets (Ist-Algorithmus) - Etappe 1 | 43 | 46 | 54 | 0 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 1 | 43 | 46 | 54 | 0 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 1 | 43 | 46 | 54 | 0 |
| Historisch (was wirklich passiert ist) - Etappe 2 | 35 | 36 | 45 | 27 |
| Buckets (Ist-Algorithmus) - Etappe 2 | 36 | 36 | 43 | 28 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 2 | 35 | 37 | 43 | 28 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 2 | 37 | 38 | 46 | 22 |

Partial-Match-Fallback im Bucket-Verfahren: 4x benutzt, davon 0x mehrdeutig.


---

# Fahrerverteilung: Verfahrensvergleich

```
Szenario       : basis
Zeitraum       : 2026-08-17 bis 2026-10-09 (40 Fahrten)
Etappengewichte: w1=1, w2=1
Teilnehmer     : A1(Stopp 1), A2(Stopp 1), A3(Stopp 1), B1(Stopp 2)
  A1 dabei        :  40 von 40 (100 %)
  A2 dabei        :  40 von 40 (100 %)
  A3 dabei        :  30 von 40 (75 %)
  B1 dabei        :  20 von 40 (50 %)
Besetzungen    : 4 verschiedene Kombinationen
```

## Massstab A: Pflicht teilen sich die Fahrberechtigten der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Buckets (Ist-Algorithmus) | A1 | 1 | 15.0 | 15 | -0.0 |
| Buckets (Ist-Algorithmus) | A2 | 1 | 15.0 | 15 | -0.0 |
| Buckets (Ist-Algorithmus) | A3 | 1 | 10.0 | 10 | +0.0 |
| Buckets (Ist-Algorithmus) | A1 | 2 | 12.0 | 12 | +0.0 |
| Buckets (Ist-Algorithmus) | A2 | 2 | 10.5 | 11 | +0.5 |
| Buckets (Ist-Algorithmus) | A3 | 2 | 7.5 | 8 | +0.5 |
| Buckets (Ist-Algorithmus) | B1 | 2 | 10.0 | 9 | -1.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 1 | 10.0 | 10 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 2 | 12.0 | 12 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 2 | 10.5 | 11 | +0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 2 | 7.5 | 7 | -0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | B1 | 2 | 10.0 | 10 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 1 | 10.0 | 10 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 2 | 12.0 | 13 | +1.0 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 2 | 10.5 | 13 | +2.5 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 2 | 7.5 | 8 | +0.5 |
| Saldo / Pflicht bei allen Mitfahrern | B1 | 2 | 10.0 | 6 | -4.0 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Buckets (Ist-Algorithmus) | 0.00 | 1.50 |
| Saldo / Pflicht bei den Fahrberechtigten | 0.00 | 1.00 |
| Saldo / Pflicht bei allen Mitfahrern | 0.00 | 6.50 |

## Massstab B: Pflicht teilen sich alle Mitfahrer der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Buckets (Ist-Algorithmus) | A1 | 1 | 15.0 | 15 | -0.0 |
| Buckets (Ist-Algorithmus) | A2 | 1 | 15.0 | 15 | -0.0 |
| Buckets (Ist-Algorithmus) | A3 | 1 | 10.0 | 10 | +0.0 |
| Buckets (Ist-Algorithmus) | A1 | 2 | 12.9 | 12 | -0.9 |
| Buckets (Ist-Algorithmus) | A2 | 2 | 12.9 | 11 | -1.9 |
| Buckets (Ist-Algorithmus) | A3 | 2 | 8.8 | 8 | -0.8 |
| Buckets (Ist-Algorithmus) | B1 | 2 | 5.4 | 9 | +3.6 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 1 | 10.0 | 10 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 2 | 12.9 | 12 | -0.9 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 2 | 12.9 | 11 | -1.9 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 2 | 8.8 | 7 | -1.8 |
| Saldo / Pflicht bei den Fahrberechtigten | B1 | 2 | 5.4 | 10 | +4.6 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 1 | 15.0 | 15 | -0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 1 | 10.0 | 10 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 2 | 12.9 | 13 | +0.1 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 2 | 12.9 | 13 | +0.1 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 2 | 8.8 | 8 | -0.8 |
| Saldo / Pflicht bei allen Mitfahrern | B1 | 2 | 5.4 | 6 | +0.6 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Buckets (Ist-Algorithmus) | 0.00 | 5.50 |
| Saldo / Pflicht bei den Fahrberechtigten | 0.00 | 6.50 |
| Saldo / Pflicht bei allen Mitfahrern | 0.00 | 1.33 |

## Fahrten je Person

| Verfahren | A1 | A2 | A3 | B1 |
|---|---|---|---|---|
| Buckets (Ist-Algorithmus) - Etappe 1 | 15 | 15 | 10 | 0 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 1 | 15 | 15 | 10 | 0 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 1 | 15 | 15 | 10 | 0 |
| Buckets (Ist-Algorithmus) - Etappe 2 | 12 | 11 | 8 | 9 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 2 | 12 | 11 | 7 | 10 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 2 | 13 | 13 | 8 | 6 |

Partial-Match-Fallback im Bucket-Verfahren: 1x benutzt, davon 0x mehrdeutig.


---

# Fahrerverteilung: Verfahrensvergleich

```
Szenario       : stress
Zeitraum       : 2026-08-17 bis 2026-12-04 (80 Fahrten)
Etappengewichte: w1=1, w2=1
Teilnehmer     : A1(Stopp 1), A2(Stopp 1), A3(Stopp 1), A4(Stopp 1), B1(Stopp 2), B2(Stopp 2)
  A1 dabei        :  54 von 80 (68 %)
  A2 dabei        :  63 von 80 (79 %)
  A3 dabei        :  61 von 80 (76 %)
  A4 dabei        :  64 von 80 (80 %)
  B1 dabei        :  63 von 80 (79 %)
  B2 dabei        :  60 von 80 (75 %)
Besetzungen    : 29 verschiedene Kombinationen
```

## Massstab A: Pflicht teilen sich die Fahrberechtigten der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Buckets (Ist-Algorithmus) | A1 | 1 | 17.5 | 18 | +0.5 |
| Buckets (Ist-Algorithmus) | A2 | 1 | 21.0 | 21 | +0.0 |
| Buckets (Ist-Algorithmus) | A3 | 1 | 20.0 | 20 | +0.0 |
| Buckets (Ist-Algorithmus) | A4 | 1 | 21.5 | 21 | -0.5 |
| Buckets (Ist-Algorithmus) | A1 | 2 | 7.0 | 7 | +0.0 |
| Buckets (Ist-Algorithmus) | A2 | 2 | 10.2 | 11 | +0.8 |
| Buckets (Ist-Algorithmus) | A3 | 2 | 8.7 | 9 | +0.3 |
| Buckets (Ist-Algorithmus) | A4 | 2 | 8.7 | 9 | +0.3 |
| Buckets (Ist-Algorithmus) | B1 | 2 | 23.5 | 24 | +0.5 |
| Buckets (Ist-Algorithmus) | B2 | 2 | 22.0 | 20 | -2.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 1 | 17.5 | 18 | +0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 1 | 21.0 | 21 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 1 | 20.0 | 20 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A4 | 1 | 21.5 | 21 | -0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 2 | 7.8 | 7 | -0.8 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 2 | 9.5 | 10 | +0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 2 | 8.3 | 9 | +0.7 |
| Saldo / Pflicht bei den Fahrberechtigten | A4 | 2 | 8.8 | 9 | +0.2 |
| Saldo / Pflicht bei den Fahrberechtigten | B1 | 2 | 23.5 | 23 | -0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | B2 | 2 | 22.0 | 22 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 1 | 17.5 | 18 | +0.5 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 1 | 21.0 | 21 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 1 | 20.0 | 20 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A4 | 1 | 21.5 | 21 | -0.5 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 2 | 7.8 | 12 | +4.2 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 2 | 9.5 | 14 | +4.5 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 2 | 8.3 | 13 | +4.7 |
| Saldo / Pflicht bei allen Mitfahrern | A4 | 2 | 8.8 | 14 | +5.2 |
| Saldo / Pflicht bei allen Mitfahrern | B1 | 2 | 23.5 | 14 | -9.5 |
| Saldo / Pflicht bei allen Mitfahrern | B2 | 2 | 22.0 | 13 | -9.0 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Buckets (Ist-Algorithmus) | 1.00 | 2.83 |
| Saldo / Pflicht bei den Fahrberechtigten | 1.00 | 1.50 |
| Saldo / Pflicht bei allen Mitfahrern | 1.00 | 14.67 |

## Massstab B: Pflicht teilen sich alle Mitfahrer der Etappe

| Verfahren | Person | Et. | Soll | Ist | Delta |
|---|---|---|---|---|---|
| Buckets (Ist-Algorithmus) | A1 | 1 | 17.5 | 18 | +0.5 |
| Buckets (Ist-Algorithmus) | A2 | 1 | 21.0 | 21 | +0.0 |
| Buckets (Ist-Algorithmus) | A3 | 1 | 20.0 | 20 | +0.0 |
| Buckets (Ist-Algorithmus) | A4 | 1 | 21.5 | 21 | -0.5 |
| Buckets (Ist-Algorithmus) | A1 | 2 | 11.6 | 7 | -4.6 |
| Buckets (Ist-Algorithmus) | A2 | 2 | 13.8 | 11 | -2.8 |
| Buckets (Ist-Algorithmus) | A3 | 2 | 13.3 | 9 | -4.3 |
| Buckets (Ist-Algorithmus) | A4 | 2 | 14.6 | 9 | -5.6 |
| Buckets (Ist-Algorithmus) | B1 | 2 | 13.7 | 24 | +10.3 |
| Buckets (Ist-Algorithmus) | B2 | 2 | 12.9 | 20 | +7.1 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 1 | 17.5 | 18 | +0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 1 | 21.0 | 21 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 1 | 20.0 | 20 | +0.0 |
| Saldo / Pflicht bei den Fahrberechtigten | A4 | 1 | 21.5 | 21 | -0.5 |
| Saldo / Pflicht bei den Fahrberechtigten | A1 | 2 | 11.6 | 7 | -4.6 |
| Saldo / Pflicht bei den Fahrberechtigten | A2 | 2 | 13.8 | 10 | -3.8 |
| Saldo / Pflicht bei den Fahrberechtigten | A3 | 2 | 13.3 | 9 | -4.3 |
| Saldo / Pflicht bei den Fahrberechtigten | A4 | 2 | 14.6 | 9 | -5.6 |
| Saldo / Pflicht bei den Fahrberechtigten | B1 | 2 | 13.7 | 23 | +9.3 |
| Saldo / Pflicht bei den Fahrberechtigten | B2 | 2 | 12.9 | 22 | +9.1 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 1 | 17.5 | 18 | +0.5 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 1 | 21.0 | 21 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 1 | 20.0 | 20 | +0.0 |
| Saldo / Pflicht bei allen Mitfahrern | A4 | 1 | 21.5 | 21 | -0.5 |
| Saldo / Pflicht bei allen Mitfahrern | A1 | 2 | 11.6 | 12 | +0.4 |
| Saldo / Pflicht bei allen Mitfahrern | A2 | 2 | 13.8 | 14 | +0.2 |
| Saldo / Pflicht bei allen Mitfahrern | A3 | 2 | 13.3 | 13 | -0.3 |
| Saldo / Pflicht bei allen Mitfahrern | A4 | 2 | 14.6 | 14 | -0.6 |
| Saldo / Pflicht bei allen Mitfahrern | B1 | 2 | 13.7 | 14 | +0.3 |
| Saldo / Pflicht bei allen Mitfahrern | B2 | 2 | 12.9 | 13 | +0.1 |

Spreizung (max-min Delta) je Etappe:
| Verfahren | Etappe 1 | Etappe 2 |
|---|---|---|
| Buckets (Ist-Algorithmus) | 1.00 | 15.92 |
| Saldo / Pflicht bei den Fahrberechtigten | 1.00 | 14.92 |
| Saldo / Pflicht bei allen Mitfahrern | 1.00 | 1.02 |

## Fahrten je Person

| Verfahren | A1 | A2 | A3 | A4 | B1 | B2 |
|---|---|---|---|---|---|---|
| Buckets (Ist-Algorithmus) - Etappe 1 | 18 | 21 | 20 | 21 | 0 | 0 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 1 | 18 | 21 | 20 | 21 | 0 | 0 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 1 | 18 | 21 | 20 | 21 | 0 | 0 |
| Buckets (Ist-Algorithmus) - Etappe 2 | 7 | 11 | 9 | 9 | 24 | 20 |
| Saldo / Pflicht bei den Fahrberechtigten - Etappe 2 | 7 | 10 | 9 | 9 | 23 | 22 |
| Saldo / Pflicht bei allen Mitfahrern - Etappe 2 | 12 | 14 | 13 | 14 | 14 | 13 |

Partial-Match-Fallback im Bucket-Verfahren: 13x benutzt, davon 8x mehrdeutig.


---

# Ein-Schritt-Prognose gegen die echte Historie

Zustand jeweils nur aus den echten Fahrten 1..t-1 aufgebaut, danach gefragt:
haette das Verfahren denselben Fahrer vorgeschlagen wie eingetragen?

```

### Zeitraum bis 2025-07-16
  Buckets (Ist-Algorithmus)        Et.1   4/  6 =  67 %   Et.2   4/  9 =  44 %
  Saldo / Pflicht Fahrberechtigte  Et.1   4/  6 =  67 %   Et.2   4/  9 =  44 %
  Saldo / Pflicht Mitfahrer        Et.1   4/  6 =  67 %   Et.2   4/  9 =  44 %

### Zeitraum ab 2025-07-16
  Buckets (Ist-Algorithmus)        Et.1 104/112 =  93 %   Et.2  40/ 46 =  87 %
  Saldo / Pflicht Fahrberechtigte  Et.1  87/112 =  78 %   Et.2  36/ 46 =  78 %
  Saldo / Pflicht Mitfahrer        Et.1  87/112 =  78 %   Et.2  25/ 46 =  54 %

Fahrten gesamt: 143
davon ohne Wahlmoeglichkeit: Etappe 1 25x, Etappe 2 88x (nur ein Kandidat)

Verfahren                        Etappe 1        Etappe 2
------------------------------- --------------  --------------
Buckets (Ist-Algorithmus)       108/118 =  91.5 %  44/55 =  80.0 %
Saldo / Pflicht Fahrberechtigte  91/118 =  77.1 %  40/55 =  72.7 %
Saldo / Pflicht Mitfahrer        91/118 =  77.1 %  29/55 =  52.7 %

Partial-Match-Fallback: 4x

--- Abweichungen des Bucket-Verfahrens auf Etappe 1 ---
  2025-06-19  anwesend Mike,Martin,Falk  ->  historisch Martin, Algorithmus Mike
  2025-07-15  anwesend Mike,Martin,Falko  ->  historisch Falko, Algorithmus Mike
  2025-08-06  anwesend Martin,Falko  ->  historisch Martin, Algorithmus Falko
  2026-02-24  anwesend Mike,Martin,Falko  ->  historisch Mike, Algorithmus Falko
  2026-05-19  anwesend Martin,Falko  ->  historisch Falko, Algorithmus Martin
  2026-05-21  anwesend Mike,Falko  ->  historisch Mike, Algorithmus Falko
  2026-05-27  anwesend Mike,Martin,Falk,Falko  ->  historisch Martin, Algorithmus Mike
  2026-06-16  anwesend Mike,Falko  ->  historisch Mike, Algorithmus Falko
  2026-06-18  anwesend Mike,Martin,Falko  ->  historisch Martin, Algorithmus Mike
  2026-06-19  anwesend Martin,Falko  ->  historisch Falko, Algorithmus Martin

--- Abweichungen des Bucket-Verfahrens auf Etappe 2 (bei echtem Fahrer A) ---
  2025-06-19  anwesend Mike,Martin,Falk  A=Martin  ->  historisch Falk, Algorithmus Martin
  2025-06-24  anwesend Mike,Martin,Falk  A=Mike  ->  historisch Falk, Algorithmus Mike
  2025-07-08  anwesend Mike,Martin,Falk  A=Mike  ->  historisch Falk, Algorithmus Mike
  2025-07-09  anwesend Mike,Martin,Falk  A=Martin  ->  historisch Falk, Algorithmus Martin
  2025-07-14  anwesend Falk,Falko  A=Falko  ->  historisch Falk, Algorithmus Falko
  2025-07-17  anwesend Mike,Falk,Falko  A=Mike  ->  historisch Mike, Algorithmus Falk
  2025-09-03  anwesend Mike,Martin,Falk,Falko  A=Mike  ->  historisch Falk, Algorithmus Mike
  2025-11-26  anwesend Martin,Falk  A=Martin  ->  historisch Martin, Algorithmus Falk
  2026-05-27  anwesend Mike,Martin,Falk,Falko  A=Martin  ->  historisch Martin, Algorithmus Falk
  2026-06-04  anwesend Mike,Falk,Falko  A=Mike  ->  historisch Mike, Algorithmus Falk
  2026-06-29  anwesend Martin,Falk  A=Martin  ->  historisch Falk, Algorithmus Martin
```

---

# Selbstkorrektur nach manuellen Eingriffen

```
Anwesenheitsfolge: 143 echte Fahrten, 200 Durchlaeufe je Stufe
Gemessen: Spreizung max-min von (Ist - Soll) am Ende des Zeitraums.
Kleiner ist besser. Bleibt der Wert bei steigendem p flach, faengt sich das Verfahren selbst.

Buckets (Ist-Algorithmus)
  Eingriffe   Etappe 1 (Mittel / schlechtester)   Etappe 2 (Mittel / schlechtester)
    0 %          0.50 /     0.50              1.00 /     1.00
   10 %          1.47 /     5.50              1.25 /     4.00
   25 %          2.43 /     7.00              1.81 /     5.50
   50 %          8.49 /    22.50              5.96 /    17.50

Saldo / Pflicht Fahrberechtigte
  Eingriffe   Etappe 1 (Mittel / schlechtester)   Etappe 2 (Mittel / schlechtester)
    0 %          0.50 /     0.50              1.00 /     1.00
   10 %          0.78 /     2.50              1.19 /     3.50
   25 %          1.49 /     5.50              1.86 /     4.00
   50 %          6.59 /    19.00              5.85 /    17.50

Saldo / Pflicht Mitfahrer
  Eingriffe   Etappe 1 (Mittel / schlechtester)   Etappe 2 (Mittel / schlechtester)
    0 %          0.50 /     0.50              0.33 /     0.33
   10 %          0.78 /     2.50              1.46 /     5.00
   25 %          1.49 /     5.50              2.93 /     8.00
   50 %          6.59 /    19.00             11.91 /    27.33

Zufall (Referenz: keinerlei Steuerung)
  Eingriffe   Etappe 1 (Mittel / schlechtester)   Etappe 2 (Mittel / schlechtester)
  100 %         68.70 /    78.50             42.01 /    43.50

------------------------------------------------------------------------
Erholung: die ersten 20 Fahrten faehrt Etappe 1 erzwungen immer Mike.
Danach laeuft das Verfahren frei. Wie viele Fahrten bis die Bilanz wieder <= 1 ist?

  Buckets (Ist-Algorithmus)          111 Fahrten   (Restabweichung am Ende 0.50)
  Saldo / Pflicht Fahrberechtigte     24 Fahrten   (Restabweichung am Ende 0.50)
  Saldo / Pflicht Mitfahrer           24 Fahrten   (Restabweichung am Ende 0.50)
```
