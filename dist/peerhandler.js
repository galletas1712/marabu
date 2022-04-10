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
exports.PeerHandler = void 0;
var semver = require("semver");
var config_1 = require("./config");
var messages_1 = require("./messages");
var PeerHandler = /** @class */ (function () {
    function PeerHandler(connIO, peersDB, selfHostWithPort) {
        this.connIO = connIO;
        this.finishedHandshake = false;
        this.peersDB = peersDB;
        this.selfHostWithPort = selfHostWithPort;
    }
    PeerHandler.prototype.onMessage = function (msgStr) {
        console.log("Received: ".concat(msgStr));
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
        if (msg.type == "hello") {
            this.onHelloMessage(msg);
        }
        else if (msg.type == "getpeers") {
            this.onGetPeersMessage(msg);
        }
        else if (msg.type == "peers") {
            this.onPeersMessage(msg);
        }
        else {
            this.echo(msg);
        }
    };
    PeerHandler.prototype.onHelloMessage = function (msg) {
        if (!semver.satisfies(msg.version, config_1.ACCEPTABLE_VERSIONS)) {
            this.connIO.disconnectWithError("version not acceptable");
            return;
        }
        this.finishedHandshake = true;
        console.log("Completed handshake");
    };
    PeerHandler.prototype.onGetPeersMessage = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var knownPeers;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.peersDB.all()];
                    case 1:
                        knownPeers = _a.sent();
                        if (!knownPeers.includes(this.selfHostWithPort)) {
                            knownPeers.push(this.selfHostWithPort);
                        }
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
                                    case 0:
                                        if (!(peer.length > 0)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, this.peersDB.put(peer, peer)];
                                    case 1:
                                        _a.sent();
                                        _a.label = 2;
                                    case 2: return [2 /*return*/];
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
exports.PeerHandler = PeerHandler;
