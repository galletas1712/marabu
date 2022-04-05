export class InvalidMessageError extends Error {
    constructor(msg?: string) {
        if (typeof(msg) !== undefined) {
            super(msg);
        } else {
            super("Message is in an invalid format");
        }
    }
}

export class InvalidHelloMessageError extends InvalidMessageError {
    constructor(msg?: string) {
        if (typeof(msg) !== undefined) {
            super(msg);
        } else {
            super("Hello message is in an invalid format");
        }
    }
}