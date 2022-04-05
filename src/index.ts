import * as net from "net";
import * as fs from "fs";
import { Message, HelloMessage, PeersMessage } from "./interfaces";
import {
  helloMessage,
  errorMessage,
  peersMessage,
  getPeersMessage,
  requiredMessageKeys,
  optionalMessageKeys,
} from "./messages";
import { InvalidMessageError, InvalidHelloMessageError } from "./errors";

const PORT = 18080;
const MAX_PEERS = 4;
const PEERS_FILE = "../peers.list";

//Initialized to set of bootstrapping peers; will be overwritten with peers.list if it already exists
let knownPeers: Set<string> = new Set<string>([
  "149.28.220.241:18018",
  "149.28.204.235:18018",
  "139.162.130.195:18018",
]);
let connectedPeers: Set<string> = new Set<string>();

const getRandomPeer = () => {
  const knownPeersArray = Array.from(knownPeers);

  let randomIdx = Math.floor(Math.random() * knownPeers.size);
  while (knownPeersArray[randomIdx] in connectedPeers) {
    randomIdx = Math.floor(Math.random() * knownPeers.size);
  }
  return knownPeersArray[randomIdx];
};

export const handleSocket = (socket: net.Socket) => {
  // What if client disconnects before we can do this? should be ok?
  const currPeer = socket.remoteAddress + ":" + socket.remotePort?.toString();

  socket.setEncoding("utf8");
  socket.write(helloMessage);
  socket.write(getPeersMessage);

  let rcvMsgs: Array<Message> = [];
  let buffer: string = "";
  socket.on("data", (data: string) => {
    //The regex seperates by newline, e.g. "helloworld\nilovejavascript" returns ["helloworld", "\n", "ilovejavascript"]
    let dataArray: Array<String> = data.split(/(?=[\n])|(?<=[\n])/g);

    for (let datum of dataArray) {
      buffer += datum;

      if (datum === "\n") {
        try {
          const currMsg = parseAndValidateBuffer(buffer);
          handleMessage(currMsg, rcvMsgs, (payload: string) => socket.write(payload));
          rcvMsgs.push(currMsg);
          connectedPeers.add(currPeer);
        } catch (err) {
          if (err instanceof Error) {
            socket.write(errorMessage(err.message));
          }
          if (err instanceof InvalidHelloMessageError) {
            socket.end();
          }
        } finally {
          buffer = "";
        }
      }
    }
  });

  socket.on("end", () => {
    if (currPeer in connectedPeers) {
      connectedPeers.delete(currPeer);
    }
    connectPeerIfNotMax(getRandomPeer());
  });

  socket.on("error", () => {});
};

// Parses buffer and validates according to the specification of the type of message
export const parseAndValidateBuffer = (buffer: string): Message => {
  const deserialized: Object = JSON.parse(buffer);
  if (!deserialized.hasOwnProperty("type")) {
    throw new InvalidMessageError();
  }
  const result = deserialized as Message;
  if (!Object.keys(requiredMessageKeys).includes(result.type)) {
    throw new InvalidMessageError();
  }
  let foundError: boolean = false;
  for (const key of Object.keys(result)) {
    if (
      !requiredMessageKeys[result.type].includes(key) &&
      (!Object.keys(optionalMessageKeys).includes(result.type) ||
        !optionalMessageKeys[result.type].includes(key))
    ) {
      foundError = true;
      break;
    }
  }
  for (const key of requiredMessageKeys[result.type]) {
    if (!Object.keys(result).includes(key)) {
      foundError = true;
      break;
    }
  }
  if (foundError) {
    if (result.type === "hello") {
      throw new InvalidHelloMessageError();
    } else {
      throw new InvalidMessageError();
    }
  }
  return result;
};

export const handleMessage = (
  currMsg: Message,
  prevMsgs: Array<Message>,
  writer: (_: string) => void,
) => {
  // Validate that first message is a valid hello
  if (prevMsgs.length === 0) {
    // If first message isn't hello
    if (currMsg["type"] !== "hello") {
      throw new InvalidHelloMessageError("First message is not hello");
    }
    let versionTest = new RegExp("0\.8\..");
    // If version doesn't exist or version is invalid value, close socket
    if (
      currMsg["type"] === "hello" &&
      versionTest.test((currMsg as HelloMessage)["version"]) === false
    ) {
      throw new InvalidHelloMessageError();
    }
  }

  if (currMsg["type"] === "getpeers") {
      writer(peersMessage(Array.from(knownPeers.values())));
  } else if (currMsg["type"] === "peers") {
    const newPeers: Array<string> = (currMsg as PeersMessage)["peers"];
    for (const newPeer of newPeers) {
      const previousSize = knownPeers.size;
      knownPeers.add(newPeer);
      if (knownPeers.size > previousSize) {
        fs.appendFileSync(PEERS_FILE, newPeer + "\n");
      }
      connectPeerIfNotMax(newPeer);
    }
  }
};

// Main code starts here
if (!fs.existsSync(PEERS_FILE)) {
  fs.writeFileSync(PEERS_FILE, Array.from((knownPeers.values())).join("\n"));
} else {
  knownPeers = new Set<string>(fs.readFileSync(PEERS_FILE, "utf8").split("\n"));
}

const server = net.createServer();
server.listen(PORT);
server.on("connection", handleSocket);

const knownPeersArray = Array.from(knownPeers.values());

export const connectPeerIfNotMax = (newPeer: string) => {
  if (connectedPeers.size < MAX_PEERS) {
    const lastColon = newPeer.lastIndexOf(":");
    const host = newPeer.slice(0, lastColon);
    const port = Number(newPeer.slice(lastColon + 1));

    const client = new net.Socket();
    try {
        client.connect(port, host, () => handleSocket(client));
    } catch {
        console.log("Connection refused from", newPeer);
    }
  }
};

while (true) {
    for (const peer of knownPeers) {
        connectPeerIfNotMax(peer);
    }
}

// TODO: fix connected peers - loop might connect more than needed before connected peers list is updated