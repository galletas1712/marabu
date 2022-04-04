import * as net from "net";
import { Message, HelloMessage } from "./interfaces";
import { helloMessage, errorMessage, getPeersMessage, requiredMessageKeys, optionalMessageKeys } from "./messages";

const PORT = 18080;

const onServerConnect = (socket: net.Socket) => {
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
                    handleMessage(currMsg, rcvMsgs, socket);
                    rcvMsgs.push(currMsg);
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

    socket.on("end", () => { });

    socket.on("error", () => { });
};

const parseAndValidateBuffer = (buffer: string): Message => {
    const deserialized: Object = JSON.parse(buffer);
    if (!deserialized.hasOwnProperty("type")) {
        throw new InvalidMessageError;
    }
    const result = deserialized as Message;
    let foundError : boolean = false;
    for (const key in Object.keys(result)) {
        if (!(key in requiredMessageKeys[result.type]) && !(!(result.type in optionalMessageKeys) || key in optionalMessageKeys[result.type])) {
            foundError = true;
            break;
        }
    }
    for (const key in requiredMessageKeys[result.type]) {
        if(!(key in result)) {
            foundError = true;
            break;
        }
    }
    if (foundError) {
        if (result.type === "hello") {
            throw new InvalidHelloMessageError;
        } else {
            throw new InvalidMessageError;
        }
    }
    return result;
}

const handleMessage = (currMsg: Message, prevMsgs: Array<Message>, socket: net.Socket) => {
    //validate that first message is a valid hello
    if (prevMsgs.length === 0) {
        //if first message isn't hello 
        if (currMsg["type"] !== "hello") {
            throw new InvalidHelloMessageError("First message is not hello");
        }
        let versionTest = new RegExp("0\.8\..");
        //if version doesn't exist or version is invalid value, close socket
        if (currMsg["type"] === "hello" && versionTest.test((currMsg as HelloMessage)["version"]) === false) {
            throw new InvalidHelloMessageError;
        }
    }

    //validate getPeers; need to write known peers to text file
};

const server = net.createServer();
server.listen(PORT);
server.on("connection", onServerConnect);
