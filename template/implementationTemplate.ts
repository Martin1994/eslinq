import { AsyncEnumerable, AsyncOrSync, AsyncOrSyncIterable, AsyncSortedEnumerable } from "./asyncEnumerable";
import { Enumerable, Grouping } from "./enumerable";

// Code generator modifiers
function enumerableWrapper(_target: any, _propertyKey: any, _descriptor: PropertyDescriptor) {
    // Noop
}

abstract class EnumerableTemplate<T> extends AsyncEnumerable<T> {

    public async aggregate<TAccumulate>(
        seed: TAccumulate,
        func: (accumulate: TAccumulate, element: T) => AsyncOrSync<TAccumulate>
    ): Promise<TAccumulate> {
        let accumulate = seed;
        for await (const element of this.iterable) {
            accumulate = await func(accumulate, element);
        }

        return accumulate;
    }

    public async all(predicate: (element: T) => AsyncOrSync<boolean>): Promise<boolean> {
        for await (const element of this.iterable) {
            if (!await predicate(element)) {
                return false;
            }
        }
        return true;
    }

    public async any(predicate?: (element: T) => AsyncOrSync<boolean>): Promise<boolean> {
        if (!predicate) {
            predicate = _ => true;
        }

        for await (const element of this.iterable) {
            if (await predicate(element)) {
                return true;
            }
        }
        return false;
    }

    @enumerableWrapper
    public async *append(element: T): AsyncIterable<T> {
        yield* this.iterable;
        yield element;
    }

    public async average(DO_NOT_ASSIGN: T extends number ? void : never): Promise<number> {
        let sum = 0;
        let count = 0;
        for await (const element of this.iterable as any as AsyncIterable<number>) {
            sum += element;
            count++;
        }

        if (count === 0) {
            throw new Error("Source contains no elements.");
        }

        return sum / count;
    }

    @enumerableWrapper
    public async *concat(secondHalf: AsyncOrSyncIterable<T>): AsyncIterable<T> {
        yield* this.iterable;
        yield* secondHalf;
    }

    public async contains(value: T, comparer?: (lhs: T, rhs: T) => AsyncOrSync<boolean>): Promise<boolean> {
        if (!comparer) {
            comparer = (lhs, rhs) => lhs === rhs;
        }

        for await (const element of this.iterable) {
            if (await comparer(element, value)) {
                return true;
            }
        }
        return false;
    }

    public async count(predicate?: (element: T) => AsyncOrSync<boolean>): Promise<number> {
        if (!predicate) {
            predicate = _ => true;
        }

        let counter = 0;
        for await (const element of this.iterable) {
            if (await predicate(element)) {
                counter++;
            }
        }
        return counter;
    }

    @enumerableWrapper
    public async *defaultIfEmpty(defaultValue: T): AsyncIterable<T> {
        let empty = true;
        for await (const element of this.iterable) {
            empty = false;
            yield element;
        }

        if (empty) {
            yield defaultValue;
        }
    }

    @enumerableWrapper
    public async *distinct(): AsyncIterable<T> {
        const appeared =  new Set<T>();
        for await (const element of this.iterable) {
            if (!appeared.has(element)) {
                yield element;
                appeared.add(element);
            }
        }
    }

    public async elementAt(index: number): Promise<T | undefined> {
        let i = 0;
        for await (const element of this.iterable) {
            if (i === index) {
                return element;
            }
            i++;
        }
        return undefined;
    }

    @enumerableWrapper
    public async *except(that: AsyncOrSyncIterable<T>): AsyncIterable<T> {
        const thisSet = new Set<T>();
        const thatSet = new Set<T>();
        for await (const thatElement of that) {
            thatSet.add(thatElement);
        }
        for await (const thisElement of this.iterable) {
            if (!thisSet.has(thisElement) && !thatSet.has(thisElement)) {
                yield thisElement;
                thisSet.add(thisElement);
            }
        }
    }

    public async first(predicate?: (element: T) => AsyncOrSync<boolean>): Promise<T | undefined> {
        if (!predicate) {
            predicate = _ => true;
        }

        for await (const element of this.iterable) {
            if (await predicate(element)) {
                return element;
            }
        }
        return undefined;
    }

    @enumerableWrapper
    public async *groupBy<TKey, TElement = T, TResult = Grouping<TKey, TElement>>(
        keySelector: (element: T) => AsyncOrSync<TKey>,
        elementSelector?: (element: T) => AsyncOrSync<TElement>,
        resultSelector?: (key: TKey, results: Iterable<TElement>) => AsyncOrSync<TResult>
    ): AsyncIterable<TResult> {
        if (!elementSelector) {
            elementSelector = element => element as any; // Should only be used when TElement is not given
        }

        if (!resultSelector) {
            resultSelector = (key, results) => new Grouping(key, results) as any; // Should only be used when TResult is not given
        }

        const groupMap = new Map<TKey, TElement[]>();
        for await (const element of this.iterable) {
            const key = await keySelector(element);
            let list = groupMap.get(key);
            if (!list) {
                list = [];
                groupMap.set(key, list);
            }

            list.push(await elementSelector(element));
        }

        for (const [key, results] of groupMap) {
            yield resultSelector(key, results);
        }
    }

    @enumerableWrapper
    public async *groupJoin<TInner, TKey, TResult>(
        inner: AsyncOrSyncIterable<TInner>,
        outerKeySelector: (element: T) => AsyncOrSync<TKey>,
        innerKeySelector: (element: TInner) => AsyncOrSync<TKey>,
        resultSelector: (outerElement: T, innerElements: Iterable<TInner>) => AsyncOrSync<TResult>
    ): AsyncIterable<TResult> {
        const innerMap = new Map<TKey, TInner[]>();
        for await (const innerElement of inner) {
            const key = await innerKeySelector(innerElement);
            let list = innerMap.get(key);
            if (!list) {
                list = [];
                innerMap.set(key, list);
            }

            list.push(innerElement);
        }

        for await (const outerElement of this.iterable) {
            const key = await outerKeySelector(outerElement);
            const innerElements: Iterable<TInner> = innerMap.get(key) || Enumerable.empty();
            yield resultSelector(outerElement, innerElements);
        }
    }

    @enumerableWrapper
    public async *intersect(that: AsyncOrSyncIterable<T>): AsyncIterable<T> {
        const thisSet = new Set<T>();
        const thatSet = new Set<T>();
        for await (const thatElement of that) {
            thatSet.add(thatElement);
        }
        for await (const thisElement of this.iterable) {
            if (!thisSet.has(thisElement) && thatSet.has(thisElement)) {
                yield thisElement;
                thisSet.add(thisElement);
            }
        }
    }

    @enumerableWrapper
    public async *join<TInner, TKey, TResult>(
        inner: AsyncOrSyncIterable<TInner>,
        outerKeySelector: (element: T) => AsyncOrSync<TKey>,
        innerKeySelector: (element: TInner) => AsyncOrSync<TKey>,
        resultSelector: (outerElement: T, innerElement: TInner) => AsyncOrSync<TResult>
    ): AsyncIterable<TResult> {
        const innerMap = new Map<TKey, TInner[]>();
        for await (const innerElement of inner) {
            const key = await innerKeySelector(innerElement);
            let list = innerMap.get(key);
            if (!list) {
                list = [];
                innerMap.set(key, list);
            }

            list.push(innerElement);
        }

        for await (const outerElement of this.iterable) {
            const key = await outerKeySelector(outerElement);
            const innerElements: Iterable<TInner> | undefined = innerMap.get(key);
            if (innerElements) {
                for (const innerElement of innerElements) {
                    yield resultSelector(outerElement, innerElement);
                }
            }
        }
    }

    public async last(predicate?: (element: T) => AsyncOrSync<boolean>): Promise<T | undefined> {
        if (!predicate) {
            predicate = _ => true;
        }

        let last: T | undefined = undefined;
        for await (const element of this.iterable) {
            if (await predicate(element)) {
                last = element;
            }
        }
        return last;
    }

    public async max(DO_NOT_ASSIGN: T extends number ? void : never): Promise<number> {
        const generator = (this.iterable as any as AsyncIterable<number>)[Symbol.asyncIterator]();

        let next = await generator.next();
        if (next.done) {
            throw new Error("Source contains no elements.");
        }
        let max = next.value;

        while (!(next = await generator.next()).done) {
            if (next.value > max) {
                max = next.value;
            }
        }
        return max;
    }

    public async min(DO_NOT_ASSIGN: T extends number ? void : never): Promise<number> {
        const generator = (this.iterable as any as AsyncIterable<number>)[Symbol.asyncIterator]();

        let next = await generator.next();
        if (next.done) {
            throw new Error("Source contains no elements.");
        }
        let min = next.value;

        while (!(next = await generator.next()).done) {
            if (next.value < min) {
                min = next.value;
            }
        }
        return min;
    }

    public orderBy<TKey>(keySelector: (element: T) => TKey, comparer?: (lhs: TKey, rhs: TKey) => number): AsyncSortedEnumerable<T> {
        if (comparer) {
            return new AsyncSortedEnumerable(this.iterable, (lhs: T, rhs: T) => comparer(keySelector(lhs), keySelector(rhs)));
        } else {
            return new AsyncSortedEnumerable(this.iterable, (lhs: T, rhs: T): number => {
                const lKey = keySelector(lhs);
                const rKey = keySelector(rhs);
                if (lKey === rKey) {
                    return 0;
                }
                return lKey < rKey ? -1 : 1;
            });
        }
    }

    public orderByDescending<TKey>(keySelector: (element: T) => TKey, comparer?: (lhs: TKey, rhs: TKey) => number): AsyncSortedEnumerable<T> {
        if (comparer) {
            return new AsyncSortedEnumerable(this.iterable, (lhs: T, rhs: T) => comparer(keySelector(rhs), keySelector(lhs)));
        } else {
            return new AsyncSortedEnumerable(this.iterable, (lhs: T, rhs: T): number => {
                const lKey = keySelector(lhs);
                const rKey = keySelector(rhs);
                if (lKey === rKey) {
                    return 0;
                }
                return rKey < lKey ? -1 : 1;
            });
        }
    }

    @enumerableWrapper
    public async *prepend(element: T): AsyncIterable<T> {
        yield element;
        yield* this.iterable;
    }

    @enumerableWrapper
    public async *reverse(): AsyncIterable<T> {
        yield* (await this.toArray()).reverse();
    }

    @enumerableWrapper
    public async *select<TResult>(selector: (element: T, index: number) => AsyncOrSync<TResult>): AsyncIterable<TResult> {
        let i = 0;
        for await (const element of this.iterable) {
            yield selector(element, i);
            i++;
        }
    }

    @enumerableWrapper
    public async *selectMany<TResult>(selector: (element: T, index: number) => AsyncOrSyncIterable<TResult>): AsyncIterable<TResult> {
        let i = 0;
        for await (const element of this.iterable) {
            yield* selector(element, i);
            i++;
        }
    }

    public async sequenceEqual(that: AsyncOrSyncIterable<T>, comparer?: (lhs: T, rhs: T) => AsyncOrSync<boolean>): Promise<boolean> {
        if (!comparer) {
            comparer = (lhs, rhs) => lhs === rhs;
        }

        const thisGenerator = this.iterable[Symbol.asyncIterator]();

        for await (const thatElement of that) {
            const thisIteration = await thisGenerator.next();

            if (thisIteration.done) {
                return false;
            }

            if (!await comparer(thatElement, thisIteration.value)) {
                return false;
            }
        }

        if (!(await thisGenerator.next()).done) {
            return false;
        }

        return true;
    }

    public async single(predicate?: (element: T) => AsyncOrSync<boolean>): Promise<T> {
        if (!predicate) {
            predicate = _ => true;
        }

        let found: boolean = false;
        let result: T | undefined = undefined;

        for await (const element of this.iterable) {
            if (await predicate(element)) {
                if (found) {
                    throw new Error("More than one element is found.");
                }

                found = true;
                result = element;
            }
        }

        if (!found) {
            throw new Error("No element is found.");
        }

        return result!;
    }

    @enumerableWrapper
    public async *skip(count: number): AsyncIterable<T> {
        let i = 0;
        for await (const element of this.iterable) {
            if (i >= count) {
                yield element;
            }
            i++;
        }
    }

    @enumerableWrapper
    public async *skipLast(count: number): AsyncIterable<T> {
        const buffer = new Array(count);

        let i = 0;
        let bufferFull = false;
        for await (const element of this.iterable) {
            if (bufferFull) {
                yield buffer[i];
            }

            buffer[i] = element;

            i++;
            if (i >= count) {
                i = 0;
                bufferFull = true;
            }
        }
    }

    @enumerableWrapper
    public async *skipWhile(predicate: (element: T, index: number) => AsyncOrSync<boolean>): AsyncIterable<T> {
        let skip = true;
        let i = 0;
        for await (const element of this.iterable) {
            if (skip) {
                if (await predicate(element, i)) {
                    i++;
                    continue;
                }
                skip = false;
            }

            yield element;
        }
    }

    public async sum(DO_NOT_ASSIGN: T extends number ? void : never): Promise<number> {
        let sum = 0;
        for await (const element of this.iterable as any as AsyncIterable<number>) {
            sum += element;
        }
        return sum;
    }

    @enumerableWrapper
    public async *take(count: number): AsyncIterable<T> {
        let i = 0;
        for await (const element of this.iterable) {
            if (i < count) {
                yield element;
            }
            i++;
        }
    }

    @enumerableWrapper
    public async *takeLast(count: number): AsyncIterable<T> {
        const buffer = new Array(count);

        let i = 0;
        let bufferFull = false;
        for await (const element of this.iterable) {
            buffer[i] = element;

            i++;
            if (i >= count) {
                i = 0;
                bufferFull = true;
            }
        }

        if (bufferFull) {
            for (let j = i; j < count; j++) {
                yield buffer[j];
            }
        }
        for (let j = 0; j < i; j++) {
            yield buffer[j];
        }
    }

    @enumerableWrapper
    public async *takeWhile(predicate: (element: T, index: number) => AsyncOrSync<boolean>): AsyncIterable<T> {
        let i = 0;
        for await (const element of this.iterable) {
            if (await predicate(element, i)) {
                i++;

                yield element;
            } else {
                return;
            }
        }
    }

    public async toMap<TKey>(keySelector: (element: T) => AsyncOrSync<TKey>): Promise<Map<TKey, T>> {
        const result = new Map<TKey, T>();

        for await (const element of this.iterable) {
            result.set(await keySelector(element), element);
        }

        return result;
    }

    public async toSet(): Promise<Set<T>> {
        const result = new Set<T>();

        for await (const element of this.iterable) {
            result.add(element);
        }

        return result;
    }

    @enumerableWrapper
    public async *union(that: AsyncOrSyncIterable<T>): AsyncIterable<T> {
        const thisSet = new Set<T>();
        const thatSet = new Set<T>();
        for await (const thatElement of that) {
            thatSet.add(thatElement);
        }
        for await (const thisElement of this.iterable) {
            if (!thisSet.has(thisElement)) {
                yield thisElement;
                thisSet.add(thisElement);
            }
            thatSet.delete(thisElement);
        }
        yield* thatSet;
    }

    @enumerableWrapper
    public async *where(predicate: (element: T) => AsyncOrSync<boolean>): AsyncIterable<T> {
        for await (const element of this.iterable) {
            if (await predicate(element)) {
                yield element;
            }
        }
    }

    @enumerableWrapper
    public async *zip<TThat, TResult = [T, TThat]>(that: AsyncOrSyncIterable<TThat>, resultSelector?: (first: T, second: TThat) => AsyncOrSync<TResult>): AsyncIterable<TResult> {
        if (!resultSelector) {
            resultSelector = (first, second) => [first, second] as any; // Should only be used when TResult is not given
        }

        const thisGenerator = this.iterable[Symbol.asyncIterator]();

        for await (const thatElement of that) {
            const thisIteration = await thisGenerator.next();

            if (thisIteration.done) {
                break;
            }

            yield resultSelector(thisIteration.value, thatElement);
        }
    }
}

abstract class SortedEnumerableTemplate<T> extends EnumerableTemplate<T> {
    // Placeholder
    public readonly comparer: (lhs: T, rhs: T) => AsyncOrSync<number> = 0 as any;

    /**
     * @override
     */
    protected get iterable(): AsyncIterable<T> {
        return this.createSortedIterable();
    }

    private async *createSortedIterable(): AsyncIterable<T> {
        const array: T[] = [];
        for await (const element of this.originalIterable) {
            array.push(element);
        }

        if (array.length === 0) {
            return;
        }

        yield* this.sort(array, 0, array.length);
    }

    /**
     * A stable sort algorithm
     */
    private async *sort(source: T[], start: number, end: number): AsyncIterable<T> {
        // Merge sort
        const length = end - start;
        if (length === 1) {
            yield source[start];
            return;
        }

        const middle = start + Math.ceil(length / 2);
        const firstHalf = this.sort(source, start, middle)[Symbol.asyncIterator]();
        const secondHalf = this.sort(source, middle, end)[Symbol.asyncIterator]();

        let firstHalfElement = await firstHalf.next();
        let secondHalfElement = await secondHalf.next();
        while (!firstHalfElement.done || !secondHalfElement.done) {
            if (firstHalfElement.done) {
                yield secondHalfElement.value;
                secondHalfElement = await secondHalf.next();
            } else if (secondHalfElement.done) {
                yield firstHalfElement.value;
                firstHalfElement = await firstHalf.next();
            } else if (await this.comparer(firstHalfElement.value, secondHalfElement.value) <= 0) {
                yield firstHalfElement.value;
                firstHalfElement = await firstHalf.next();
            } else {
                yield secondHalfElement.value;
                secondHalfElement = await secondHalf.next();
            }
        }
    }
}
