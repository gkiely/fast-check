import { restoreGlobals } from '@fast-check/poisoning';
import * as fc from '../../src/fast-check';
import { seed } from './seed';

describe(`Poisoning (seed: ${seed})`, () => {
  it.each<{
    name: string;
    arbitraryBuilder: () => fc.Arbitrary<unknown>;
  }>([
    { name: 'noop', arbitraryBuilder: () => noop() },
    { name: 'noop::chain', arbitraryBuilder: () => noop().chain(() => noop()) },
    { name: 'noop::filter', arbitraryBuilder: () => noop().filter(() => true) },
    { name: 'noop::map', arbitraryBuilder: () => noop().map((v) => v) },
    { name: 'basic', arbitraryBuilder: () => basic() },
    // Boolean
    { name: 'boolean', arbitraryBuilder: () => fc.boolean() },
    // Numeric
    { name: 'integer', arbitraryBuilder: () => fc.integer() },
    { name: 'nat', arbitraryBuilder: () => fc.nat() },
    { name: 'maxSafeInteger', arbitraryBuilder: () => fc.maxSafeInteger() },
    { name: 'maxSafeNat', arbitraryBuilder: () => fc.maxSafeNat() },
    { name: 'float', arbitraryBuilder: () => fc.float() },
    // pure-rand is not resilient to prototype poisoning occuring on Array
    //{ name: 'double', arbitraryBuilder: () => fc.double() },
    { name: 'bigIntN', arbitraryBuilder: () => fc.bigIntN(64) },
    { name: 'bigInt', arbitraryBuilder: () => fc.bigInt() },
    { name: 'bigUintN', arbitraryBuilder: () => fc.bigUintN(64) },
    { name: 'bigUint', arbitraryBuilder: () => fc.bigUint() },
    // String
    // : Single character
    { name: 'hexa', arbitraryBuilder: () => fc.hexa() },
    { name: 'base64', arbitraryBuilder: () => fc.base64() },
    { name: 'char', arbitraryBuilder: () => fc.char() },
    { name: 'ascii', arbitraryBuilder: () => fc.ascii() },
    { name: 'unicode', arbitraryBuilder: () => fc.unicode() },
    { name: 'char16bits', arbitraryBuilder: () => fc.char16bits() },
    { name: 'fullUnicode', arbitraryBuilder: () => fc.fullUnicode() },
    // : Multiple characters
    { name: 'hexaString', arbitraryBuilder: () => fc.hexaString() },
    { name: 'base64String', arbitraryBuilder: () => fc.base64String() },
    { name: 'string', arbitraryBuilder: () => fc.string() },
    { name: 'asciiString', arbitraryBuilder: () => fc.asciiString() },
    { name: 'unicodeString', arbitraryBuilder: () => fc.unicodeString() },
    { name: 'string16bits', arbitraryBuilder: () => fc.string16bits() },
    { name: 'fullUnicodeString', arbitraryBuilder: () => fc.fullUnicodeString() },
    { name: 'stringOf', arbitraryBuilder: () => fc.stringOf(fc.char()) },
    // Combinators
    // : Simple
    { name: 'constant', arbitraryBuilder: () => fc.constant(1) },
    { name: 'constantFrom', arbitraryBuilder: () => fc.constantFrom(1, 2, 3) },
    { name: 'option', arbitraryBuilder: () => fc.option(noop()) },
    { name: 'oneof', arbitraryBuilder: () => fc.oneof(noop(), noop()) },
    { name: 'mapToConstant', arbitraryBuilder: () => fc.mapToConstant(mapToConstantEntry(0), mapToConstantEntry(100)) },
    { name: 'clone', arbitraryBuilder: () => fc.clone(noop(), 2) },
    // : Array
    { name: 'tuple', arbitraryBuilder: () => fc.tuple(noop(), noop()) },
    { name: 'array', arbitraryBuilder: () => fc.array(noop()) },
    { name: 'uniqueArray', arbitraryBuilder: () => fc.uniqueArray(basic()) },
    { name: 'uniqueArray::SameValueZero', arbitraryBuilder: () => fc.uniqueArray(basic(), CmpSameValueZero) },
    { name: 'uniqueArray::IsStrictlyEqual', arbitraryBuilder: () => fc.uniqueArray(basic(), CmpIsStrictlyEqual) },
    { name: 'uniqueArray::Custom', arbitraryBuilder: () => fc.uniqueArray(basic(), { comparator: (a, b) => a === b }) },
    { name: 'subarray', arbitraryBuilder: () => fc.subarray([1, 2, 3, 4, 5]) },
    { name: 'shuffledSubarray', arbitraryBuilder: () => fc.shuffledSubarray([1, 2, 3, 4, 5]) },
    { name: 'sparseArray', arbitraryBuilder: () => fc.sparseArray(noop()) },
    { name: 'infiniteStream', arbitraryBuilder: () => fc.infiniteStream(noop()) },
    // : Object
    { name: 'dictionary', arbitraryBuilder: () => fc.dictionary(basic().map(String), noop()) },
    { name: 'record', arbitraryBuilder: () => fc.record({ a: noop(), b: noop() }) },
    { name: 'record::requiredKeys', arbitraryBuilder: () => fc.record({ a: noop(), b: noop() }, { requiredKeys: [] }) },
    // related to fc.double: pure-rand is not resilient to prototype poisoning occuring on Array
    //{ name: 'object', arbitraryBuilder: () => fc.object() },
    //{ name: 'jsonValue', arbitraryBuilder: () => fc.jsonValue() },
    //{ name: 'unicodeJsonValue', arbitraryBuilder: () => fc.unicodeJsonValue() },
    //{ name: 'anything', arbitraryBuilder: () => fc.anything() },
  ])('should not be impacted by altered globals when using $name', ({ arbitraryBuilder }) => {
    // Arrange
    let runId = 0;
    let failedOnce = false;
    const resultStream = fc.sample(fc.infiniteStream(fc.boolean()), { seed, numRuns: 1 })[0];
    const testResult = (): boolean => {
      if (++runId === 100 && !failedOnce) {
        // Force a failure for the 100th execution if we never encountered any before
        // Otherwise it would make fc.assert green as the property never failed
        return false;
      }
      const ret = resultStream.next().value;
      failedOnce = failedOnce || !ret;
      return ret;
    };
    dropMainGlobals();

    // Act
    let interceptedException: unknown = undefined;
    try {
      fc.assert(
        fc.property(arbitraryBuilder(), (_v) => testResult()),
        { seed }
      );
    } catch (err) {
      interceptedException = err;
    }

    // Assert
    restoreGlobals(); // Restore globals before running real checks
    expect(interceptedException).toBeDefined();
    expect(interceptedException).toBeInstanceOf(Error);
    expect((interceptedException as Error).message).toMatch(/Property failed after/);
  });
});

// Helpers

const own = Object.getOwnPropertyNames;
function dropAllFromObj(obj: unknown): void {
  for (const k of own(obj)) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete obj[k];
    } catch (err) {
      // Object.prototype cannot be deleted, and others might too
    }
  }
}
function dropMainGlobals(): void {
  const mainGlobals = [
    Object,
    Function,
    Array,
    Number,
    Boolean,
    String,
    Symbol,
    Date,
    Promise,
    RegExp,
    Error,
    Map,
    BigInt,
    Set,
    WeakMap,
    WeakSet,
    WeakRef,
    FinalizationRegistry,
    Proxy,
    Reflect,
    Buffer,
    ArrayBuffer,
    SharedArrayBuffer,
    Uint8Array,
    Int8Array,
    Uint16Array,
    Int16Array,
    Uint32Array,
    Int32Array,
    Float32Array,
    Float64Array,
    Uint8ClampedArray,
    BigUint64Array,
    BigInt64Array,
    DataView,
    TextEncoder,
    TextDecoder,
    AbortController,
    AbortSignal,
    EventTarget,
    Event,
    MessageChannel,
    MessagePort,
    MessageEvent,
    //URL,
    URLSearchParams,
    JSON,
    Math,
    Intl,
  ];
  for (const mainGlobal of mainGlobals) {
    if ('prototype' in mainGlobal) {
      dropAllFromObj(mainGlobal.prototype);
    }
    dropAllFromObj(mainGlobal);
  }
}

class NoopArbitrary extends fc.Arbitrary<number> {
  generate(_mrng: fc.Random, _biasFactor: number | undefined): fc.Value<number> {
    return new fc.Value<number>(0, undefined);
  }
  canShrinkWithoutContext(value: unknown): value is number {
    return false;
  }
  shrink(value: number, _context: unknown): fc.Stream<fc.Value<number>> {
    if (value > 5) {
      return fc.Stream.nil();
    }
    return fc.Stream.of(
      new fc.Value<number>(value + 1, undefined), // emulate a shrinker using bare minimal primitives
      new fc.Value<number>(value + 2, undefined),
      new fc.Value<number>(value + 3, undefined)
    );
  }
}
function noop() {
  // Always returns the same value and does not use random number instance.
  // The aim of this arbitrary is to control that we can execute the runner and property even in poisoned context.
  return new NoopArbitrary();
}
class BasicArbitrary extends fc.Arbitrary<number> {
  generate(mrng: fc.Random, _biasFactor: number | undefined): fc.Value<number> {
    return new fc.Value<number>(mrng.nextInt() % 1000, undefined);
  }
  canShrinkWithoutContext(value: unknown): value is number {
    return false;
  }
  shrink(value: number, _context: unknown): fc.Stream<fc.Value<number>> {
    if (value < 10) {
      return fc.Stream.nil();
    }
    return fc.Stream.of(
      new fc.Value<number>((3 * value) / 4, undefined), // emulate a shrinker using bare minimal primitives
      new fc.Value<number>(value / 2, undefined)
    );
  }
}
function basic() {
  // Directly extracting values out of mrng without too many treatments
  return new BasicArbitrary();
}
function mapToConstantEntry(offset: number) {
  return { num: 10, build: (v: number) => v + offset };
}
const CmpSameValueZero = { comparator: 'SameValueZero' as const };
const CmpIsStrictlyEqual = { comparator: 'IsStrictlyEqual' as const };
