import * as net from "net";

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

async function test2() {
  console.log("test #2: sending nothing");
  console.log("expecting: hello and getpeers");

  const client = createNewClient([]);
}

async function test3() {
  console.log("test #3: sending hello");
  console.log("expecting: hello and getpeers");
  const client = createNewClient([helloMsg]);
}

async function test4() {
  /* This test is a bit jank... just wanted to make sure it worked roughly */
  console.log(
    "test #4: same client should be able to disconnect and reconnect"
  );
  console.log("expecting: hello and getpeers twice");

  const client = createNewClient([helloMsg]);

  await timeout(300);
  client.end();
  await timeout(300);
  client.connect(serverPort, serverHostname);
}

async function test5() {
  console.log("test #5: sending hello and getpeers");
  console.log("expecting: hello, getpeers, and peers");

  const client = createNewClient([helloMsg, getPeersMsg]);
}

async function test6() {
  console.log("test #6: sending getpeers as two packets");
  console.log("expecting: hello, getpeers, and peers");

  const client = new net.Socket();
  client.on("data", (msg) => {
    console.log(`Received message:`, msg.toString());
  });

  client.on("connect", () => {
    client.write(helloMsg);
    client.write(`{"type": "ge`);
    timeout(10);
    client.write(`tpeers"}\n`);
  });

  client.connect(serverPort, serverHostname);
}

async function test7() {
  console.log("test #7: sending any messages before hello");
  console.log("expecting: error messages & disconnected");

  const client = createNewClient([getPeersMsg]);

  await timeout(400);
  client.write("hello after disconnected");
}

async function test8() {
  console.log("test #8: sending 5 invalid messages");
  console.log(
    "expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?"
  );

  const client = createNewClient(["Wbgygvf7rgtyv7tfbgy{{{"]);
}

async function test9() {
  console.log("test #9: send peers, disconnect, then getpeers");
  console.log("expecting own peer list to be returned");

  const client = createNewClient([helloMsg, peersMsg]);
  await timeout(300);
  client.end();
  await timeout(300);

  const client2 = new net.Socket();
  client2.on("data", (msg) => {
    console.log(`Received message:`, msg.toString());
  });

  client2.on("connect", () => {
    client2.write(helloMsg);
    client2.write(getPeersMsg);
  });

  client2.connect(serverPort, serverHostname);
}

async function test10() {
  console.log("test #10: can make two connections simultaneously");
  console.log("expecting two hellos and getpeers");

  const client1 = createNewClient([helloMsg]);
  const client2 = createNewClient([helloMsg]);
}

async function test11() {
  console.log("test #11: sending 5 invalid messages");
  console.log(
    "expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?"
  );

  const client = createNewClient([`{"type":"diufygeuybhv"}`]);
}

async function test12() {
  console.log("test #12: sending 5 invalid messages");
  console.log(
    "expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?"
  );

  const client = createNewClient([`{"type":"hello"}`]);
}

async function test13() {
  console.log("test #13: sending 5 invalid messages");
  console.log(
    "expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?"
  );

  const client = createNewClient([`{"type":"hello","version":"jd3.x"}`]);
}

async function test14() {
  console.log("test #14: sending 5 invalid messages");
  console.log(
    "expecting: 5 error messages but not disconnected -- or maybe we disconnect on first invalid message?"
  );

  const client = createNewClient([`{"type":"hello","version":"5.8.2"}`]);
}

async function test15() {
  console.log("test #15: timeout on valid message, send another valid message");
  console.log("not expecting timeout or disconnect");
  const client = new net.Socket();

  client.on("data", (msg) => {
    console.log(`Received message:`, msg.toString());
  });

  client.on("connect", async () => {
    client.write(helloMsg);
    await timeout(1500);
    client.write(getPeersMsg);
  });
  client.connect(serverPort, serverHostname);
}

const testsArray = [
  test2,
  test3,
  test4,
  test5,
  test6,
  test7,
  test9,
  test10,
  test8,
  test11,
  test12,
  test13,
  test14,
  test15,
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
