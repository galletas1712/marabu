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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessage = exports.parseAndValidateBuffer = exports.handleSocket = exports.connectPeerIfNotMax = void 0;
const net = __importStar(require("net"));
const fs = __importStar(require("fs"));
const messages_1 = require("./messages");
const errors_1 = require("./errors");
const PORT = 18080;
const MAX_PEERS = 4;
const PEERS_FILE = "../peers.list";
//Initialized to set of bootstrapping peers; will be overwritten with peers.list if it already exists
let knownPeers = new Set([
    "149.28.220.241:18018",
    "149.28.204.235:18018",
    "139.162.130.195:18018",
]);
let connectedPeers = new Set();
const connectPeerIfNotMax = (newPeer) => {
    if (connectedPeers.size < MAX_PEERS) {
        console.log("Connecting peer....");
        return;
        //::TODO::connect to peer
    }
};
exports.connectPeerIfNotMax = connectPeerIfNotMax;
const getRandomPeer = () => {
    const knownPeersArray = Array.from(knownPeers);
    let randomIdx = Math.floor(Math.random() * knownPeers.size);
    while (knownPeersArray[randomIdx] in connectedPeers) {
        randomIdx = Math.floor(Math.random() * knownPeers.size);
    }
    return knownPeersArray[randomIdx];
};
const handleSocket = (socket) => {
    // What if client disconnects before we can do this? should be ok?
    const currPeer = socket.remoteAddress + ":" + socket.remotePort?.toString();
    socket.setEncoding("utf8");
    socket.write(messages_1.helloMessage);
    socket.write(messages_1.getPeersMessage);
    let rcvMsgs = [];
    let buffer = "";
    socket.on("data", (data) => {
        //The regex seperates by newline, e.g. "helloworld\nilovejavascript" returns ["helloworld", "\n", "ilovejavascript"]
        let dataArray = data.split(/(?=[\n])|(?<=[\n])/g);
        for (let datum of dataArray) {
            buffer += datum;
            if (datum === "\n") {
                try {
                    const currMsg = (0, exports.parseAndValidateBuffer)(buffer);
                    (0, exports.handleMessage)(currMsg, rcvMsgs, (payload) => socket.write(payload));
                    rcvMsgs.push(currMsg);
                    connectedPeers.add(currPeer);
                }
                catch (err) {
                    if (err instanceof Error) {
                        socket.write((0, messages_1.errorMessage)(err.message));
                    }
                    if (err instanceof errors_1.InvalidHelloMessageError) {
                        socket.end();
                    }
                }
                finally {
                    buffer = "";
                }
            }
        }
    });
    socket.on("end", () => {
        if (currPeer in connectedPeers) {
            connectedPeers.delete(currPeer);
        }
        (0, exports.connectPeerIfNotMax)(getRandomPeer());
    });
    socket.on("error", () => { });
};
exports.handleSocket = handleSocket;
// Parses buffer and validates according to the specification of the type of message
const parseAndValidateBuffer = (buffer) => {
    const deserialized = JSON.parse(buffer);
    if (!deserialized.hasOwnProperty("type")) {
        throw new errors_1.InvalidMessageError();
    }
    const result = deserialized;
    if (!Object.keys(messages_1.requiredMessageKeys).includes(result.type)) {
        throw new errors_1.InvalidMessageError();
    }
    let foundError = false;
    for (const key of Object.keys(result)) {
        if (!messages_1.requiredMessageKeys[result.type].includes(key) &&
            (!Object.keys(messages_1.optionalMessageKeys).includes(result.type) ||
                !messages_1.optionalMessageKeys[result.type].includes(key))) {
            foundError = true;
            break;
        }
    }
    for (const key of messages_1.requiredMessageKeys[result.type]) {
        if (!Object.keys(result).includes(key)) {
            foundError = true;
            break;
        }
    }
    if (foundError) {
        if (result.type === "hello") {
            throw new errors_1.InvalidHelloMessageError();
        }
        else {
            throw new errors_1.InvalidMessageError();
        }
    }
    return result;
};
exports.parseAndValidateBuffer = parseAndValidateBuffer;
const handleMessage = (currMsg, prevMsgs, writer) => {
    // Validate that first message is a valid hello
    if (prevMsgs.length === 0) {
        // If first message isn't hello
        if (currMsg["type"] !== "hello") {
            throw new errors_1.InvalidHelloMessageError("First message is not hello");
        }
        let versionTest = new RegExp("0\.8\..");
        // If version doesn't exist or version is invalid value, close socket
        if (currMsg["type"] === "hello" &&
            versionTest.test(currMsg["version"]) === false) {
            throw new errors_1.InvalidHelloMessageError();
        }
    }
    if (currMsg["type"] === "getpeers") {
        writer((0, messages_1.peersMessage)(Array.from(knownPeers.values())));
    }
    else if (currMsg["type"] === "peers") {
        const newPeers = currMsg["peers"];
        for (const newPeer of newPeers) {
            const previousSize = knownPeers.size;
            knownPeers.add(newPeer);
            if (knownPeers.size > previousSize) {
                fs.appendFileSync(PEERS_FILE, newPeer + "\n");
            }
            (0, exports.connectPeerIfNotMax)(newPeer);
        }
    }
};
exports.handleMessage = handleMessage;
// Main code starts here
if (!fs.existsSync(PEERS_FILE)) {
    fs.writeFileSync(PEERS_FILE, Array.from((knownPeers.values())).join("\n"));
}
else {
    knownPeers = new Set(fs.readFileSync(PEERS_FILE, "utf8").split("\n"));
}
// const server = net.createServer();
// server.listen(PORT);
// server.on("connection", handleSocket);
const knownPeersArray = Array.from(knownPeers.values());
for (let i = 0; i < Math.min(knownPeers.size, MAX_PEERS); i++) {
    console.log("Connecting to known peers...");
    const lastColon = knownPeersArray[i].lastIndexOf(":");
    const host = knownPeersArray[i].slice(0, lastColon);
    const port = Number(knownPeersArray[i].slice(lastColon + 1));
    const client = new net.Socket();
    client.connect(port, host, () => (0, exports.handleSocket)(client));
}
