# Thread ID Proof of Concept (HTML/JS)

## What this is
A single-page HTML + JavaScript proof of concept to identify common thread types using:
1) a visual pre-selector (metric-looking vs imperial-looking), then
2) vernier-friendly measurement **ranges** (mm) with a tolerance model.

This is intentionally a **workshop identification aid** (low-friction, forgiving), not a machining or inspection reference.

## Files
- `index.html` – self-contained PoC (dataset embedded as JSON)
- `dataset.json` – same dataset as standalone JSON for your dev team

## Schema (high level)
```
{
  schemaVersion,
  tolerancesMm: { maleThreadOD, maleBoreID, femaleOpeningID },
  measurementDefinitions: { ... },
  systems: {
    metric: { label, visualCues, entries: [ ... ] },
    imperial: { label, visualCues, entries: [ ... ] }
  }
}
```

## Tolerance model used
- Male thread OD: ±0.3 mm
- Male bore ID: ±0.3 mm
- Female opening ID: ±0.4 mm

## Notes for the internal dev team
- Production version should match by numeric overlap between ranges rather than direct dropdown pick. Schema supports this.
- Metric path stays strictly metric.
- Imperial path keeps imperial designation but uses mm measurement ranges for verniers.