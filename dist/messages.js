"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMessage = exports.peersMessage = exports.getPeersMessage = exports.helloMessage = exports.optionalMessageKeys = exports.requiredMessageKeys = void 0;
exports.requiredMessageKeys = {
    "hello": ["type", "version"],
    "error": ["type", "error"],
    "getpeers": ["type"],
    "peers": ["type", "peers"],
    "getobject": ["type", "objectid"],
    "ihaveobject": ["type", "objectid"],
    "object": ["type", "object"],
    "getmempool": ["type"],
    "mempool": ["type", "txids"],
};
exports.optionalMessageKeys = {
    "hello": ["agent"]
};
exports.helloMessage = JSON.stringify({
    "type": "hello",
    "version": "0.8.0",
    "agent": "Marabu-Core Client 0.8"
});
exports.getPeersMessage = JSON.stringify({ "type": "getpeers" });
const peersMessage = (knownPeers) => JSON.stringify({ "type": "peers", "peers": knownPeers });
exports.peersMessage = peersMessage;
const errorMessage = (errorMsg) => JSON.stringify({ "type": "error", "error": errorMsg });
exports.errorMessage = errorMessage;
