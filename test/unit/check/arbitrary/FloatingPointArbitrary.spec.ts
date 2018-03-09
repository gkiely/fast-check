import * as assert from 'power-assert';
import fc from '../../../../lib/fast-check';

import Arbitrary from '../../../../src/check/arbitrary/definition/Arbitrary';
import Random from '../../../../src/random/generator/Random';
import { float, double } from '../../../../src/check/arbitrary/FloatingPointArbitrary';

import * as stubRng from '../../stubs/generators';

const MAX_TRIES = 100;
describe("FloatingPointArbitrary", () => {
    const canGenerateFloatingPoint = (mrng: Random, arb: Arbitrary<number>) => {
        for (let idx = 0 ; idx != MAX_TRIES ; ++idx) {
            const g = arb.generate(mrng).value;
            if (g != Math.round(g)) {
                return true;
            }
        }
        return false;
    };

    describe('float', () => {
        it('Should be able to generate a floating point number value', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                return canGenerateFloatingPoint(mrng, float());
            })
        ));
        it('Should generate values between 0 (included) and 1 (excluded)', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const g = float().generate(mrng).value;
                return g >= 0 && g < 1;
            })
        ));
        it('Should shrink towards zero', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = float().generate(mrng);
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                return shrinkable.value == 0.;
            })
        ));
    });
    describe('double', () => {
        it('Should be able to generate a floating point number value', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                return canGenerateFloatingPoint(mrng, double());
            })
        ));
        it('Should generate values between 0 (included) and 1 (excluded)', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                const g = double().generate(mrng).value;
                return g >= 0 && g < 1;
            })
        ));
        it('Should shrink towards zero', () => fc.assert(
            fc.property(fc.integer(), (seed) => {
                const mrng = stubRng.mutable.fastincrease(seed);
                let shrinkable = double().generate(mrng);
                while (shrinkable.shrink().has(v => true)[0]) {
                    shrinkable = shrinkable.shrink().next().value;
                }// only check one shrink path
                return shrinkable.value == 0.;
            })
        ));
    });
});
