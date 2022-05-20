import { ObjectManager } from "../objects/objectmanager";
import { getObjectID } from "../objects/util";
import * as net from "net";
import Level from "level-ts";
import { randomBytes } from "crypto";
import { canonicalize } from "json-canonicalize";
import * as ed from "@noble/ed25519";
import { Console } from "console";
import { CoinbaseTransaction, CoinbaseTransactionRecord, NonCoinbaseTransactionRecord } from "../types/transactions";

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

let iHaveObjectMsg =
  JSON.stringify({ type: "ihaveobject", objectid: pseudorandomId() }) + "\n";

function pseudorandomId() {
  return (
    "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e8" +
    Math.round(Math.random() * 100000)
      .toString()
      .padStart(6, "0")
  );
}
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createNewClient(messages) {
  const clientID = Math.floor(Math.random() * 100);
  const client = new net.Socket();

  client.on("data", (msg) => {
    console.log(`Client ${clientID} received message:`, msg.toString());
  });

  client.on("connect", async () => {
    for (let message of messages) {
      console.log(`Client ${clientID} sending:`, message);
      client.write(message);
      await timeout(2000);
    }
  });
  client.connect(serverPort, serverHostname);
  return client;
}

function hashObject(txn) {
  const dummyBD = new Level("./testDB");
  let objid = getObjectID(txn);
  return objid;
}

function createGetObjMsg(txn) {
  let msg = { type: "getobject", objectid: hashObject(txn) };
  return JSON.stringify(msg) + "\n";
}

async function test1() {
  const sk1 = ed.utils.randomPrivateKey();
  const sk2 = ed.utils.randomPrivateKey();
  const sk3 = ed.utils.randomPrivateKey();
  const pk1 = Buffer.from(await ed.getPublicKey(sk1)).toString("hex");
  const pk2 = Buffer.from(await ed.getPublicKey(sk2)).toString("hex");
  const pk3 = Buffer.from(await ed.getPublicKey(sk3)).toString("hex");

  console.log(
    "Test 1: Sends a valid coinbase transaction object and asks for it back; sends a valid non-coinbase txn and asks for it back"
  );
  console.log("Expecting: Transactions that were sent");

  let randVal = Math.round(Math.random() * 10000000);
  let txn = {
    type: "transaction",
    height: 128,
    outputs: [{ pubkey: pk1, value: randVal }],
  };
  let txnid = hashObject(txn);

  let txnObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn) + "}\n";

  let getObjMsg = createGetObjMsg(txn);

  let txn2 = {
    type: "transaction",
    inputs: [{ outpoint: { txid: txnid, index: 0 }, sig: null }],
    outputs: [{ pubkey: pk1, value: randVal }],
  };

  const encoder = new TextEncoder();
  const encodedTx = Uint8Array.from(encoder.encode(canonicalize(txn2)));
  const sig1 = Buffer.from(await ed.sign(encodedTx, sk1)).toString("hex");
  txn2.inputs[0].sig = sig1;

  let txn2id = hashObject(txn2);

  let txn2ObjMsg =
    '{ "type": "object", "object":' + JSON.stringify(txn2) + "}\n";

  let getObj2Msg = createGetObjMsg(txn2);

  console.log("txn1id is", txnid, "txn2id is", txn2id);
  createNewClient([helloMsg, txnObjMsg, getObjMsg, txn2ObjMsg, getObj2Msg]);
}
async function test2() {
  const sk1 = ed.utils.randomPrivateKey();
  const sk2 = ed.utils.randomPrivateKey();
  const sk3 = ed.utils.randomPrivateKey();
  const pk1 = Buffer.from(await ed.getPublicKey(sk1)).toString("hex");
  const pk2 = Buffer.from(await ed.getPublicKey(sk2)).toString("hex");
  const pk3 = Buffer.from(await ed.getPublicKey(sk3)).toString("hex");

  console.log(
    "Test 2 Sends a valid coinbase transaction object and asks for it back; sends a valid non-coinbase txn and asks for it back through two different nodes"
  );
  console.log("Expecting: Transactions that were sent");

  let randVal = Math.round(Math.random() * 10000000);
  let txn = {
    type: "transaction",
    height: 128,
    outputs: [{ pubkey: pk1, value: randVal }],
  };
  let txnid = hashObject(txn);

  let txnObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn) + "}\n";

  let getObjMsg = createGetObjMsg(txn);

  let txn2 = {
    type: "transaction",
    inputs: [{ outpoint: { txid: txnid, index: 0 }, sig: null }],
    outputs: [{ pubkey: pk1, value: randVal }],
  };

  const encoder = new TextEncoder();
  const encodedTx = Uint8Array.from(encoder.encode(canonicalize(txn2)));
  const sig1 = Buffer.from(await ed.sign(encodedTx, sk1)).toString("hex");
  txn2.inputs[0].sig = sig1;

  let txn2id = hashObject(txn2);

  let txn2ObjMsg =
    '{ "type": "object", "object":' + JSON.stringify(txn2) + "}\n";

  let getObj2Msg = createGetObjMsg(txn2);

  console.log("txn1id is", txnid, "txn2id is", txn2id);
  createNewClient([helloMsg, txnObjMsg, txn2ObjMsg]);
  await timeout(2000);
  createNewClient([helloMsg, getObjMsg, getObj2Msg]);
}

async function test4() {
  console.log("Test 3 implicit from previous test");
  console.log("Test 4: sending i have object");
  console.log("Expecting: getObject");
  createNewClient([helloMsg, iHaveObjectMsg]);
}

async function test5() {
  const sk1 = ed.utils.randomPrivateKey();
  const sk2 = ed.utils.randomPrivateKey();
  const sk3 = ed.utils.randomPrivateKey();
  const pk1 = Buffer.from(await ed.getPublicKey(sk1)).toString("hex");
  const pk2 = Buffer.from(await ed.getPublicKey(sk2)).toString("hex");
  const pk3 = Buffer.from(await ed.getPublicKey(sk3)).toString("hex");

  console.log(
    "Test 5 Sends valid transactions and expects them to be gossipped"
  );
  console.log("Expecting: Transactions gossipped");

  let randVal = Math.round(Math.random() * 10000000);
  let txn = {
    type: "transaction",
    height: 128,
    outputs: [{ pubkey: pk1, value: randVal }],
  };
  let txnid = hashObject(txn);

  let txnObjMsg = '{ "type": "object", "object":' + JSON.stringify(txn) + "}\n";

  let getObjMsg = createGetObjMsg(txn);

  let txn2 = {
    type: "transaction",
    inputs: [{ outpoint: { txid: txnid, index: 0 }, sig: null }],
    outputs: [{ pubkey: pk1, value: randVal }],
  };

  const encoder = new TextEncoder();
  const encodedTx = Uint8Array.from(encoder.encode(canonicalize(txn2)));
  const sig1 = Buffer.from(await ed.sign(encodedTx, sk1)).toString("hex");
  txn2.inputs[0].sig = sig1;

  let txn2id = hashObject(txn2);

  let txn2ObjMsg =
    '{ "type": "object", "object":' + JSON.stringify(txn2) + "}\n";

  let getObj2Msg = createGetObjMsg(txn2);

  console.log("txn1id is", txnid, "txn2id is", txn2id);
  createNewClient([helloMsg]);
  createNewClient([helloMsg, txnObjMsg]);
}

async function test6() {
  const coinbaseTxMsg = {
    type: "object",
    object: {
      type: "transaction",
      height: 0,
      outputs: [
        {
          pubkey:
            "3e862a87a41ac611464b404ed472cf8c7e0c79e859a8a8bb444dbb08c118396d",
          value: 50000000000,
        },
      ],
    },
  };
  const validTxMsg = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 0,
            txid: "af2c141e158fb5dcc7aac86dea676bc39c6572d4853239172031d6af7b7757cc",
          },
          sig: "bd620a84f2ee6794b0e60ca4b3ffc4564d87ab01e29fb7d09d49898348df6d99fcb1a4c644a66e86ebaf94c97cb15ea6f996ceaa5ef2d566ebf2e4671f8a580d",
        },
      ],
      outputs: [
        {
          pubkey:
            "3e862a87a41ac611464b404ed472cf8c7e0c79e859a8a8bb444dbb08c118396d",
          value: 10,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  CoinbaseTransactionRecord.check(coinbaseTxMsg.object);
  NonCoinbaseTransactionRecord.check(validTxMsg.object);
  createNewClient([helloMsg, JSON.stringify(coinbaseTxMsg) + "\n", JSON.stringify(validTxMsg) + "\n"]);
}

const testsArray = [test1, test2, test4, test5, test6];

async function tests() {
  console.log("------------------------------------------------");
  for (let test of testsArray) {
    await test();
    await timeout(5000);
    console.log("------------------------------------------------");
  }
}

console.log("Starting test client...");
tests();
