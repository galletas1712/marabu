"use strict";
exports.__esModule = true;
exports.ConnectedSocketIO = void 0;
var json_canonicalize_1 = require("json-canonicalize");
var config_1 = require("./config");
var ConnectedSocketIO = /** @class */ (function () {
    function ConnectedSocketIO(socket) {
        this.socket = socket;
        this.buffer = "";
    }
    ConnectedSocketIO.prototype.onConnect = function () {
        this.socket.setEncoding("utf8");
        this.writeToSocket({ type: "hello", version: config_1.CURRENT_VERSION, agent: config_1.AGENT });
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
        this.socket.write((0, json_canonicalize_1.canonicalize)(msg) + "\n");
    };
    ConnectedSocketIO.prototype.disconnectWithError = function (err) {
        console.log("Disconnecting due to error...");
        this.writeToSocket({ type: "error", error: err });
        this.socket.destroy();
    };
    return ConnectedSocketIO;
}());
exports.ConnectedSocketIO = ConnectedSocketIO;
