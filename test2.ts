import {getObjectID, ObjectManager} from './src/objectmanager';
import * as net from "net";
import Level from 'level-ts';


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

  client.on("connect", () => {
    for (let message of messages) {
      client.write(message);
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
    console.log("Test 1: Sends a valid transaction object and asks for it back");
    console.log("Expecting: Transaction that was sent");

    let txn = { "type": "transaction", "inputs": [ { "outpoint": { "txid": "f71408bf847d7dd15824574a7cd4afdfaaa2866286910675cd3fc371507aa196", "index": 0 }, "sig": "3869a9ea9e7ed926a7c8b30fb71f6ed151a132b03fd5dae764f015c98271000e7da322dbcfc97af7931c23c0fae060e102446ccff0f54ec00f9978f3a69a6f0f" } ], "outputs": [ { "pubkey": "077a2683d776a71139fd4db4d00c16703ba0753fc8bdc4bd6fc56614e659cde3", "value": 5100000000 } ] };
    let txnid = hashObject(txn);

    let txnObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn) + '}\n';

    let getObjMsg = createGetObjMsg(txn);
    
    createNewClient([helloMsg, txnObjMsg, getObjMsg]);
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
