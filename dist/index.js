"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var net = __importStar(require("net"));
var level_ts_1 = __importDefault(require("level-ts"));
var socketio_1 = require("./socketio");
var peerhandler_1 = require("./peerhandler");
var peermanager_1 = require("./peermanager");
var logger_1 = require("./logger");
var objectmanager_1 = require("./objectmanager");
var args = process.argv.slice(2);
var peersDBPath = args[0];
var objectDBPath = args[1];
var serverHostname = args[2];
var serverPort = args[3];
var handleConnection = function (socket, peerManager, objectManager) { return __awaiter(void 0, void 0, void 0, function () {
    var peerAddressObj, peerAddress, connIO, peerHandler;
    return __generator(this, function (_a) {
        peerAddressObj = socket.address();
        peerAddress = peerAddressObj.family + ":" + peerAddressObj.port;
        connIO = new socketio_1.ConnectedSocketIO(socket);
        peerHandler = new peerhandler_1.PeerHandler(connIO, peerManager, objectManager, serverHostname + ":" + serverPort);
        connIO.onConnect();
        peerManager.peerConnected(peerAddress, connIO);
        socket.on("data", function (data) { return connIO.onData(data, peerHandler); });
        socket.on("close", function () { return peerManager.peerDisconnected(peerAddress); });
        return [2 /*return*/];
    });
}); };
var runNode = function () { return __awaiter(void 0, void 0, void 0, function () {
    var peersDB, objectDB, peerManager, objectManager, server, _loop_1, _a, _b, peer, e_1_1;
    var e_1, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                peersDB = new level_ts_1["default"](peersDBPath);
                objectDB = new level_ts_1["default"](objectDBPath);
                peerManager = new peermanager_1.PeerManager(peersDB);
                return [4 /*yield*/, peerManager.load()];
            case 1:
                _d.sent();
                objectManager = new objectmanager_1.ObjectManager(objectDB);
                // Run Server
                logger_1.logger.debug("Server starting");
                server = net.createServer(function (socket) {
                    socket.on("error", function (err) { return logger_1.logger.warn("".concat(err)); });
                    handleConnection(socket, peerManager, objectManager);
                });
                server.listen(serverPort);
                _loop_1 = function (peer) {
                    var host = void 0;
                    var port = void 0;
                    try {
                        var lastColon = peer.lastIndexOf(":");
                        host = peer.slice(0, lastColon).trim();
                        port = Number.parseInt(peer.slice(lastColon + 1));
                        if (isNaN(port) || port < 0 || port >= 65536) {
                            throw Error("invalid port ".concat(peer.slice(lastColon + 1)));
                        }
                    }
                    catch (err) {
                        logger_1.logger.warn("".concat(err));
                        return "continue";
                    }
                    logger_1.logger.debug("Connecting to", peer);
                    var client = new net.Socket();
                    client.connect(port, host);
                    client.on("connect", function () { return handleConnection(client, peerManager, objectManager); });
                    client.on("error", function (err) { return logger_1.logger.warn("".concat(err)); });
                };
                _d.label = 2;
            case 2:
                _d.trys.push([2, 7, 8, 9]);
                return [4 /*yield*/, peerManager.knownPeers];
            case 3:
                _a = __values.apply(void 0, [_d.sent()]), _b = _a.next();
                _d.label = 4;
            case 4:
                if (!!_b.done) return [3 /*break*/, 6];
                peer = _b.value;
                _loop_1(peer);
                _d.label = 5;
            case 5:
                _b = _a.next();
                return [3 /*break*/, 4];
            case 6: return [3 /*break*/, 9];
            case 7:
                e_1_1 = _d.sent();
                e_1 = { error: e_1_1 };
                return [3 /*break*/, 9];
            case 8:
                try {
                    if (_b && !_b.done && (_c = _a["return"])) _c.call(_a);
                }
                finally { if (e_1) throw e_1.error; }
                return [7 /*endfinally*/];
            case 9: return [2 /*return*/];
        }
    });
}); };
runNode();
