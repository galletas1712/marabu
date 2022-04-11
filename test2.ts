import {ObjectManager} from './src/objectmanager';
import Level from 'level-ts';


function testGetObjectID(){
    const dummyBD = new Level('./testDB');
    let obm = new ObjectManager(dummyBD);

    let genesisID = obm.getObjectID({ "T": "00000002af000000000000000000000000000000000000000000000000000000", "created": 1624219079, "miner": "dionyziz", "nonce": "0000000000000000000000000000000000000000000000000000002634878840", "note": "The Economist 2021-06-20: Crypto-miners are probably to blame for the graphics-chip shortage", "previd": null, "txids": [], "type": "block" });

    let realGenesisID ='00000000a420b7cefa2b7730243316921ed59ffe836e111ca3801f82a4f5360e';

    console.log(genesisID)
    console.log(realGenesisID)

    console.assert(genesisID === realGenesisID)

}


testGetObjectID();
