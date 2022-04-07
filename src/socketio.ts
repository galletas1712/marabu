import * as net from "net";
import { canonicalize } from "json-canonicalize";
import { PeerHandler } from "./peerhandler";
import {
  HelloMsg,
  ErrorMsg,
  Message,
} from "./messages";
import { CURRENT_VERSION, AGENT } from "./config";

export class ConnectedSocketIO {
    socket: net.Socket;
    buffer: string;

    constructor(socket: net.Socket) {
        this.socket = socket;
        this.buffer = "";
    }

    onConnect() {
        this.socket.setEncoding("utf8");
        this.writeToSocket({type: "hello", version: CURRENT_VERSION, agent: AGENT} as HelloMsg);
    }

    onData(data: string, peerHandler: PeerHandler) {
        const tokens: Array<String> = data.split(/(?=[\n])|(?<=[\n])/g);
        for (const token of tokens) {
            this.buffer += token;

            if (token === "\n") {
                peerHandler.onMessage(this.buffer);
                this.buffer = "";
            }
        }
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