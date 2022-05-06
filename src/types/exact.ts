import { Runtype } from "runtypes";

const isRuntypeWithAlternatives = (x: Runtype): x is Runtype & { alternatives: Runtype[] } => "alternatives" in x;
const isRuntypeWithIntersectees = (x: Runtype): x is Runtype & { intersectees: Runtype[] } => "intersectees" in x;
const isRuntypeWithFields = (
  x: Runtype,
): x is Runtype & {
  fields: {
    [_: string]: Runtype;
  };
} => "fields" in x;

const fieldsFromRuntype = (runtype: Runtype): string[] => {
  if (isRuntypeWithFields(runtype)) return Object.keys(runtype.fields);
  if (isRuntypeWithIntersectees(runtype))
    return runtype.intersectees.flatMap(intersectee => fieldsFromRuntype(intersectee));
  return [];
};

const isObject = (x: unknown): x is object => typeof x === "object" && x !== null;

export function Exact<TRuntype extends Runtype>(runtype: TRuntype): TRuntype {
  if (isRuntypeWithAlternatives(runtype)) throw Error("Exact cannot be applied to a Union, use Exact on each member of the Union");
  const fields = fieldsFromRuntype(runtype);
  return <TRuntype>(
    (<unknown>(
      runtype.withConstraint(x => isObject(x) && !Object.keys(x).some(key => !fields.includes(key)), {
        name: `Exact(${runtype.reflect.tag})`,
      })
    ))
  );
}