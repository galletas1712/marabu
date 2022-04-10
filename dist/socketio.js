"use strict";
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
exports.__esModule = true;
exports.ConnectedSocketIO = void 0;
var json_canonicalize_1 = require("json-canonicalize");
var config_1 = require("./config");
var logger_1 = require("./logger");
var TIMEOUT = 1000;
var ConnectedSocketIO = /** @class */ (function () {
    function ConnectedSocketIO(socket) {
        this.socket = socket;
        this.buffer = "";
    }
    ConnectedSocketIO.prototype.onConnect = function () {
        this.socket.setEncoding("utf8");
        this.writeToSocket({ type: "hello", version: config_1.CURRENT_VERSION, agent: config_1.AGENT });
        this.writeToSocket({ type: "getpeers" });
    };
    ConnectedSocketIO.prototype.onData = function (data, peerHandler) {
        var e_1, _a;
        var _this = this;
        clearTimeout(this.timeoutID);
        var tokens = data.split(/(?=[\n])|(?<=[\n])/g);
        try {
            for (var tokens_1 = __values(tokens), tokens_1_1 = tokens_1.next(); !tokens_1_1.done; tokens_1_1 = tokens_1.next()) {
                var token = tokens_1_1.value;
                this.buffer += token;
                if (token === "\n") {
                    peerHandler.onMessage(this.buffer);
                    this.buffer = "";
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (tokens_1_1 && !tokens_1_1.done && (_a = tokens_1["return"])) _a.call(tokens_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.timeoutID = setTimeout(function () {
            if (_this.buffer.length > 0) {
                _this.disconnectWithError("Invalid message");
            }
        }, TIMEOUT);
    };
    ConnectedSocketIO.prototype.writeToSocket = function (msg) {
        logger_1.logger.debug("Writing:", msg);
        this.socket.write((0, json_canonicalize_1.canonicalize)(msg) + "\n");
    };
    ConnectedSocketIO.prototype.disconnectWithError = function (err) {
        logger_1.logger.debug("Disconnecting due to error...");
        this.writeToSocket({ type: "error", error: err });
        this.socket.destroy();
    };
    return ConnectedSocketIO;
}());
exports.ConnectedSocketIO = ConnectedSocketIO;
