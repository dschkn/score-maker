autowatch = 1;
inlets = 1;
outlets = 3;

var database = [];
var byId = {};
var ensembleIds = [];
var recording = false;
var startTime = 0;
var lastPitch = {};
var lastEventTime = {};
var fixedDurationMs = 260;

function loadbang() {
    loadDatabase();
}

function loadDatabase() {
    var patchPath = this.patcher.filepath;
    var slash = patchPath.lastIndexOf("/");
    var path = patchPath.substring(0, slash) + "/../data/instruments.json";
    var file = new File(path, "read");
    if (!file.isopen) {
        post("Score Maker allocator: cannot open " + path + "\n");
        return;
    }

    var text = "";
    while (file.position < file.eof) {
        text += file.readline();
    }
    file.close();

    try {
        var payload = JSON.parse(text);
        database = payload.instruments || [];
        byId = {};
        var i;
        for (i = 0; i < database.length; i++) {
            byId[database[i].id] = database[i];
        }
    } catch (error) {
        post("Score Maker allocator: invalid instruments.json: " + error + "\n");
    }
}

function ensemble() {
    var ids = arrayfromargs(arguments);
    ensembleIds = [];
    var i;
    for (i = 0; i < ids.length; i++) {
        if (byId[ids[i]]) {
            ensembleIds.push(ids[i]);
        }
    }
    outlet(1, "set", "Ensemble ready: " + ensembleIds.length + " instrument(s)");
}

function record(value) {
    recording = parseInt(value, 10) !== 0;
    if (recording) {
        startTime = new Date().getTime();
        lastPitch = {};
        lastEventTime = {};
        outlet(1, "set", "Recording live spectral events");
    } else {
        outlet(1, "set", "Recording stopped");
    }
}

function duration(value) {
    fixedDurationMs = Math.max(40, parseInt(value, 10));
}

function reset() {
    lastPitch = {};
    lastEventTime = {};
    startTime = new Date().getTime();
    outlet(1, "set", "Allocator reset");
}

function candidate(index, frequency, midi, midicents, amplitude) {
    if (!recording || ensembleIds.length === 0) {
        return;
    }

    var now = new Date().getTime();
    var bestVoice = -1;
    var bestInstrument = null;
    var bestCost = 1e12;
    var i;

    for (i = 0; i < ensembleIds.length; i++) {
        var instrument = byId[ensembleIds[i]];
        if (!instrument) {
            continue;
        }

        var low = instrument.soundingRange[0];
        var high = instrument.soundingRange[1];
        if (midi < low || midi > high) {
            continue;
        }

        var comfortableLow = instrument.comfortableRange[0];
        var comfortableHigh = instrument.comfortableRange[1];
        var cost = 0.0;

        if (midi < comfortableLow) {
            cost += (comfortableLow - midi) * 2.5;
        } else if (midi > comfortableHigh) {
            cost += (midi - comfortableHigh) * 2.5;
        }

        if (lastPitch[i] !== undefined) {
            var leap = Math.abs(midi - lastPitch[i]);
            cost += leap * 0.35;
            if (leap > instrument.maxLeap) {
                cost += 100.0 + leap * 2.0;
            }
        }

        var elapsed = now - (lastEventTime[i] || 0);
        if (elapsed < instrument.minDurationMs) {
            cost += 80.0;
        }

        cost += i * 0.01;

        if (cost < bestCost) {
            bestCost = cost;
            bestVoice = i + 1;
            bestInstrument = instrument;
        }
    }

    if (bestVoice < 1 || !bestInstrument) {
        outlet(1, "set", "No selected instrument can play MIDI " + Number(midi).toFixed(2));
        return;
    }

    var onset = Math.max(0, now - startTime);
    var voiceIndex = bestVoice - 1;
    var durationMs = Math.max(fixedDurationMs, bestInstrument.minDurationMs);
    var velocity = amplitudeToVelocity(amplitude);

    lastPitch[voiceIndex] = midi;
    lastEventTime[voiceIndex] = now;

    outlet(0, ["addchord", bestVoice, "[", onset, "[", midicents, durationMs, velocity, "]", "]"]);
    outlet(1, "set", bestInstrument.name + "  MIDI " + Number(midi).toFixed(2));
    outlet(2, "allocation", index, bestVoice, bestInstrument.id, midi, bestCost);
}

function amplitudeToVelocity(amplitude) {
    var normalized = (Number(amplitude) - 20.0) / 50.0;
    normalized = Math.max(0.0, Math.min(1.0, normalized));
    return Math.round(30 + normalized * 90);
}
