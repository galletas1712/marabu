import { expect } from "chai";
import { InvalidMessageError, InvalidHelloMessageError } from "../errors";
import { parseAndValidateBuffer } from "../index";
import { helloMessage } from "../messages";

const invalidVersionHelloMessage = JSON.stringify({
    "type": "hello",
    "agent": "Marabu-Core Client 0.8"
});

const noTypeMessage = JSON.stringify({
    "version": "0.8.0",
    "agent": "Marabu-Core Client 0.8"
});

const wrongTypeMessage = JSON.stringify({
    "type": "boo"
});

const incompleteRequiredKeysMessage = JSON.stringify({
    "type": "peers"
})

const garbageKeysMessage = JSON.stringify({
    "type": "getpeers",
    "peers": ["1", "2"]
});

describe("Test parseAndValidateBffer", () => {
    it("Should return the message back if everything is valid", () => {
        expect(JSON.stringify(parseAndValidateBuffer(helloMessage))).to.equal(helloMessage);
    });
    it("Should throw an error if no message type is specified", () => {
        expect(() => parseAndValidateBuffer(noTypeMessage)).to.throw(InvalidMessageError);
    });
    it("Should throw InvalidHelloError if hello message is errorneous", () => {
        expect(() => parseAndValidateBuffer(invalidVersionHelloMessage)).to.throw(InvalidHelloMessageError);
    })

    it("Should throw InvalidError if message has a type that doesn't exist", () => {
        expect(() => parseAndValidateBuffer(wrongTypeMessage)).to.throw(InvalidMessageError);
    })

    it("Should throw InvalidError if peer message does not have peers array (i.e. incomplete required keys)", () => {
        expect(() => parseAndValidateBuffer(incompleteRequiredKeysMessage)).to.throw(InvalidMessageError);
    })

    it("Should throw InvalidError if message contains garbage keys (e.g. getpeers has peers)", () => {
        expect(() => parseAndValidateBuffer(garbageKeysMessage)).to.throw(InvalidMessageError);
    })
})

