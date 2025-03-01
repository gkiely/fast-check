---
slug: /configuration/user-definable-values/
---

# User definable values

Snapshot errors previously encountered and ask for help to reduce cases.

## Run against custom values

Although property-based testing generates values automatically, you may still want to manually define specific examples that you want to test. This could be useful for a variety of reasons, such as testing values that have previously caused your code to fail or confirming that your code succeeds on certain examples.

The `assert` function allows you to set a custom list of examples in its settings. They will be executed before the other values generated by the framework. It is important to note that this does not affect the total number of values tested against your property: if you add 5 custom examples, then 5 generated values will be removed from the run.

The syntax is the following:

```ts
// For a one parameter property
fc.assert(fc.property(fc.nat(), myCheckFunction), {
  examples: [
    [0], // first example I want to test
    [Number.MAX_SAFE_INTEGER],
  ],
});

// For a multiple parameters property
fc.assert(fc.property(fc.string(), fc.string(), fc.string(), myCheckFunction), {
  examples: [
    // Manual case 1
    [
      'replace value coming from 1st fc.string',
      'replace value coming from 2nd fc.string',
      'replace value coming from 3rd fc.string',
    ],
  ],
});
```

:::tip Usage with `context`
If you are using `context` to log within a predicate, you will need to use the following context implementation in your examples.

```ts
const exampleContext = () => fc.sample(fc.context(), { numRuns: 1 })[0];

fc.assert(fc.property(fc.string(), fc.string(), fc.context(), myCheckFunction), {
  examples: [['', '', exampleContext()]],
});
```

:::

:::info Trust the framework
Please keep in mind that property based testing frameworks are fully able to find corner-cases with no help at all.
:::

## Shrink custom values

Not only, you can ask fast-check to run your predicate against manually defined values but you can also ask it for help.

Sometimes, you may discover a bug even before you took time to write a test for it. In some cases, the bug may be difficult to troubleshoot and a smaller test case would be helpful. User definable examples defined in `examples` will be automatically reduced by fast-check if they fail.

```js
function buildQuickLookup(values) {
  const fastValues = Object.fromEntries(values.map((value) => [value, true]));
  return { has: (value) => value in fastValues };
}

fc.assert(
  fc.property(fc.array(fc.string()), fc.string(), (allValues, lookForValue) => {
    // Arrange
    const expectedResult = allValues.includes(lookForValue);

    // Act
    const cache = buildQuickLookup(allValues);

    // Assert
    return cache.has(lookForValue) === expectedResult;
  }),
  {
    examples: [
      // the user definable corner case to reduce
      [[], '__proto__'],
    ],
  }
);
```

Although, most built-in arbitraries come with built-in support for automatic shrinking on user definable values, some minor ajustments might be required on your arbitraries:

- Arbitraries being the result of `.map` have to define the `unmapper` function if they want to be able to shrink user values.
- Arbitraries being the result of `.chain` are not supported at the moment.
- In predicate mode relying on `gen` is not supported at the moment.
- No special treatment needed for: `record`, `string` and many others.

```js
fc.assert(
  fc.property(
    fc.array(fc.string()).map(
      (arr) => arr.join(','),
      (raw) => {
        // unmapper is supposed to handle not supported values by throwing
        if (typeof raw !== 'string') throw new Error('Unsupported');
        // remaining is supported
        return raw.split(',');
      }
    ),
    myCheckFunction
  ),
  {
    examples: [
      // the user definable corner case to reduce
      ['__,proto,__'],
    ],
  }
);
```
