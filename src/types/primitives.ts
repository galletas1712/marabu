import { Literal, Record, String, Number, Array, Static, Union, Optional } from "runtypes";
import { Exact } from "./exact";

export const isValidHex = (
  hexString: string,
  expectedLength: number
): boolean => {
  for (let i = 0; i < hexString.length; i++) {
    if (
      !(
        (hexString[i] >= "0" && hexString[i] <= "9") ||
        (hexString[i] >= "a" && hexString[i] <= "f")
      )
    ) {
      return false;
    }
  }
  return (
    hexString.length === expectedLength && hexString.toLowerCase() === hexString
  );
};

export const Hex32RunType = String.withConstraint((pk: string) => isValidHex(pk, 64));
export const Hex64RunType = String.withConstraint((sig: string) => isValidHex(sig, 128));
export const String128RunType = String.withConstraint((s: string) => s.length <= 128);
export const NonNegativeNumberRunType = Number.withConstraint((x: number)=> x >= 0);

export type Hex32 = Static<typeof Hex32RunType>;
export type Hex64 = Static<typeof Hex64RunType>;
export type String128 = Static<typeof String128RunType>;
export type NonNegativeNumber = Static<typeof NonNegativeNumberRunType>;