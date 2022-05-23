import { ObjectManager } from "../objects/objectmanager";
import { getObjectID } from "../objects/util";
import * as net from "net";
import Level from "level-ts";
import { randomBytes } from "crypto";
import { canonicalize } from "json-canonicalize";
import * as ed from "@noble/ed25519";
import { Console } from "console";
import { CoinbaseTransaction, CoinbaseTransactionRecord, NonCoinbaseTransactionRecord } from "../types/transactions";
import { PeerManager } from "../peermanager";
import { level } from "winston";

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

let chaintipMsg = JSON.stringify({ "type": "getchaintip" }) + "\n";

let getMempoolMsg = JSON.stringify({"type":"getmempool"}) + '\n';

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

// async function hashObject(txn) {
//   const dummyBD = new Level("./testDB");
//   const dummyBD2 = new Level("./testDB2");
//   const dummyBD3 = new Level("./testDB3");
//   const pm = new PeerManager(dummyBD3);
//   await pm.load();
//   let obm = new ObjectManager(dummyBD, dummyBD2, pm);
//   let objid = getObjectID(txn);
//   return objid;
// }

// function createGetObjMsg(txn) {
//   let msg = { type: "getobject", objectid: hashObject(txn) };
//   return JSON.stringify(msg) + "\n";
// }


async function test0(){
    console.log(
        "Test 0: Sends nothing, expects genesis to be returned (00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e)"
    )
    createNewClient([helloMsg, chaintipMsg]);
}

async function test1(){
    console.log("Test 1: Valid Blockchain");
    console.log("Expecting: Blockchain returned");

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653114410,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000006fba3415","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["3838027f66729e4d9408eef6460d64b7fb81a861ee9012a1549ecd7866a04097"],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653164132,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000058fccdc","note":"Second block","previd":"00000001508fe4581e508492cc5d46911c03160c221f4edab73dd0ab2e474dfb","txids":["aa82e97e2eaab8d4d455312c8626e0af86844a3b91b42729be14822048223455"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653164322,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000001b8db7343","note":"Third block","previd":"000000016dc7aee35b78c658b05e0caf4057958d2ce0208424b03e91192a312d","txids":["090365b8931464e4a5a36e3a1eb0096a6e256ef82c629e7ddf5bae344e96fe51"],"type":"block"},"type":"object"}` + '\n';
    let getBlockmsg = `{"objectid":"000000029c6411250ae74efcfbc83a16588d55d98b49d7540e284cdb4b7ab6ac","type":"getobject"}` + '\n';

    createNewClient([helloMsg, block1msg, block2msg, block3msg, getBlockmsg]);

}


async function test2(){
    console.log("Test 2: Valid Blockchain 2");
    console.log("Expecting: Blockchain returned");

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653128470,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000019457a6a","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["87b88433cba3876d5a43447b214c7dfd34e4418a5e0ac1ddd5d284f3808ccd19"],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653129342,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000146804072","note":"Second block","previd":"000000027fca01c43084fff5a050b28cdc20d69ac7b88e549aa6345e7c121c22","txids":["f3fb9aad35939b6ee4313e44e5b4dfc69e3b92656c69a5027f30ac3bb4a784ff"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653140604,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000003ab77c19","note":"Third block","previd":"00000000f5f5b0d8b556257f205e9dc9e6c59bd1ca885e46811d32f9f9a5bff9","txids":["1d3b01349053811c44b0312020f0b0f97504b977a78204adf2adefcbb8f1b9c2"],"type":"block"},"type":"object"}` + '\n';
    let getBlockmsg = `{"objectid":"00000000c06249202135071c3662ed9d9e26d924ba9dd29d61af4b8e55e2dcdb","type":"getobject"}` + '\n';

    createNewClient([helloMsg, block1msg, block2msg, block3msg, getBlockmsg]);

}



async function test3(){
    console.log(
        "Test 3: Two Inputs with same Output"
    );
    console.log("Expecting: Error and no gossip")

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653179285,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000007f41b71e","note":"First block","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":["45b83ca1f7d6d083bd5116866f006b3979d15bc11ee32546e6cf7c84e4c3eee6"],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"45b83ca1f7d6d083bd5116866f006b3979d15bc11ee32546e6cf7c84e4c3eee6"},"sig":"f64a8fb07971588ff438fa5a4e7df694ce978e9ccbb92c22fb36c6ed4b7e434b19fa04f01027903f49d0222111229fa924a0edecb07a7f120a19221ce42e6d0b"},{"outpoint":{"index":0,"txid":"45b83ca1f7d6d083bd5116866f006b3979d15bc11ee32546e6cf7c84e4c3eee6"},"sig":"f64a8fb07971588ff438fa5a4e7df694ce978e9ccbb92c22fb36c6ed4b7e434b19fa04f01027903f49d0222111229fa924a0edecb07a7f120a19221ce42e6d0b"}],"outputs":[{"pubkey":"5f0b5847953fdd1c3db2f4622b9d507fdcc16b96a33557ea51ac189d772a8697","value":10}],"type":"transaction"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1msg, block2msg]);

}

async function test4(){
    console.log(
        "Test 4: Note Length Limit"
    );
    console.log("Expecting: Error and no gossip")

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653183619,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000020bb67aa","note":"This block contains a long note which is more than 128 characters. Therefore, this block is an invalid block. You should ensure that the note and miner fields in a block are ASCII-printable strings up to 128 characters long each.","previd":"00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e","txids":[],"type":"block"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1msg]);
}


async function test5(){
    console.log(
        "Test 5: Mempool Valid and Invalid Transactions"
    );
    console.log("Expecting: Mempool w/ some valid and invalid txns (will fill in later)")

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653205905,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000000e7566c5","note":"First block","previd":"0000000170ca89f3c6d0a4a6bf336f7bc3de0d3d68732c3ee671e4a200ecb6f1","txids":["046cf1a7a2c705f006f530168b629dbc7952ecc9cc663a9e282bfe1875ae9ca0"],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653206398,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000000c60bb8","note":"Second block","previd":"00000000bda06a6703b85aebdf0414e618b6a0b140adf52b502380bc376215df","txids":["87630141045652f4e6c809255782b0b14dd4f9a3af9cdd148d8eede4a3c2092c"],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653206425,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000030b2db05","note":"Third block","previd":"00000000fe27cb3cc34e69e09c188193eb5cbf611fe5f046c6e90e0fdb23eec1","txids":["7bd03919d576151b784eb122980bacd5d8697fd04c36e2dcb8b8f84774e3e7cf","bd06ef629aac4b94973c6ce42a02dc1e14b381f57d13575b568a23a453f41d2b"],"type":"block"},"type":"object"}`+ '\n';
    let block4msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653208558,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000e0864f3a","note":"Forth block","previd":"00000002237c6615963f45247b3b36a74f393003750ce1e158d955e2f470b97a","txids":["74aae585e415533324eeac643ea2f9b5a18db0e1a72b69b0dae4faf6db6df844","25b6ec987babf38fa650d09f11aac3c4a2e3bba3b5510d6046bc1a91eb51a8c0"],"type":"block"},"type":"object"}`+ '\n';
    let block5msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653218390,"miner":"grader","nonce":"000000000000000000000000000000000000000000000000000000000d9cf310","note":"Fifth block","previd":"00000001963d459d45da3e507f41dfbb627d947f4f9a19693ec3802239c7f77d","txids":["73bf949f48cb9e1e128d25ffa1b2b5babee495c2efddcb07ffdfdfeb28236015","4eb4d5ae8554b43013c4131c2bed33acc442c1888cdb72b53053ce5d607cdb65"],"type":"block"},"type":"object"}`+ '\n';
    let block6msg = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"74aae585e415533324eeac643ea2f9b5a18db0e1a72b69b0dae4faf6db6df844"},"sig":"349726132894913859562c4e39b318585631b7cfa81cb5d200c71d84036c509a4020732b30364c0f45a425c8bc509233a14a72342440168cc6db797111abf904"}],"outputs":[{"pubkey":"d5d0f667344c38fe28838f181cd5041c18e52f63acbbfd9af6b766c1c36fc132","value":10}],"type":"transaction"},"type":"object"}`+ '\n';
    let block7msg = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"73bf949f48cb9e1e128d25ffa1b2b5babee495c2efddcb07ffdfdfeb28236015"},"sig":"9eed9c0bd8ab5979c335ff7d3536441dd09491780d92da8983a51faeb8e76ef53ceb5a03a1da620f63650926032d1e7b2bfcfec8c6224e6afffdb22c0d636b08"}],"outputs":[{"pubkey":"4eee49a809e959b0169634598a2d57ed5bbc038880c54f6d6e5cf8cdbf387f9e","value":10}],"type":"transaction"},"type":"object"}`+ '\n';
    let block8msg = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"046cf1a7a2c705f006f530168b629dbc7952ecc9cc663a9e282bfe1875ae9ca0"},"sig":"cdcc3bbede3ef0c55c93e9d2eb75da2a1e8bf55cc55467f386ec9b7aa01352f7f000e711c0acd9ac4eb4de01c0af610c585f926a812ec162aba5463c96151b02"}],"outputs":[{"pubkey":"102485c802d15a228ac9865632e181546c0372e3cc33fcc6d93c5a3eaff1dd00","value":20}],"type":"transaction"},"type":"object"}`+ '\n';
    let block9msg = `{"object":{"inputs":[{"outpoint":{"index":0,"txid":"87630141045652f4e6c809255782b0b14dd4f9a3af9cdd148d8eede4a3c2092c"},"sig":"8c3b77b75f25ec8771b25226bf52325f6de0db49fc29d47ebaa6c34d3091ee402de03de9c2aa6143cf31b80a5b78d01bf2352cf815a9c7d803161961bbf75600"}],"outputs":[{"pubkey":"db7e2816d787d252d81248fdbf8696686dde9a0aa16931b400c5d21412c273b7","value":20}],"type":"transaction"},"type":"object"}`+ '\n';
    let block10msg = `{"object":{"height":17,"outputs":[{"pubkey":"30dd2e554fe1a9db05b58bf3b96b9aaa2b503e566347ec0a50bf73a4c339a05d","value":400}],"type":"transaction"},"type":"object"}`

    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1msg, block2msg, block3msg, block4msg, block5msg, block6msg, block7msg, block8msg, block9msg, block10msg, getMempoolMsg]);

}

async function test6(){
    console.log(
        "Test 6: Mempool with longer chain"
    );
    console.log("Expecting: Not sure, will update later tn")

    let block1msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653218978,"miner":"grader","nonce":"0000000000000000000000000000000000000000000000000000000003ee64f4","note":"New forth block","previd":"00000002237c6615963f45247b3b36a74f393003750ce1e158d955e2f470b97a","txids":["59a84565d9ce94fc44309715055859e21d53a89217fd151b7ba6369ac89da823"],"type":"block"},"type":"object"}` + '\n';
    let block2msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653219130,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000008e23df","note":"New fifth block","previd":"00000001b5d7cce513920e64f3d4ed0d21b0a1c99004803ba219f4941f61adc1","txids":[],"type":"block"},"type":"object"}` + '\n';
    let block3msg = `{"object":{"T":"00000002af000000000000000000000000000000000000000000000000000000","created":1653219149,"miner":"grader","nonce":"00000000000000000000000000000000000000000000000000000000f17794a4","note":"New sixth block","previd":"00000000bff3ae7c1b919013557f000e6e46e36ff06e44cafcc6205d1be0258d","txids":[],"type":"block"},"type":"object"}` + '\n';
    createNewClient([helloMsg]);
    createNewClient([helloMsg, block1msg, block2msg, block3msg, getMempoolMsg]);

}

const testsArray = [test1, test2, test3, test4, test5, test6];

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
