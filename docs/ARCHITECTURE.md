# Prototype architecture

## Data flow

1. `ezadc~` receives the system-default microphone.
2. `fiddle~ 2048 1 20 8` emits a fundamental estimate and up to eight partial records.
3. `partial_tracker.js` expects partial records shaped as `index frequency amplitude`, smooths frequency by median, applies an amplitude threshold, and emits normalized candidate events.
4. `allocator.js` filters candidates against the selected instrument database and chooses the lowest-cost playable voice.
5. Events are written to `bach.roll` as `addchord` messages using millisecond onsets and midicents.

## Event format

```text
candidate <partial-index> <frequency-hz> <midi-float> <midicents> <amplitude>
```

## Assignment cost

The current allocator considers:

- hard sounding-range rejection;
- penalty outside the comfortable range;
- melodic leap size;
- a strong penalty above `maxLeap`;
- minimum spacing between events on one instrument.

This is deliberately small and inspectable. Later versions can replace it with a global optimizer without changing the analysis or score layers.
