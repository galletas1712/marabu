import * as net from "net";
import level from 'level-ts';
import { ConnectedSocketIO } from "./socketio";
import { PeerHandler } from "./peerhandler";
import { BOOTSTRAP_PEERS } from "./config";
import { PeerManager } from "./peermanager";
import { logger } from "./logger";

const args = process.argv.slice(2);
const peersDBPath = args[0];
const serverHostname = args[1];
const serverPort = args[2];


const handleConnection = async (socket: net.Socket, peerManager: PeerManager) => {
    const connIO = new ConnectedSocketIO(socket);
    const peerHandler = new PeerHandler(connIO, peerManager, serverHostname + ":" + serverPort);
    connIO.onConnect();
    socket.on("data", (data: string) => connIO.onData(data, peerHandler));
}

const runNode = async () => {
    const db = new level(peersDBPath);
    const peerManager = new PeerManager(db);
    await peerManager.load();

    // Run Server
    logger.debug("Server starting");
    const server = net.createServer((socket: net.Socket) => {
        socket.on("error", (err) => logger.warn(`${err}`));
        handleConnection(socket, peerManager);
    });
    server.listen(serverPort);

    // Run client
    for (const peer of await peerManager.knownPeers) {
        let host: string;
        let port: number;

        try {
            const lastColon = peer.lastIndexOf(":");
            host = peer.slice(0, lastColon).trim();
            port = Number.parseInt(peer.slice(lastColon + 1));
            if (isNaN(port) || port < 0 || port >= 65536) {
                throw Error(`invalid port ${peer.slice(lastColon + 1)}`); 
            }
        } catch (err) {
            logger.warn(`${err}`);
            continue;
        }

        logger.debug("Connecting to", peer);

        const client = new net.Socket();
        client.connect(port, host);
        client.on("connect", () => handleConnection(client, peerManager));
        client.on("error", (err) => logger.warn(`${err}`));
        client.on("close", () => {
            setTimeout(() => {
                client.connect(port, host);
            }, 1000);
        });
    }
}

runNode();