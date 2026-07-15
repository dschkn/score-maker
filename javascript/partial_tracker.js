autowatch = 1;
inlets = 1;
outlets = 3;

var amplitudeThreshold = 20.0;
var smoothingFrames = 4;
var minimumEventGapMs = 120;
var pitchToleranceCents = 18.0;
var histories = {};
var lastEmitted = {};

function threshold(value) {
    amplitudeThreshold = Math.max(0.0, parseFloat(value));
}

function smoothing(value) {
    smoothingFrames = Math.max(1, Math.min(16, parseInt(value, 10)));
}

function minnote(value) {
    minimumEventGapMs = Math.max(20, parseInt(value, 10));
}

function tolerance(value) {
    pitchToleranceCents = Math.max(1.0, parseFloat(value));
}

function reset() {
    histories = {};
    lastEmitted = {};
    outlet(2, "set", "Tracker reset");
}

function list() {
    var values = arrayfromargs(arguments);
    parsePartial(values);
}

function anything() {
    var values = arrayfromargs(messagename, arguments);
    parsePartial(values);
}

function parsePartial(values) {
    if (values.length < 3) {
        return;
    }

    var index = parseInt(values[0], 10);
    var frequency = parseFloat(values[1]);
    var amplitude = parseFloat(values[2]);

    if (!isFinite(index) || !isFinite(frequency) || frequency <= 0 || !isFinite(amplitude)) {
        return;
    }

    if (amplitude < amplitudeThreshold) {
        return;
    }

    if (!histories[index]) {
        histories[index] = [];
    }

    histories[index].push(frequency);
    while (histories[index].length > smoothingFrames) {
        histories[index].shift();
    }

    var smoothed = median(histories[index]);
    var midi = 69.0 + 12.0 * (Math.log(smoothed / 440.0) / Math.log(2.0));
    var midicents = midi * 100.0;
    var now = new Date().getTime();
    var previous = lastEmitted[index];

    if (previous) {
        var cents = Math.abs(1200.0 * (Math.log(smoothed / previous.frequency) / Math.log(2.0)));
        if (cents < pitchToleranceCents && now - previous.time < minimumEventGapMs) {
            outlet(1, index, smoothed, midi, amplitude);
            return;
        }
    }

    lastEmitted[index] = {
        frequency: smoothed,
        time: now
    };

    outlet(0, "candidate", index, smoothed, midi, midicents, amplitude);
    outlet(1, index, smoothed, midi, amplitude);
    outlet(2, "set", "Partial " + index + "  " + smoothed.toFixed(1) + " Hz  MIDI " + midi.toFixed(2));
}

function median(values) {
    var copy = values.slice(0);
    copy.sort(function(a, b) { return a - b; });
    var middle = Math.floor(copy.length / 2);
    if (copy.length % 2) {
        return copy[middle];
    }
    return (copy[middle - 1] + copy[middle]) * 0.5;
}
