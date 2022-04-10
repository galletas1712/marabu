import * as net from "net";
import level from 'level-ts';
import { ConnectedSocketIO } from "./socketio";
import { PeerHandler } from "./peerhandler";
import { BOOTSTRAP_PEERS } from "./config";

const args = process.argv.slice(2);
const peersDBPath = args[0];
const serverHostname = args[1];
const serverPort = args[2];

const handleConnection = (socket: net.Socket, peersDB: level) => {
    const connIO = new ConnectedSocketIO(socket);
    const peerHandler = new PeerHandler(connIO, peersDB, serverHostname + ":" + serverPort);
    connIO.onConnect();
    socket.on("data", (data: string) => connIO.onData(data, peerHandler));
}

const runNode = async () => {
    const peersDB = new level(peersDBPath);
    for (const peer of BOOTSTRAP_PEERS) {
        await peersDB.put(peer, peer);
    }

    // Run Server
    console.log("Server starting");
    const server = net.createServer((socket: net.Socket) => {
        socket.on("error", (err) => console.log(`${err}`));
        handleConnection(socket, peersDB);
    });
    server.listen(serverPort);

    // Run client
    for (const peer of await peersDB.all()) {
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
            console.log(`${err}`);
            continue;
        }

        console.log("Connecting to", peer);

        const client = new net.Socket();
        client.connect(port, host);
        client.on("connect", () => handleConnection(client, peersDB));
        client.on("error", (err) => console.log(`${err}`));
        client.on("close", () => {
            setTimeout(() => {
                client.connect(port, host);
            }, 1000);
        });
    }
}

runNode();