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
var args = process.argv.slice(2);
var serverHostname = args[0];
var serverPort = Number.parseInt(args[1]);
var helloMsg = JSON.stringify({ "type": "hello", "version": "0.8.0", "agent": "Marabu-Core Client 0.8" }) + "\n";
var getPeersMsg = JSON.stringify({ "type": "getpeers" }) + "\n";
var peersMsg = JSON.stringify({ "type": "peers", "peers": ["custompeer.ksks1:18018", "custompeer.ksks2:18018"] }) + "\n";
function timeout(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
;
function createNewClient(messages) {
    var client = new net.Socket();
    client.on('data', function (msg) {
        console.log("Received message:", msg.toString());
    });
    client.on("connect", function () {
        for (var _i = 0, messages_1 = messages; _i < messages_1.length; _i++) {
            var message = messages_1[_i];
            client.write(message);
        }
    });
    client.connect(serverPort, serverHostname);
    return client;
}
function test2() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #2: sending nothing");
            console.log("expecting: hello -- or maybe we also expect getpeers?");
            client = createNewClient([]);
            return [2 /*return*/];
        });
    });
}
;
function test3() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #3: sending hello");
            console.log("expecting: hello and getpeers");
            client = createNewClient([helloMsg]);
            return [2 /*return*/];
        });
    });
}
;
function test4() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    /* This test is a bit jank... just wanted to make sure it worked roughly */
                    console.log("test #4: same client should be able to disconnect and reconnect");
                    console.log("expecting: hello and getpeers twice");
                    client = createNewClient([helloMsg]);
                    return [4 /*yield*/, timeout(300)];
                case 1:
                    _a.sent();
                    client.end();
                    return [4 /*yield*/, timeout(300)];
                case 2:
                    _a.sent();
                    client.connect(serverPort, serverHostname);
                    return [2 /*return*/];
            }
        });
    });
}
;
function test5() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #5: sending hello and getpeers");
            console.log("expecting: hello, getpeers, and peers");
            client = createNewClient([helloMsg, getPeersMsg]);
            return [2 /*return*/];
        });
    });
}
function test6() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #6: sending getpeers as two packets");
            console.log("expecting: hello, getpeers, and peers");
            client = new net.Socket();
            client.on('data', function (msg) {
                console.log("Received message:", msg.toString());
            });
            client.on('connect', function () {
                client.write(helloMsg);
                client.write("{\"type\": \"ge");
                timeout(10);
                client.write("tpeers\"}\n");
            });
            client.connect(serverPort, serverHostname);
            return [2 /*return*/];
        });
    });
}
function test7() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("test #7: sending any messages before hello");
                    console.log("expecting: error messages & disconnected");
                    client = createNewClient([getPeersMsg]);
                    return [4 /*yield*/, timeout(400)];
                case 1:
                    _a.sent();
                    client.write("hello after disconnected");
                    return [2 /*return*/];
            }
        });
    });
}
function test8() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #8: sending 5 invalid messages");
            console.log("expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?");
            client = createNewClient(["Wbgygvf7rgtyv7tfbgy{{{"]);
            return [2 /*return*/];
        });
    });
}
function test9() {
    return __awaiter(this, void 0, void 0, function () {
        var client, client2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("test #9: send peers, disconnect, then getpeers");
                    console.log("expecting own peer list to be returned");
                    client = createNewClient([helloMsg, peersMsg]);
                    return [4 /*yield*/, timeout(300)];
                case 1:
                    _a.sent();
                    client.end();
                    return [4 /*yield*/, timeout(300)];
                case 2:
                    _a.sent();
                    client2 = new net.Socket();
                    client2.on('data', function (msg) {
                        console.log("Received message:", msg.toString());
                    });
                    client2.on('connect', function () {
                        client2.write(helloMsg);
                        client2.write(getPeersMsg);
                    });
                    client2.connect(serverPort, serverHostname);
                    return [2 /*return*/];
            }
        });
    });
}
function test10() {
    return __awaiter(this, void 0, void 0, function () {
        var client1, client2;
        return __generator(this, function (_a) {
            console.log("test #10: can make two connections simultaneously");
            console.log("expecting two hellos and getpeers");
            client1 = createNewClient([helloMsg]);
            client2 = createNewClient([helloMsg]);
            return [2 /*return*/];
        });
    });
}
function test11() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #11: sending 5 invalid messages");
            console.log("expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?");
            client = createNewClient(["{\"type\":\"diufygeuybhv\"}"]);
            return [2 /*return*/];
        });
    });
}
function test12() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #12: sending 5 invalid messages");
            console.log("expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?");
            client = createNewClient(["{\"type\":\"hello\"}"]);
            return [2 /*return*/];
        });
    });
}
function test13() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #13: sending 5 invalid messages");
            console.log("expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?");
            client = createNewClient(["{\"type\":\"hello\",\"version\":\"jd3.x\"}"]);
            return [2 /*return*/];
        });
    });
}
function test14() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        return __generator(this, function (_a) {
            console.log("test #14: sending 5 invalid messages");
            console.log("expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?");
            client = createNewClient(["{\"type\":\"hello\",\"version\":\"5.8.2\"}"]);
            return [2 /*return*/];
        });
    });
}
function test15() {
    return __awaiter(this, void 0, void 0, function () {
        var client;
        var _this = this;
        return __generator(this, function (_a) {
            console.log("test #15: timeout on valid message, send another valid message");
            console.log("not expecting timeout or disconnect");
            client = new net.Socket();
            client.on('data', function (msg) {
                console.log("Received message:", msg.toString());
            });
            client.on("connect", function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            client.write(helloMsg);
                            return [4 /*yield*/, timeout(1500)];
                        case 1:
                            _a.sent();
                            client.write(getPeersMsg);
                            return [2 /*return*/];
                    }
                });
            }); });
            client.connect(serverPort, serverHostname);
            return [2 /*return*/];
        });
    });
}
var testsArray = [test2, test3, test4, test5, test6, test7, test9, test10, test8, test11, test12, test13, test14, test15];
// const testsArray = [test8, test11, test12, test13, test14]
function tests() {
    return __awaiter(this, void 0, void 0, function () {
        var _i, testsArray_1, test;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('------------------------------------------------');
                    _i = 0, testsArray_1 = testsArray;
                    _a.label = 1;
                case 1:
                    if (!(_i < testsArray_1.length)) return [3 /*break*/, 5];
                    test = testsArray_1[_i];
                    return [4 /*yield*/, test()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, timeout(2000)];
                case 3:
                    _a.sent();
                    console.log('------------------------------------------------');
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
console.log("Starting test client...");
tests();
