import * as net from "net";
import { canonicalize } from "json-canonicalize";
import { PeerHandler } from "./peerhandler";
import {
  HelloMsg,
  ErrorMsg,
  Message,
  GetPeersMsg,
} from "./messages";
import { CURRENT_VERSION, AGENT } from "./config";

const TIMEOUT = 1000;

export class ConnectedSocketIO {
    socket: net.Socket;
    buffer: string;
    timeoutID: NodeJS.Timeout;

    constructor(socket: net.Socket) {
        this.socket = socket;
        this.buffer = "";
    }

    onConnect() {
        this.socket.setEncoding("utf8");
        this.writeToSocket({type: "hello", version: CURRENT_VERSION, agent: AGENT} as HelloMsg);
        this.writeToSocket({type: "getpeers"} as GetPeersMsg);
    }

    onData(data: string, peerHandler: PeerHandler) {
        clearTimeout(this.timeoutID);
        const tokens: Array<String> = data.split(/(?=[\n])|(?<=[\n])/g);
        for (const token of tokens) {
            this.buffer += token;

            if (token === "\n") {
                peerHandler.onMessage(this.buffer);
                this.buffer = "";
            }
        }
        this.timeoutID = setTimeout(() => {
            if (this.buffer.length > 0) {
                this.disconnectWithError("Invalid message");
            }
        }, TIMEOUT);
    }

    writeToSocket(msg: Message) {
        console.log("Writing:", msg);
        this.socket.write(canonicalize(msg) + "\n");
    }

    disconnectWithError(err: string) {
        console.log("Disconnecting due to error...");
        this.writeToSocket({ type: "error", error: err } as ErrorMsg);
        this.socket.destroy();
    }
}