import * as net from "net";
import { canonicalize } from "json-canonicalize";
import { PeerHandler } from "./peerhandler";
import { HelloMsg, ErrorMsg, Message, GetPeersMsg, GetChainTipMessage, GetMempoolMessage } from "./types/messages";
import { CURRENT_VERSION, AGENT, TIMEOUT } from "./config";
import { logger } from "./logger";

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
    this.writeToSocket({
      type: "hello",
      version: CURRENT_VERSION,
      agent: AGENT,
    } as HelloMsg);
    this.writeToSocket({ type: "getpeers" } as GetPeersMsg);
    this.writeToSocket({ type: "getchaintip" } as GetChainTipMessage);
    this.writeToSocket({ type: "getmempool" } as GetMempoolMessage);
  }

  onData(data: string, onMessage: Function) {
    clearTimeout(this.timeoutID);
    const tokens: Array<String> = data.split(/(?=[\n])|(?<=[\n])/g);
    for (const token of tokens) {
      this.buffer += token;

      if (token === "\n") {
        onMessage(this.buffer);
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
    logger.debug(`Writing: ${JSON.stringify(msg, null, 4)}`);
    this.socket.write(canonicalize(msg) + "\n");
  }

  disconnectWithError(err: string) {
    logger.debug("Disconnecting due to error...");
    this.writeToSocket({ type: "error", error: err } as ErrorMsg);
    this.socket.destroy();
  }
}
