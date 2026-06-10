import { CardPool } from "./CardPool.js";

// Minimal interface used by BoosterFactory for restricted card pool scenarios
// (e.g. players limited to their MTGA collection). Pass undefined in
// BoosterFactoryOptions.session to use the full unrestricted card pool.
export interface ICardCollection {
	unrestrictedCardPool(): boolean;
	restrictedCollection(sets: string[]): CardPool;
}
