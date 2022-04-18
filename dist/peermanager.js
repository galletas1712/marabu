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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
exports.PeerManager = void 0;
var logger_1 = require("./logger");
var is_valid_hostname_1 = __importDefault(require("is-valid-hostname"));
var config_1 = require("./config");
var PeerManager = /** @class */ (function () {
    function PeerManager(db) {
        this.knownPeers = new Set();
        this.connectedPeers = new Map();
        this.db = db;
    }
    PeerManager.prototype.broadcastMessage = function (msg) {
        var e_1, _a;
        try {
            for (var _b = __values(this.connectedPeers.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var peerSocket = _c.value;
                peerSocket.writeToSocket(msg);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    PeerManager.prototype.load = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _d.trys.push([0, 2, , 4]);
                        _a = this;
                        _b = Set.bind;
                        return [4 /*yield*/, this.db.get("peers")];
                    case 1:
                        _a.knownPeers = new (_b.apply(Set, [void 0, _d.sent()]))();
                        logger_1.logger.debug("Loaded known peers: ".concat(__spreadArray([], __read(this.knownPeers), false)));
                        return [3 /*break*/, 4];
                    case 2:
                        _c = _d.sent();
                        logger_1.logger.info("Initializing peers database");
                        this.knownPeers = new Set(config_1.BOOTSTRAP_PEERS);
                        return [4 /*yield*/, this.store()];
                    case 3:
                        _d.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    PeerManager.prototype.store = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.db.put("peers", __spreadArray([], __read(this.knownPeers), false))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    PeerManager.prototype.peerDiscovered = function (peer) {
        var peerParts = peer.split(":");
        if (peerParts.length != 2) {
            logger_1.logger.warn("Remote party reported knowledge of invalid peer ".concat(peer, ", which is not in the host:port format; skipping"));
            return;
        }
        var _a = __read(peerParts, 2), host = _a[0], portStr = _a[1];
        var port = +portStr;
        if (!(port >= 0 && port <= 65535)) {
            logger_1.logger.warn("Remote party reported knowledge of peer ".concat(peer, " with invalid port number ").concat(port));
            return;
        }
        if (!(0, is_valid_hostname_1["default"])(host)) {
            logger_1.logger.warn("Remote party reported knowledge of invalid peer ".concat(peer, "; skipping"));
            return;
        }
        this.knownPeers.add(peer);
        this.store(); // intentionally delayed await
    };
    PeerManager.prototype.peerConnected = function (peer, socketIOObj) {
        console.log(peer, "connected");
        this.connectedPeers.set(peer, socketIOObj);
    };
    PeerManager.prototype.peerDisconnected = function (peer) {
        console.log(peer, "disconnected");
        this.connectedPeers["delete"](peer);
    };
    return PeerManager;
}());
exports.PeerManager = PeerManager;
