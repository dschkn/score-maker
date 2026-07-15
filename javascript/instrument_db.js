autowatch = 1;
inlets = 1;
outlets = 4;

var database = [];
var byId = {};
var selected = [];
var pendingId = "";
var maxVoices = 8;

function loadbang() {
    load();
}

function load() {
    var payload = readDatabase();
    if (!payload) {
        outlet(2, "set", "Instrument database could not be loaded.");
        return;
    }

    database = payload.instruments || [];
    byId = {};
    var i;
    for (i = 0; i < database.length; i++) {
        byId[database[i].id] = database[i];
    }

    populateMenu();
    selected = (payload.defaultEnsemble || []).slice(0, maxVoices);
    emitState();
}

function readDatabase() {
    var patchPath = this.patcher.filepath;
    var slash = patchPath.lastIndexOf("/");
    var path = patchPath.substring(0, slash) + "/../data/instruments.json";
    var file = new File(path, "read");
    if (!file.isopen) {
        post("Score Maker: cannot open " + path + "\n");
        return null;
    }

    var text = "";
    while (file.position < file.eof) {
        text += file.readline();
    }
    file.close();

    try {
        return JSON.parse(text);
    } catch (error) {
        post("Score Maker: invalid instruments.json: " + error + "\n");
        return null;
    }
}

function populateMenu() {
    outlet(0, "clear");
    var i;
    for (i = 0; i < database.length; i++) {
        outlet(0, "append", database[i].name);
    }
}

function select() {
    var label = arrayfromargs(arguments).join(" ");
    var i;
    pendingId = "";
    for (i = 0; i < database.length; i++) {
        if (database[i].name === label) {
            pendingId = database[i].id;
            break;
        }
    }
}

function add() {
    if (!pendingId || selected.length >= maxVoices) {
        return;
    }
    if (selected.indexOf(pendingId) === -1) {
        selected.push(pendingId);
        emitState();
    }
}

function remove_last() {
    if (selected.length > 0) {
        selected.pop();
        emitState();
    }
}

function clear() {
    selected = [];
    emitState();
}

function defaults() {
    var payload = readDatabase();
    if (!payload) {
        return;
    }
    selected = (payload.defaultEnsemble || []).slice(0, maxVoices);
    emitState();
}

function emitState() {
    var ids = ["ensemble"];
    var names = [];
    var clefs = [];
    var display = [];
    var i;

    for (i = 0; i < selected.length; i++) {
        ids.push(selected[i]);
        names.push(byId[selected[i]].name);
        clefs.push(byId[selected[i]].clef);
        display.push((i + 1) + ". " + byId[selected[i]].name);
    }

    while (names.length < maxVoices) {
        names.push("Unused");
        clefs.push("G");
    }

    outlet(1, ids);
    outlet(2, "set", display.length ? display.join("  |  ") : "No instruments selected");
    outlet(3, ["voicenames"].concat(names));
    outlet(3, ["clefs"].concat(clefs));
}
