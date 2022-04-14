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
exports.ObjectManager = exports.isValidHex = exports.verifySig = exports.genSignatureNulledTransaction = exports.getObjectID = void 0;
var json_canonicalize_1 = require("json-canonicalize");
var fast_sha256_1 = __importDefault(require("fast-sha256"));
var ed = __importStar(require("@noble/ed25519"));
var transactions_1 = require("./types/transactions");
var util_1 = require("./util");
var getObjectID = function (obj) {
    var encoder = new TextEncoder();
    return Buffer.from((0, fast_sha256_1["default"])(encoder.encode((0, json_canonicalize_1.canonicalize)(obj)))).toString("hex");
};
exports.getObjectID = getObjectID;
var genSignatureNulledTransaction = function (tx) {
    return {
        type: "transaction",
        inputs: tx.inputs.map(function (input) {
            return {
                outpoint: input.outpoint,
                sig: null
            };
        }),
        outputs: tx.outputs
    };
};
exports.genSignatureNulledTransaction = genSignatureNulledTransaction;
var verifySig = function (sig, msg, pubkey) { return __awaiter(void 0, void 0, void 0, function () {
    var sig_u8, pubkey_u8, encoder, msg_u8;
    return __generator(this, function (_a) {
        sig_u8 = (0, util_1.hexTou8)(sig);
        pubkey_u8 = (0, util_1.hexTou8)(pubkey);
        encoder = new TextEncoder();
        msg_u8 = encoder.encode(msg);
        return [2 /*return*/, ed.verify(sig_u8, msg_u8, pubkey_u8)];
    });
}); };
exports.verifySig = verifySig;
var isValidHex = function (hexString, expectedLength) {
    for (var i = 0; i < hexString.length; i++) {
        if (!((hexString[i] >= "0" && hexString[i] <= "9") ||
            (hexString[i] >= "a" && hexString[i] <= "f"))) {
            return false;
        }
    }
    return (hexString.length === expectedLength && hexString.toLowerCase() === hexString);
};
exports.isValidHex = isValidHex;
var ObjectManager = /** @class */ (function () {
    function ObjectManager(db) {
        this.db = db;
        this.cache = new Map();
    }
    ObjectManager.prototype.objectExists = function (objID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.cache.has(objID) || this.db.exists(objID)];
            });
        });
    };
    ObjectManager.prototype.getObject = function (objID) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (this.cache.has(objID)) {
                    return [2 /*return*/, this.cache.get(objID)];
                }
                return [2 /*return*/, this.db.get(objID)];
            });
        });
    };
    ObjectManager.prototype.storeObject = function (obj) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.cache.set((0, exports.getObjectID)(obj), obj);
                        return [4 /*yield*/, this.db.put((0, exports.getObjectID)(obj), obj)];
                    case 1:
                        _a.sent();
                        this.cache["delete"]((0, exports.getObjectID)(obj));
                        return [2 /*return*/];
                }
            });
        });
    };
    ObjectManager.prototype.validateObject = function (obj) {
        return __awaiter(this, void 0, void 0, function () {
            var nulledTx, sumInputs, sumOutputs, _a, _b, input, outpointTx, pubkey, sigVerified, e_1_1, _c, _d, output, err_1;
            var e_1, _e, e_2, _f;
            return __generator(this, function (_g) {
                switch (_g.label) {
                    case 0:
                        _g.trys.push([0, 13, , 14]);
                        if (!transactions_1.NonCoinbaseTransactionRecord.guard(obj)) return [3 /*break*/, 11];
                        nulledTx = (0, exports.genSignatureNulledTransaction)(obj);
                        sumInputs = 0;
                        sumOutputs = 0;
                        _g.label = 1;
                    case 1:
                        _g.trys.push([1, 8, 9, 10]);
                        _a = __values(obj.inputs), _b = _a.next();
                        _g.label = 2;
                    case 2:
                        if (!!_b.done) return [3 /*break*/, 7];
                        input = _b.value;
                        return [4 /*yield*/, this.objectExists(input.outpoint.txid)];
                    case 3:
                        // Check outpoint
                        if (!(_g.sent())) {
                            console.log(1);
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, this.getObject(input.outpoint.txid)];
                    case 4:
                        outpointTx = _g.sent();
                        if (input.outpoint.index >= outpointTx.outputs.length) {
                            return [2 /*return*/, false];
                            console.log(2);
                        }
                        // Check signature
                        if (!(0, exports.isValidHex)(input.sig, 128)) {
                            console.log(3);
                            return [2 /*return*/, false];
                        }
                        pubkey = outpointTx.outputs[input.outpoint.index].pubkey;
                        if (!(0, exports.isValidHex)(pubkey, 64)) {
                            throw Error("Outpoint public key is invalid");
                        }
                        return [4 /*yield*/, (0, exports.verifySig)(input.sig, (0, json_canonicalize_1.canonicalize)(nulledTx), pubkey)];
                    case 5:
                        sigVerified = _g.sent();
                        if (!sigVerified) {
                            console.log(4);
                            return [2 /*return*/, false];
                        }
                        sumInputs += outpointTx.outputs[input.outpoint.index].value;
                        _g.label = 6;
                    case 6:
                        _b = _a.next();
                        return [3 /*break*/, 2];
                    case 7: return [3 /*break*/, 10];
                    case 8:
                        e_1_1 = _g.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 10];
                    case 9:
                        try {
                            if (_b && !_b.done && (_e = _a["return"])) _e.call(_a);
                        }
                        finally { if (e_1) throw e_1.error; }
                        return [7 /*endfinally*/];
                    case 10:
                        try {
                            // Check outputs: pubkey is valid format and value is non-negative
                            for (_c = __values(obj.outputs), _d = _c.next(); !_d.done; _d = _c.next()) {
                                output = _d.value;
                                if (!(0, exports.isValidHex)(output.pubkey, 64) || output.value < 0) {
                                    console.log(5);
                                    return [2 /*return*/, false];
                                }
                                sumOutputs += output.value;
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (_d && !_d.done && (_f = _c["return"])) _f.call(_c);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                        // Check conservation of UTXOs
                        if (sumInputs < sumOutputs) {
                            console.log(sumInputs);
                            console.log(sumOutputs);
                            console.log(6);
                            return [2 /*return*/, false];
                        }
                        return [2 /*return*/, true];
                    case 11:
                        if (transactions_1.CoinbaseTransactionRecord.guard(obj)) {
                            return [2 /*return*/, true];
                        }
                        else if (transactions_1.BlockRecord.guard(obj)) {
                            return [2 /*return*/, true];
                        }
                        _g.label = 12;
                    case 12: 
                    //not a valid transaction format; need to return error to node that sent it to us
                    return [2 /*return*/, false];
                    case 13:
                        err_1 = _g.sent();
                        console.log("Validation failed" + err_1);
                        return [2 /*return*/, false];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    return ObjectManager;
}());
exports.ObjectManager = ObjectManager;
