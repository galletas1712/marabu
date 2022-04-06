"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
exports.__esModule = true;
var net = require("net");
var messages_1 = require("./messages");
var json_canonicalize_1 = require("json-canonicalize");
var level_ts_1 = require("level-ts");
var semver = require("semver");
var PORT = 18018;
var MYSELF = "45.77.189.193:" + PORT.toString();
var BOOTSTRAP_PEERS = [
    "149.28.220.241:18018",
    "149.28.204.235:18018",
    "139.162.130.195:18018",
];
var PEERS_DB = "../peers.list";
var ACCEPTABLE_VERSIONS = "0.8.x";
var ConnectedSocketIO = /** @class */ (function () {
    function ConnectedSocketIO(socket) {
        this.socket = socket;
        this.buffer = "";
    }
    ConnectedSocketIO.prototype.onConnect = function () {
        this.socket.setEncoding("utf8");
        this.writeToSocket({ type: "hello" });
        this.writeToSocket({ type: "getpeers" });
    };
    ConnectedSocketIO.prototype.onData = function (data, peerHandler) {
        var tokens = data.split(/(?=[\n])|(?<=[\n])/g);
        for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
            var token = tokens_1[_i];
            this.buffer += token;
            if (token === "\n") {
                peerHandler.onMessage(this.buffer);
                this.buffer = "";
            }
        }
    };
    ConnectedSocketIO.prototype.writeToSocket = function (msg) {
        console.log("Writing:", msg);
        this.socket.write((0, json_canonicalize_1.canonicalize)(msg)); // TODO: add "\n"?
    };
    ConnectedSocketIO.prototype.disconnectWithError = function (err) {
        console.log("Disconnecting from:", this.socket.address);
        this.writeToSocket({ type: "error", error: err });
        this.socket.destroy();
    };
    return ConnectedSocketIO;
}());
var PeerHandler = /** @class */ (function () {
    function PeerHandler(connIO, peersDB) {
        this.connIO = connIO;
        this.finishedHandshake = false;
        this.peersDB = peersDB;
    }
    PeerHandler.prototype.onMessage = function (msgStr) {
        var message = this.validateMessage(msgStr);
        if (messages_1.MessageRecord.guard(message)) {
            this.handleMessage(message);
        }
    };
    PeerHandler.prototype.validateMessage = function (msgStr) {
        var deserialized;
        try {
            deserialized = JSON.parse(msgStr);
        }
        catch (e) {
            this.connIO.disconnectWithError("Unable to parse message JSON: ".concat(e));
            return undefined;
        }
        var message;
        try {
            message = messages_1.MessageRecord.check(deserialized);
        }
        catch (e) {
            this.connIO.disconnectWithError("Invalid message format: ".concat(e));
            return undefined;
        }
        if (!this.finishedHandshake && message.type !== "hello") {
            this.connIO.disconnectWithError("Other message sent before hello message");
            return undefined;
        }
        return message;
    };
    PeerHandler.prototype.handleMessage = function (msg) {
        messages_1.MessageRecord.match(this.onHelloMessage, this.echo, this.onGetPeersMessage, this.onPeersMessage, this.echo, this.echo, this.echo, this.echo, this.echo, this.echo, this.echo)(msg);
    };
    PeerHandler.prototype.onHelloMessage = function (msg) {
        if (!semver.satisfies(msg.version, ACCEPTABLE_VERSIONS)) {
            this.connIO.disconnectWithError("version not acceptable");
        }
        this.finishedHandshake = true;
    };
    PeerHandler.prototype.onGetPeersMessage = function (msg) {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function () {
            var knownPeers, iterator, iterator_1, iterator_1_1, key, e_1_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        knownPeers = [MYSELF];
                        iterator = this.peersDB.iterate({});
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 6, 7, 12]);
                        iterator_1 = __asyncValues(iterator);
                        _b.label = 2;
                    case 2: return [4 /*yield*/, iterator_1.next()];
                    case 3:
                        if (!(iterator_1_1 = _b.sent(), !iterator_1_1.done)) return [3 /*break*/, 5];
                        key = iterator_1_1.value.key;
                        knownPeers.push(key);
                        _b.label = 4;
                    case 4: return [3 /*break*/, 2];
                    case 5: return [3 /*break*/, 12];
                    case 6:
                        e_1_1 = _b.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 12];
                    case 7:
                        _b.trys.push([7, , 10, 11]);
                        if (!(iterator_1_1 && !iterator_1_1.done && (_a = iterator_1["return"]))) return [3 /*break*/, 9];
                        return [4 /*yield*/, _a.call(iterator_1)];
                    case 8:
                        _b.sent();
                        _b.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 11: return [7 /*endfinally*/];
                    case 12: return [4 /*yield*/, iterator.end()];
                    case 13:
                        _b.sent();
                        this.connIO.writeToSocket({ type: "peers", peers: knownPeers });
                        return [2 /*return*/];
                }
            });
        });
    };
    PeerHandler.prototype.onPeersMessage = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(msg.peers.map(function (peer) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, this.peersDB.exists(peer)];
                                    case 1:
                                        if (!!(_a.sent())) return [3 /*break*/, 3];
                                        return [4 /*yield*/, this.peersDB.put(peer, false)];
                                    case 2:
                                        _a.sent(); // Peer is not connected because it's not known
                                        _a.label = 3;
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PeerHandler.prototype.echo = function (msg) {
        console.log("Received ".concat(msg.type, " message but not doing anything."));
    };
    return PeerHandler;
}());
var handleSocket = function (socket, peersDB) {
    var connIO = new ConnectedSocketIO(socket);
    var peerHandler = new PeerHandler(connIO, peersDB);
    socket.on("ready", connIO.onConnect);
    socket.on("data", function (data) { return connIO.onData(data, peerHandler); });
};
var runNode = function () {
    var peersDB = new level_ts_1["default"](PEERS_DB);
    // Run Server
    var server = net.createServer();
    server.listen(PORT);
    server.on("connection", handleSocket);
    var _loop_1 = function (peer) {
        var lastColon = peer.lastIndexOf(":");
        var host = peer.slice(0, lastColon);
        var port = Number(peer.slice(lastColon + 1));
        var client = new net.Socket();
        client.connect(port, host);
        client.on("connect", function () { return handleSocket(client, peersDB); });
    };
    // Run client
    // TODO: read from database and connect to peers
    for (var _i = 0, BOOTSTRAP_PEERS_1 = BOOTSTRAP_PEERS; _i < BOOTSTRAP_PEERS_1.length; _i++) {
        var peer = BOOTSTRAP_PEERS_1[_i];
        _loop_1(peer);
    }
};
runNode();
