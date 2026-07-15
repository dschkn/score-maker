# Score Maker

**Score Maker** is an experimental Max/MSP system that turns live spectral information from a microphone into a playable instrumental score.

This repository now contains a clean first prototype. The original 2024 experimental patches remain available in the Git history, but local screenshots, personal audio files, absolute file paths, and obsolete experiments have been removed from the working tree.

## Prototype scope

The current prototype provides:

- live input from the system-default audio device, intended for the built-in MacBook microphone;
- partial extraction with `fiddle~`;
- median smoothing and basic pitch-event stabilization;
- an instrument menu loaded from `data/instruments.json`;
- a configurable ensemble of up to eight instruments;
- range-aware assignment with a simple continuity cost;
- live notation in `bach.roll`;
- quarter-tone pitch resolution through midicents.

Orchidea is intentionally not part of this first prototype. It will be evaluated later as an optional orchestration engine after the direct spectral pipeline is stable.

## Requirements

- Max 8.5 or newer
- `bach` package
- `fiddle~` external

Install external packages before opening the patch. The prototype does not bundle third-party binaries.

## Run

1. Open `patchers/ScoreMaker.maxpat`.
2. In Max Audio Status, select **MacBook Microphone** or another desired input as the system input device.
3. Click the `ezadc~` speaker icon to enable DSP.
4. Choose an instrument from the menu and click **Add instrument**, or keep the default ensemble.
5. Click **Record**.
6. Speak, sing, whistle, or play a sound into the microphone.
7. Click **Clear score** to erase the current `bach.roll`.

## Architecture

```text
microphone
  -> fiddle~
  -> partial_tracker.js
  -> allocator.js
  -> bach.roll
```

- `javascript/partial_tracker.js` smooths partial frequencies and suppresses very fast repeated events.
- `javascript/instrument_db.js` loads the instrument menu and updates score voice names and clefs.
- `javascript/allocator.js` selects a playable instrument using range, register comfort, continuity, and minimum-event spacing.
- `data/instruments.json` is the initial editable instrument database.

## Important prototype limitations

- The patch has been statically validated as JSON and JavaScript, but live audio behavior still needs testing inside Max with the installed versions of `fiddle~` and `bach`.
- Note durations are currently fixed rather than derived from tracked note-off events.
- The allocator is greedy and does not yet solve global orchestration.
- Only `ordinario` playing is modeled.
- Transposing notation and MusicXML export are not implemented yet.
- The microphone device is selected through Max Audio Status; the patch cannot safely force a device name across different Macs.

## Next steps

1. Test and calibrate the `fiddle~` output format and amplitude threshold.
2. Add true note-on/note-off tracking and adaptive duration.
3. Improve instrument constraints and transpositions.
4. Add quantization and `bach.score` / MusicXML export.
5. Build a separate Orchidea proof of concept.
