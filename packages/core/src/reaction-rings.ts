import { componentsOf, cyclesOf, leadWithLowestKey } from "./cycles";
import { type Invocation, InvocationWalk } from "./invocation-walk";
import { type ReactionChain, type Reactor, routesTo } from "./reaction-walk";
import { Answer, Consumable, Policy, Process } from "./workspace";
import { identityKeyOf } from "./workspace-set";

/**
 * What a ring of the reaction chain is, read over the reactors on it.
 *
 * - `lifecycle`: one process's own life, alone or through policies that only
 *   translate and processes it merely calls, coming back to an instance that
 *   is already running. Not reported.
 * - `spawns`: the same shape, except that what comes back to the process is
 *   one of its `starts`, so every turn begins another instance.
 * - `loop`: any other ring with a reactor on it.
 * - `calls`: no reactor on it at all, inside one context.
 * - `across`: no reactor on it, crossing contexts, which is
 *   `relationship-cycle`'s ring and not reported here.
 */
export type RingVerdict =
	| { kind: "lifecycle" }
	| { kind: "spawns"; process: Process }
	| { kind: "loop" }
	| { kind: "calls" }
	| { kind: "across" };

/** A ring `reaction-cycle` reports: its nodes in order, and what it is. */
export type ReactionRing = { nodes: Reactor[]; verdict: RingVerdict };

/**
 * The rings `reaction-cycle` reports, each one a single invocation runs (see
 * {@link InvocationWalk}).
 *
 * Two jobs, kept apart. The rings a reader is shown are the ones the rule has
 * always named: `cyclesOf`'s, one per back edge of the drawn chain, each a
 * simple ring rotated to its lowest ref, in the order the walk met it. The
 * drawn chain keeps every conditional answer step, so a ring met there is
 * only a candidate, and it is kept when one invocation can run its whole
 * closed walk (see {@link runsAsOneInvocation}). That drops a ring that
 * borrows another reactor's answer (issue #108, twentieth review) without
 * printing every walk the unfolded states allow: read over the states
 * themselves, a hundred relays sharing one front were reported as 5,050
 * rings strung through the chain's per-relay copies instead of the hundred
 * retries they are (issue #108, lead's ruling after the PANIC audit).
 *
 * Whether a ring that must be reported exists is decided separately, region
 * by region over the unfolded states (see {@link hiddenRings}). The candidate
 * walk is not a search: it never walks a node twice, so an exempt ring, or a
 * candidate no invocation runs, can take the only back edge where a genuine
 * ring shares its steps. Where no kept candidate stands in a region that
 * holds a ring to report, the shortest such ring is reported in the same
 * words (issue #108, local audit before the twenty-first review). The
 * unfolded states supply feasibility; they are not a list of rings to print.
 */
export function reactionRings(chain: ReactionChain): ReactionRing[] {
	const walk = new InvocationWalk(chain);
	const met = ringsMet(chain, walk)
		.map((nodes) => ({ nodes, verdict: verdictOf(nodes) }))
		.filter(isReported);
	return [...met, ...hiddenRings(walk, met), ...hiddenCalls(walk, met)];
}

/** Whether `reaction-cycle` speaks about a ring. */
function isReported(ring: ReactionRing): boolean {
	return ring.verdict.kind !== "lifecycle" && ring.verdict.kind !== "across";
}

/**
 * The rings the depth-first walk of the drawn chain meets that one invocation
 * runs, in the order and rotation `cyclesOf` gives them.
 */
function ringsMet(chain: ReactionChain, walk: InvocationWalk): Reactor[][] {
	const entries = new Map(walk.entries().map((entry) => [entry.node, entry]));
	return cyclesOf(
		chain.steps,
		(node) => chain.after(node),
		identityKeyOf,
	).filter((ring) => runsAsOneInvocation(walk, entries, ring));
}

/**
 * Whether one invocation can take every step of a ring and come back to
 * where it began.
 *
 * Begun at a reactor, the walk has no caller to choose: a reactor's state
 * carries none, and each step after it fixes the next state's caller, so the
 * ring is followed state by state, once round, and either every step is one
 * that invocation takes and it closes on the same reactor, or it does not.
 * That is linear in the ring and its steps, with no path or call stack to
 * search. A ring of bare calls has no answer on it, and every call is taken
 * whoever made the first, so it runs as drawn.
 */
function runsAsOneInvocation(
	walk: InvocationWalk,
	entries: Map<Reactor, Invocation>,
	ring: Reactor[],
): boolean {
	const at = ring.findIndex(isReactor);
	if (at < 0) return true;
	let state: Invocation | undefined = entries.get(ring[at]!);
	for (let step = 1; step <= ring.length && state; step++) {
		const node = ring[(at + step) % ring.length];
		state = walk.next(state).find((next) => next.node === node);
	}
	return state !== undefined;
}

// --- what a reactor does on a ring --------------------------------------

/**
 * How a ring passes through one reactor, which is all any exemption reads:
 *
 * - `translates`: a policy woken by its anti-corruption-layer subscription and
 *   leaving by an operation that raises the event carrying the ring on.
 * - `acts`: any other policy.
 * - `called`: a process the ring enters on one of its `starts` and leaves on
 *   one of its `ends`.
 * - `lives`: any other process, woken while alive.
 * - `spawns`: any other process, woken by one of its `starts`.
 */
type Visit = "translates" | "acts" | "called" | "lives" | "spawns";

const isLive = (visit: Visit) => visit === "lives" || visit === "spawns";

/** A visit that leaves a ring exempt: the layer, or a process it calls. */
const isPassingThrough = (visit: Visit) =>
	visit === "translates" || visit === "called";

function isReactor(node: Reactor): node is Policy | Process {
	return node instanceof Policy || node instanceof Process;
}

/**
 * What one reactor's visit is, from the step that woke it and whether the way
 * it leaves keeps an exemption open (see {@link leaves}).
 *
 * A process the ring merely calls is the commonest second process on a ring:
 * a triage process issues a booking operation, a scheduling process starts on
 * it, and its end is the slot the triage process was waiting for. At process
 * granularity that is a call and an answer; the instance was born on the way
 * in and finished on the way out, so nothing about the ring keeps it alive
 * (decision 23, amendment of 2026-09-10, second; card 116). The exit is
 * looked for along the ring's own steps out of the process, up to the next
 * reactor, because read as "the ring holds an `ends` of this process
 * somewhere" it would exempt a process that ends on a fact raised in a
 * different arm of the ring.
 *
 * A translating policy is the gateway NorthBank's honest wiring needed: it
 * hears the scheme's answer through its own translated consumption and
 * republishes it as the bank's fact, holding no state and starting nothing
 * the process did not start (decision 23, amended 2026-09-10, second; card
 * 108). Read on the policy alone, as it was until card 113, any policy with
 * such a subscription anywhere counted; it is the ring's own steps that are
 * checked, the trigger that woke it here and the operation it leaves by.
 */
function visitOf(
	reactor: Policy | Process,
	before: Reactor,
	leavesOpen: boolean,
): Visit {
	if (reactor instanceof Policy)
		return heardThroughLayer(reactor, before) && leavesOpen
			? "translates"
			: "acts";
	if (
		leavesOpen &&
		before instanceof Consumable &&
		reactor.startEvents.includes(before)
	)
		return "called";
	return reEntersWhileAlive(reactor, before) ? "lives" : "spawns";
}

/** Whether the step that woke a policy is its anti-corruption subscription. */
function heardThroughLayer(policy: Policy, trigger: Reactor): boolean {
	if (!(trigger instanceof Consumable)) return false;
	const bc = policy.boundedcontext;
	return [...bc.aggregates.values(), ...bc.services.values()].some((member) =>
		member.consumptions.some(
			(c) =>
				c.consumable === trigger &&
				c.pattern === "anti-corruption-layer" &&
				c.by.includes(policy),
		),
	);
}

/**
 * Whether the way a reactor leaves keeps its visit exempt, read one step at a
 * time over the nodes after it up to and including the next reactor: for a
 * policy, that it issues an operation that raises the next node; for a
 * process, that one of its `ends` comes before the next reactor. Folded one
 * node at a time so a ring and a walk of the chain read it the same way.
 */
function leaves(
	reactor: Policy | Process,
	open: boolean,
	at: number,
	node: Reactor,
	previous: Reactor,
): boolean {
	if (reactor instanceof Process)
		return open || reactor.endEvents.some((end) => end === node);
	if (at === 0)
		return node instanceof Consumable && reactor.commands.includes(node);
	if (at === 1)
		return (
			open &&
			previous instanceof Consumable &&
			node instanceof Consumable &&
			previous.raisedEvents.includes(node)
		);
	return open;
}

/**
 * Whether the step that wakes a process continues an instance that is
 * already running, rather than beginning another one.
 *
 * Three ways it does: the process's own deadline, which runs from the
 * process back to itself; an event or an answer named in `on`; and an answer
 * routed through one of the process's calls, which is the same wait seen from
 * the call that carries it (see {@link routesTo}). A trigger that is both a
 * `starts` and an `on` is a wait as well as a start. A step into a `starts`
 * trigger makes an instance, so no instance's state holds the ring together
 * (card 104); it is asked about before the answer, so a process that starts
 * on and issues one operation is reported for what it does (decision 23,
 * third amendment of 2026-09-10; card 135).
 */
function reEntersWhileAlive(process: Process, before: Reactor): boolean {
	if (before === process) return true;
	if (process.events.some((trigger) => trigger === before)) return true;
	if (before instanceof Consumable && process.startEvents.includes(before))
		return false;
	return process.events.some(
		(trigger) =>
			trigger instanceof Answer &&
			routesTo(process, trigger.operation).includes(before),
	);
}

// --- what a ring is --------------------------------------------------------

/**
 * Each reactor's place on a ring, read by position so a walk that passes a
 * node twice reads each pass for itself: the node before it, whether the way
 * it leaves keeps its visit exempt, the next reactor and the node just before
 * that one.
 */
type Place = {
	reactor: Policy | Process;
	before: Reactor;
	open: boolean;
	next: Policy | Process;
	last: Reactor;
};

function placesOn(ring: Reactor[]): Place[] {
	const places: Place[] = [];
	ring.forEach((reactor, at) => {
		if (!isReactor(reactor)) return;
		let open = false;
		let last: Reactor = reactor;
		for (let step = 0; step < ring.length; step++) {
			const node = ring[(at + 1 + step) % ring.length]!;
			open = leaves(reactor, open, step, node, last);
			if (isReactor(node)) {
				const before = ring[(at + ring.length - 1) % ring.length]!;
				places.push({ reactor, before, open, next: node, last });
				return;
			}
			last = node;
		}
	});
	return places;
}

const visitAt = (place: Place) =>
	visitOf(place.reactor, place.before, place.open);

/**
 * What a ring is (see {@link RingVerdict}).
 *
 * A process fed by its own steps is a lifecycle and not a ring: it holds
 * state and declares what ends it (decision 23). It stays one when the ring
 * runs through policies that only translate or processes it merely calls,
 * which are the layer and the call rather than second reactors living on the
 * ring, and when what comes back to it continues an instance. Every other
 * policy, a second live process, or none at all makes it a loop nobody on it
 * can see the whole of. The contexts the ring crosses do not come into it:
 * card 102 tried narrowing the exemption to the process's own context and
 * made NorthBank's onboarding and RiverMart's checkout warn.
 *
 * A ring with no reactor at all is not a chain of reactions but calls. Where
 * every step of it crosses a context `relationship-cycle` already reports it,
 * so this rule speaks only where it stays inside one (decision 20, note of
 * 2026-09-10; card 108).
 */
function verdictOf(ring: Reactor[]): RingVerdict {
	const visits = placesOn(ring).map((place): [Policy | Process, Visit] => [
		place.reactor,
		visitAt(place),
	]);
	if (visits.length === 0)
		return new Set(ring.map((node) => node.boundedcontext)).size > 1
			? { kind: "across" }
			: { kind: "calls" };
	if (visits.some(([, visit]) => visit === "acts")) return { kind: "loop" };
	const live = visits.filter(([, visit]) => isLive(visit));
	const processes = new Set(live.map(([reactor]) => reactor));
	if (processes.size !== 1) return { kind: "loop" };
	const [process] = processes as Set<Process>;
	return live.every(([, visit]) => visit === "lives")
		? { kind: "lifecycle" }
		: { kind: "spawns", process: process! };
}

// --- regions where a reported ring may hide ----------------------------

/**
 * One way from a reactor to the next: the reactor, the nodes between, and
 * the two facts the next visit reads, the node before the next reactor and
 * whether the way this reactor left keeps its visit exempt.
 */
type Segment = {
	from: Policy | Process;
	to: Policy | Process;
	open: boolean;
	before: Reactor;
	/** The reactor and the nodes after it, up to the next reactor. */
	nodes: Reactor[];
	key: string;
};

/** Two segments joined at a reactor, and what that visit is. */
type Pass = { into: Segment; out: Segment; visit: Visit };

/**
 * The rings to report that the depth-first walk could not see, one per
 * region: a set of segments each reaching every other, so that any passes
 * through it join into one closed walk an invocation runs.
 *
 * A ring is a closed walk of reactor visits, and every visit is decided by
 * the segment that comes in and the segment that goes out. A region with a
 * pass that `acts`, or with live passes of two different processes, holds a
 * loop, because a closed walk can take any of its passes; one whose passes
 * that only translate or are called close a walk on their own holds a loop
 * with no live process; and one where a process's own passes and those
 * alone close a walk through a pass that spawns holds a ring that spawns.
 * Any other region holds only exempt rings. The shortest walk through the
 * first such pass, in that order, is the witness, so a reader is shown the
 * fewest steps that make the point.
 *
 * Bounds: at most nodes × (reactors + 1) states, each walked from each
 * reactor with two flags and three depths, so segments and passes are finite
 * and every search is a breadth-first walk over passes in one region. No
 * path is enumerated and no call stack is unwound.
 */
function hiddenRings(
	walk: InvocationWalk,
	reported: ReactionRing[],
): ReactionRing[] {
	const segments = segmentsOf(walk);
	const outOf = new Map<Policy | Process, Segment[]>();
	for (const segment of segments) {
		const out = outOf.get(segment.from);
		if (out) out.push(segment);
		else outOf.set(segment.from, [segment]);
	}
	const passesOut = (into: Segment): Pass[] =>
		(outOf.get(into.to) ?? []).map((out) => ({
			into,
			out,
			visit: visitOf(into.to, into.before, out.open),
		}));
	const region = componentsOf(
		segments,
		(segment) => outOf.get(segment.to) ?? [],
	);
	const byKey = new Map(segments.map((segment) => [segment.key, segment]));
	const covered = new Set<number>();
	for (const { nodes } of reported)
		for (const place of placesOn(nodes)) {
			const segment = byKey.get(
				segmentKey(place.reactor, place.open, place.next, place.last),
			);
			if (segment) covered.add(region.get(segment)!);
		}
	const hidden: ReactionRing[] = [];
	const done = new Set<number>(covered);
	for (const segment of segments) {
		const id = region.get(segment)!;
		if (done.has(id)) continue;
		done.add(id);
		const inside = (pass: Pass) => region.get(pass.out) === id;
		const passes = segments
			.filter((it) => region.get(it) === id)
			.flatMap((into) => passesOut(into).filter(inside));
		const nodes = witnessIn(passes, (into) => passesOut(into).filter(inside));
		if (nodes) {
			const ring = leadWithLowestKey(nodes, identityKeyOf);
			const verdict = verdictOf(ring);
			if (isReported({ nodes: ring, verdict }))
				hidden.push({ nodes: ring, verdict });
		}
	}
	return hidden;
}

/**
 * The shortest closed walk through one region that must be reported, as its
 * nodes, or none where every closed walk there is exempt. The conditions are
 * asked in the order {@link hiddenRings} gives, each over every pass that
 * could anchor it.
 */
function witnessIn(
	passes: Pass[],
	passesOut: (into: Segment) => Pass[],
): Reactor[] | undefined {
	const anyPass = () => true;
	const conditions: Array<{
		anchors: (pass: Pass) => boolean;
		allowed: (anchor: Pass) => (pass: Pass) => boolean;
		needs?: (anchor: Pass) => (pass: Pass) => boolean;
	}> = [
		{ anchors: (pass) => pass.visit === "acts", allowed: () => anyPass },
		{
			anchors: (pass) => isLive(pass.visit),
			allowed: () => anyPass,
			needs: (anchor) => (pass) =>
				isLive(pass.visit) && pass.into.to !== anchor.into.to,
		},
		{
			anchors: (pass) => isPassingThrough(pass.visit),
			allowed: () => (pass) => isPassingThrough(pass.visit),
		},
		{
			anchors: (pass) => pass.visit === "spawns",
			allowed: (anchor) => (pass) =>
				isPassingThrough(pass.visit) || pass.into.to === anchor.into.to,
		},
	];
	for (const { anchors, allowed, needs } of conditions) {
		let best: Segment[] | undefined;
		for (const anchor of passes.filter(anchors)) {
			const back = shortestBack(
				anchor,
				passesOut,
				allowed(anchor),
				needs?.(anchor),
			);
			if (back && (!best || back.length < best.length)) best = back;
		}
		if (best) return best.flatMap((segment) => segment.nodes);
	}
	return undefined;
}

/**
 * The shortest closed walk of segments that takes `anchor` and then only
 * passes `allowed`, meeting a pass that `needs` on the way where one is
 * asked for: a breadth-first walk from the segment the anchor leaves by back
 * to the one it came in on.
 */
function shortestBack(
	anchor: Pass,
	passesOut: (into: Segment) => Pass[],
	allowed: (pass: Pass) => boolean,
	needs?: (pass: Pass) => boolean,
): Segment[] | undefined {
	type Item = { segment: Segment; met: boolean; parent?: Item };
	const start: Item = { segment: anchor.out, met: !needs || needs(anchor) };
	// The anchor joins a segment to itself: that segment alone is the walk.
	if (anchor.out === anchor.into && start.met) return [anchor.into];
	const seen = new Set<string>([
		JSON.stringify([start.segment.key, start.met]),
	]);
	const queue: Item[] = [start];
	for (let head = 0; head < queue.length; head++) {
		const item = queue[head]!;
		for (const pass of passesOut(item.segment)) {
			if (!allowed(pass)) continue;
			const met = item.met || (needs?.(pass) ?? false);
			if (pass.out === anchor.into && met) {
				const walk: Segment[] = [anchor.into];
				for (let at: Item | undefined = item; at; at = at.parent)
					walk.splice(1, 0, at.segment);
				return walk;
			}
			const key = JSON.stringify([pass.out.key, met]);
			if (seen.has(key)) continue;
			seen.add(key);
			queue.push({ segment: pass.out, met, parent: item });
		}
	}
	return undefined;
}

/**
 * Every way from each reactor to the next one an invocation reaches, kept
 * once per distinct reading: the two reactors, the node before the second,
 * and whether the first left open (see {@link leaves}). Each is the first
 * such way a breadth-first walk of the invocation states finds.
 */
function segmentsOf(walk: InvocationWalk): Segment[] {
	const segments = new Map<string, Segment>();
	for (const entry of walk.entries()) {
		const from = entry.node;
		if (!isReactor(from)) continue;
		type Item = {
			state: Invocation;
			open: boolean;
			depth: number;
			parent?: Item;
		};
		const nodesTo = (item: Item) => {
			const nodes: Reactor[] = [];
			for (let at: Item | undefined = item; at; at = at.parent)
				nodes.unshift(at.state.node);
			return nodes;
		};
		const start: Item = { state: entry, open: false, depth: 0 };
		const seen = new Set<string>();
		const queue: Item[] = [start];
		for (let head = 0; head < queue.length; head++) {
			const item = queue[head]!;
			for (const next of walk.next(item.state)) {
				const open = leaves(
					from,
					item.open,
					item.depth,
					next.node,
					item.state.node,
				);
				if (isReactor(next.node)) {
					const before = item.state.node;
					const key = segmentKey(from, open, next.node, before);
					if (!segments.has(key))
						segments.set(key, {
							from,
							to: next.node,
							open,
							before,
							nodes: nodesTo(item),
							key,
						});
					continue;
				}
				const depth = Math.min(item.depth + 1, 2);
				const seenKey = JSON.stringify([walk.keyOf(next), open, depth]);
				if (seen.has(seenKey)) continue;
				seen.add(seenKey);
				queue.push({ state: next, open, depth, parent: item });
			}
		}
	}
	return [...segments.values()];
}

/** How a segment is told apart: the four facts its passes read. */
const segmentKey = (
	from: Reactor,
	open: boolean,
	to: Reactor,
	before: Reactor,
) =>
	JSON.stringify([
		identityKeyOf(from),
		open,
		identityKeyOf(to),
		identityKeyOf(before),
	]);

/**
 * The rings of bare calls inside one context that the depth-first walk could
 * not see. A ring of calls crossing contexts is `relationship-cycle`'s and
 * exempt here, and one met first could hide a ring inside one context through
 * the same operations. A ring of calls runs from operation to operation
 * through the operations' own consumptions, so a context's calls form a graph
 * of their own; each region of it that reaches itself and holds no reported
 * ring gets its shortest ring.
 */
function hiddenCalls(
	walk: InvocationWalk,
	reported: ReactionRing[],
): ReactionRing[] {
	const entries = new Map(walk.entries().map((entry) => [entry.node, entry]));
	const operations = [...entries.keys()].filter(
		(node): node is Consumable => node instanceof Consumable,
	);
	const callsWithin = (operation: Consumable) =>
		walk
			.next(entries.get(operation)!)
			.map((state) => state.node)
			.filter(
				(node): node is Consumable =>
					node instanceof Consumable &&
					node.type === "operation" &&
					node.boundedcontext === operation.boundedcontext,
			);
	const region = componentsOf(operations, callsWithin);
	const covered = new Set<number>();
	for (const { nodes, verdict } of reported)
		if (verdict.kind === "calls")
			covered.add(region.get(nodes[0] as Consumable)!);
	const hidden: ReactionRing[] = [];
	for (const operation of operations) {
		const id = region.get(operation)!;
		if (covered.has(id)) continue;
		covered.add(id);
		const ring = shortestRing(operation, (node) =>
			callsWithin(node).filter((next) => region.get(next) === id),
		);
		if (ring)
			hidden.push({
				nodes: leadWithLowestKey(ring, identityKeyOf),
				verdict: { kind: "calls" },
			});
	}
	return hidden;
}

/** The shortest ring from a node back to itself, as its nodes, if any. */
function shortestRing<N>(start: N, nextOf: (node: N) => N[]): N[] | undefined {
	const parent = new Map<N, N>();
	const queue: N[] = [start];
	for (let head = 0; head < queue.length; head++) {
		const node = queue[head]!;
		for (const next of nextOf(node)) {
			if (next === start) {
				const ring = [node];
				while (ring[0] !== start) ring.unshift(parent.get(ring[0]!)!);
				return ring;
			}
			if (parent.has(next)) continue;
			parent.set(next, node);
			queue.push(next);
		}
	}
	return undefined;
}
