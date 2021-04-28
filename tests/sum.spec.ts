import { from } from "../src";

export interface TestCase {
    name: string;
    input: Iterable<number>;
    output: number;
}

describe("LINQ", () => {
    describe.each<TestCase>([
        {
            name: "should sum with non-empty number iterables",
            input: [0, 1, 2, 3],
            output: 6
        },
        {
            name: "should handle empty case",
            input: [],
            output: 0
        }
    ])("Sum", ({name, input, output}) => {
        it(`${name} synchronously`, () => {
            expect(from(input).sum()).toEqual(output);
        });

        it(`${name} asynchronously`, async () => {
            expect(await from(input).asAsync().sum()).toEqual(output);
        });
    });
});
