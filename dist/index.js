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
exports.__esModule = true;
var net = require("net");
var level_ts_1 = require("level-ts");
var socketio_1 = require("./socketio");
var peerhandler_1 = require("./peerhandler");
var config_1 = require("./config");
var args = process.argv.slice(2);
var peersDBPath = args[0];
var serverHostname = args[1];
var serverPort = args[2];
var mode = Number.parseInt(args[3]);
var handleConnection = function (socket, peersDB) {
    var connIO = new socketio_1.ConnectedSocketIO(socket);
    var peerHandler = new peerhandler_1.PeerHandler(connIO, peersDB, serverHostname + ":" + serverPort);
    connIO.onConnect();
    socket.on("data", function (data) { return connIO.onData(data, peerHandler); });
};
var runNode = function () { return __awaiter(void 0, void 0, void 0, function () {
    var peersDB, _i, BOOTSTRAP_PEERS_1, peer, server, _loop_1, _a, _b, peer;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                peersDB = new level_ts_1["default"](peersDBPath);
                _i = 0, BOOTSTRAP_PEERS_1 = config_1.BOOTSTRAP_PEERS;
                _c.label = 1;
            case 1:
                if (!(_i < BOOTSTRAP_PEERS_1.length)) return [3 /*break*/, 4];
                peer = BOOTSTRAP_PEERS_1[_i];
                return [4 /*yield*/, peersDB.put(peer, peer)];
            case 2:
                _c.sent();
                _c.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4:
                if (mode === 0 || mode === 1) {
                    // Run Server
                    console.log("Server starting");
                    server = net.createServer();
                    server.listen(serverPort);
                    server.on("connection", function (socket) {
                        socket.on("error", function (err) { return console.log("".concat(err)); });
                        handleConnection(socket, peersDB);
                    });
                }
                if (!(mode === 0 || mode === 2)) return [3 /*break*/, 8];
                _loop_1 = function (peer) {
                    var host;
                    var port;
                    try {
                        var lastColon = peer.lastIndexOf(":");
                        host = peer.slice(0, lastColon).trim();
                        port = Number.parseInt(peer.slice(lastColon + 1));
                        if (isNaN(port) || port < 0 || port >= 65536) {
                            throw Error("invalid port ".concat(peer.slice(lastColon + 1)));
                        }
                    }
                    catch (err) {
                        console.log("".concat(err));
                        return "continue";
                    }
                    console.log("Connecting to", peer);
                    var client = new net.Socket();
                    client.connect(port, host);
                    client.on("connect", function () { return handleConnection(client, peersDB); });
                    client.on("error", function (err) { return console.log("".concat(err)); });
                    client.on("close", function () {
                        setTimeout(function () {
                            client.connect(port, host);
                        }, 1000);
                    });
                };
                _a = 0;
                return [4 /*yield*/, peersDB.all()];
            case 5:
                _b = _c.sent();
                _c.label = 6;
            case 6:
                if (!(_a < _b.length)) return [3 /*break*/, 8];
                peer = _b[_a];
                _loop_1(peer);
                _c.label = 7;
            case 7:
                _a++;
                return [3 /*break*/, 6];
            case 8: return [2 /*return*/];
        }
    });
}); };
runNode();
