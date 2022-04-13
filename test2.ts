import {getObjectID, ObjectManager} from './src/objectmanager';
import * as net from "net";
import Level from 'level-ts';
import { randomBytes } from 'crypto';
import { canonicalize } from "json-canonicalize";
import * as ed from "@noble/ed25519";




const args = process.argv.slice(2);
const serverHostname = args[0];
const serverPort = Number.parseInt(args[1]);

let helloMsg =
  JSON.stringify({
    type: "hello",
    version: "0.8.0",
    agent: "Marabu-Core Client 0.8",
  }) + "\n";
let getPeersMsg = JSON.stringify({ type: "getpeers" }) + "\n";
let peersMsg =
  JSON.stringify({
    type: "peers",
    peers: ["custompeer.ksks1:18018", "custompeer.ksks2:18018"],
  }) + "\n";

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createNewClient(messages) {
  const client = new net.Socket();

  client.on("data", (msg) => {
    console.log(`Received message:`, msg.toString());
  });

  client.on("connect", async () => {
    for (let message of messages) {
      client.write(message);
      await timeout(2000);
    }
  });
  client.connect(serverPort, serverHostname);
  return client;
}


function hashObject(txn){
    const dummyBD = new Level('./testDB');
    let obm = new ObjectManager(dummyBD);
    let objid = getObjectID(txn);
    return objid;

}

function createGetObjMsg(txn){
    let msg = { "type": "getobject", "objectid": hashObject(txn)};
    return JSON.stringify(msg) + '\n';
}

async function test1() {

    const sk1 = ed.utils.randomPrivateKey();
    const sk2 = ed.utils.randomPrivateKey();
    const sk3 = ed.utils.randomPrivateKey();
    const pk1 = Buffer.from(await ed.getPublicKey(sk1)).toString("hex");
    const pk2 = Buffer.from(await ed.getPublicKey(sk2)).toString("hex");
    const pk3 = Buffer.from(await ed.getPublicKey(sk3)).toString("hex");
    
    console.log("Test 1: Sends a valid coinbase transaction object and asks for it back; sends a valid non-coinbase txn and asks for it back");
    console.log("Expecting: Transactions that were sent");

    let randVal = Math.random() * 10000000;
    let txn = { "type": "transaction", "height": 128, "outputs": [ { "pubkey": "077a2683d776a71139fd4db4d00c16703ba0753fc8bdc4bd6fc56614e659cde3", "value": randVal } ] };
    let txnid = hashObject(txn);

    let txnObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn) + '}\n';

    let getObjMsg = createGetObjMsg(txn);

    let txn2 = { "type": "transaction", "inputs": [ { "outpoint": { "txid": txnid, "index": 0 }, "sig": null } ], "outputs": [ { "pubkey": pk1, "value": randVal } ] };

    const encoder = new TextEncoder();
    const encodedTx = Uint8Array.from(encoder.encode(canonicalize(txn2)));
    const sig1 = Buffer.from(await ed.sign(encodedTx, await ed.getPublicKey(sk1))).toString("hex");
    txn2.inputs[0].sig = sig1;

    let txn2id = hashObject(txn2);

    let txn2ObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn2) + '}\n';

    let getObj2Msg = createGetObjMsg(txn2);

    createNewClient([helloMsg, txnObjMsg, getObjMsg, txn2ObjMsg, getObj2Msg]);
}

    //let txn = 

async function test2(){

}

const testsArray = [
    test1
];

async function tests() {
  console.log("------------------------------------------------");
  for (let test of testsArray) {
    await test();
    await timeout(2000);
    console.log("------------------------------------------------");
  }
}

console.log("Starting test client...");
tests();
