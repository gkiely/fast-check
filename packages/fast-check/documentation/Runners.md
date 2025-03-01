# [:house:](../README.md) Runners

Runners are the way to make your [arbitraries](./Arbitraries.md) live. They receive a property - _binding between arbitraries and a check function_ - to verify.

This documentation describes all the runners and properties you can use in fast-check.

You can refer to the [API Reference](https://fast-check.dev/) for more details.

## Table of contents

- [Properties](#properties)
- [Runners](#runners)
- [Global configuration](#global-configuration)

## Properties

- `fc.property`: define a new property ie. a list of arbitraries and a test function to assess the success

The predicate would be considered falsy if it throws or if `output` evaluates to `false`.

```typescript
function property<T1>(
        arb1: Arbitrary<T1>,
        predicate: (t1:T1) => (boolean|void)): Property<[T1]>;
function property<T1,T2>(
        arb1: Arbitrary<T1>, arb2: Arbitrary<T2>,
        predicate: (t1:T1,t2:T2) => (boolean|void)): Property<[T1,T2]>;
...
```

- `fc.asyncProperty`: define a new property ie. a list of arbitraries and an asynchronous test function to assess the success

The predicate would be considered falsy if it throws or if `output` evaluates to `false` (after `await`).

```typescript
function asyncProperty<T1>(
        arb1: Arbitrary<T1>,
        predicate: (t1:T1) => Promise<boolean|void>): AsyncProperty<[T1]>;
function asyncProperty<T1,T2>(
        arb1: Arbitrary<T1>, arb2: Arbitrary<T2>,
        predicate: (t1:T1,t2:T2) => Promise<boolean|void>): AsyncProperty<[T1,T2]>;
...
```

**TIPS 1:**

The output of `property` and `asyncProperty` (respectively `Property` and `AsyncProperty`) accepts optional `beforeEach` and `afterEach` hooks that would be invoked before and after the execution of the predicate.

```typescript
property(arb1, predicate)
  .beforeEach(() => {
    /* code executed before each call to predicate */
  })
  .afterEach(() => {
    /* code executed after each call to predicate */
  });

asyncProperty(arb1, predicate)
  .beforeEach(async () => {
    /* code executed before each call to predicate */
  })
  .afterEach(async () => {
    /* code executed after each call to predicate */
  });
```

**TIPS 2:**

If you want to filter invalid entries directly at predicate level, you can use `fc.pre(...)`.

`fc.pre` is responsible for checking for preconditions within predicate scope.

Whenever running a predicate, the framework runs the `fc.pre` instructions as they come and if one of them has a falsy value, it stops the execution flow and asks for another value to run the predicate on.

Contrary to its alternate solution, `.filter(...)`, a run having too many failing `fc.pre(...)` will be marked as faulty. The tolerance before marking such run as faulty can be customized with `maxSkipsPerRun` but it is recommended not to increase it too much - _too many precondition failures means lots of wasted generated values and an inefficient arbitrary definition_.

**WARNING:**

> The predicate function must not change the inputs it received. If it needs to, it has to clone them before going on. Impacting the inputs might led to bad shrinking and wrong display on error.

> Nonetheless a failing property will still be a failing property.

## Runners

- `fc.assert`: run the property and throws in case of failure

**This function has to be awaited in case it is called on an asynchronous property.**

This function is ideal to be called in `describe`, `it` blocks.
It does not return anything in case of success.

It can be parametrized using its second argument.

```typescript
export interface Parameters<T = void> {
  seed?: number; // optional, initial seed of the generator: Date.now() by default
  numRuns?: number; // optional, number of runs before success: 100 by default
  maxSkipsPerRun?: number; // optional, maximal number of skipped entries per run: 100 by default
  timeout?: number; // optional, only taken into account for asynchronous runs (asyncProperty)
  // specify a timeout in milliseconds, maximum time for the predicate to return its result
  // only works for async code, will not interrupt a synchronous code: disabled by default
  path?: string; // optional, way to replay a failing property directly with the counterexample
  // it can be fed with the counterexamplePath returned by the failing test (requires seed too)
  logger?: (v: string) => void; // optional, log output: console.log by default
  unbiased?: boolean; // optional, force the use of unbiased arbitraries: biased by default
  verbose?: boolean; // optional, enable verbose mode: false by default
  // when enabling verbose mode,
  // you will be provided the list of all failing entries encountered
  // whenever a property fails - useful to detect patterns
  examples?: T[]; // optional, custom values added to generated ones: [] by default
  // when set, those examples will be run against the property first
  // followed by the values generated by the framework
  // they do not increase the number of times the property will be launched
  endOnFailure?: boolean; // optional, stop run on failure: false by default
  // it makes the run stop at the first encountered failure without shrinking
  // when used in complement to seed and path
  // it replays only the minimal counterexample
  skipAllAfterTimeLimit?: number; // optional, skip all runs after a given time limit
  // in milliseconds (relies on Date.now): disabled by default
  interruptAfterTimeLimit?: number; // optional, interrupt test execution after a given time limit
  // in milliseconds (relies on Date.now): disabled by default
  markInterruptAsFailure?: boolean; // optional, mark interrupted runs as failure even if preceded by
  // one success or more: disabled by default
  // Interrupted with no success at all always defaults to failure whatever the value of this flag.
  skipEqualValues?: boolean; // optional, skip repeated runs: disabled by default
  // If a same input is encountered multiple times only the first one will be executed,
  // next ones will be skipped. Be aware that skipping runs may lead to property failure
  // if the arbitrary does not have enough values. In that case use `ignoreEqualValues` instead.
  ignoreEqualValues?: boolean; // optional, do not repeat runs with already covered cases: disabled by default
  // Similar to `skipEqualValues` but instead of skipping runs, it just don't rerun them.
  // It can be useful when arbitrary has a limited number of variants.
  reporter?: (runDetails: RunDetails<T>) => void; // optional, custom reporter replacing the default one
  // reporter is responsible for throwing in case of failure, as an example default one throws
  // whenever `runDetails.failed` is true but it is up to you
  // it cannot be used in conjonction with asyncReporter
  // it will be used by assert for both synchronous and asynchronous properties
  asyncReporter?: (runDetails: RunDetails<T>) => Promise<void>; // optional, custom reporter replacing the default one
  // reporter is responsible for throwing in case of failure, as an example default one throws
  // whenever `runDetails.failed` is true but it is up to you
  // it cannot be used in conjonction with reporter
  // it cannot be set on synchronous properties
  // it will be used by assert for asynchronous properties
  errorWithCause?: boolean; // optional, enable Error with cause instead of raw Error including the original error
  // as part of the message. The Error with cause format is currently well supported starting at node ≥16.14.0
  // and by test runners such as vitest (neither jasmine, nor mocha, nor jest supported Error with cause when
  // tested on the 20th of September 2022).
}
```

```typescript
function assert<Ts>(property: IProperty<Ts>, params?: Parameters);
```

- `fc.check`: run the property and return an object containing the test status along with other useful details

**This function has to be awaited in case it is called on an asynchronous property.**

Calling this function should never throw whatever the status of the test. It can be parametrized with the same parameters as `fc.assert`.

```typescript
function check<Ts>(property: IProperty<Ts>, params?: Parameters);
```

The details returned by `fc.check` are the following:

```typescript
interface RunDetails<Ts> {
  failed: boolean; // true in case of failure or too many skips, false otherwise
  interrupted: boolean; // true in case of interrupted run, false otherwise
  numRuns: number; // number of runs (all runs if success, up and including the first failure if failed)
  numSkips: number; // number of skipped entries due to failed pre-condition (before the first failure)
  numShrinks: number; // number of shrinks (depth required to get the minimal failing example)
  seed: number; // seed used for the test
  counterexample: Ts | null; // failure only: shrunk conterexample causig the property to fail
  counterexamplePath: string | null; // failure only: the exact path to re-run the counterexample
  // In order to replay the failing case directly,
  // this value as to be set as path attribute in the Parameters (with the seed)
  // of assert, check, sample or even statistics
  error: string | null; // failure only: stack trace and error details
  failures: Ts[]; // verbose>=1 only: failures that have occurred during the run
  executionSummary: ExecutionTree<Ts>[]; // verbose>=1 only: traces the origin of each value
  // encountered during the test and its status
  runConfiguration: Parameters<Ts>; // configuration of the run, it includes local and global parameters
}
```

Sub-types are available in TypeScript to distinguish between the different types of failures:

| Sub-type                            |                          When                           | `failed` | `interrupted`  | `counterexample`/`counterexamplePath`/`error` |
| ----------------------------------- | :-----------------------------------------------------: | :------: | :------------: | :-------------------------------------------: |
| `RunDetailsFailureProperty<Ts>`     |                failure of the predicate                 |  `true`  | `true`/`false` |                  _not null_                   |
| `RunDetailsFailureTooManySkips<Ts>` |            too many pre-conditions failures             |  `true`  |    `false`     |                    `null`                     |
| `RunDetailsFailureInterrupted<Ts>`  | execution took too long given `interruptAfterTimeLimit` |  `true`  |     `true`     |                    `null`                     |
| `RunDetailsSuccess<Ts>`             |                     successful run                      | `false`  | `true`/`false` |                    `null`                     |

In case you want to base your report on what would have been the default output of fast-check, you can use `fc.defaultReportMessage(out: RunDetails<t>): string | undefined`. It builds the string corresponding to the error message that would have been used by `fc.assert` in case of failure and returns `undefined` if there is no failure.

- `fc.sample`: sample generated values of an `Arbitrary<T>` or `Property<T>`

It builds an array containing all the values that would have been generated for the equivalent test.

It also accept `Parameters` as configuration in order to help you diagnose the shape of the inputs that will be received by your property.

```typescript
type Generator<Ts> = Arbitrary<Ts> | IProperty<Ts>;

function sample<Ts>(generator: Generator<Ts>): Ts[];
function sample<Ts>(generator: Generator<Ts>, params: Parameters): Ts[];
function sample<Ts>(generator: Generator<Ts>, numGenerated: number): Ts[];
```

- `fc.statistics`: classify the values produced by an `Arbitrary<T>` or `Property<T>`

It provides useful statistics concerning generated values.
In order to be able to gather those statistics it has to be provided with a classifier function that can classify the generated value in zero, one or more categories (free labels).

It also accept `Parameters` as configuration in order to help you diagnose the shape of the inputs that will be received by your property.

Statistics are dumped into `console.log` but can be redirected to another source by modifying the `logger` key in `Parameters`.

```typescript
type Generator<Ts> = Arbitrary<Ts> | IProperty<Ts>;
type Classifier<Ts> = ((v: Ts) => string) | ((v: Ts) => string[]);

function statistics<Ts>(generator: Generator<Ts>, classify: Classifier<Ts>): void;
function statistics<Ts>(generator: Generator<Ts>, classify: Classifier<Ts>, params: Parameters): void;
function statistics<Ts>(generator: Generator<Ts>, classify: Classifier<Ts>, numGenerated: number): void;
```

## Global configuration

In order to define the default parameters that will be used by runners you can use one of the following helpers:

- `fc.configureGlobal(parameters: GlobalParameters)`: define the default parameters to be used by runners
- `fc.resetConfigureGlobal()`: reset the default parameters to be used by runners
- `fc.readConfigureGlobal()`: output the default parameters to be used by runners

See [Tips / Setup global settings](./Tips.md#setup-global-settings) for more details.
