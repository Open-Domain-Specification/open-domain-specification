/**
 * Rings in directed graphs, shared by the rules that look for them: kinds of
 * kinds, calls between contexts, and reactions.
 */

/** Rotates a ring so its lowest key leads, so the same ring always reads the same way. */
export function leadWithLowestKey<N>(
	ring: N[],
	keyOf: (node: N) => string,
): N[] {
	let lead = 0;
	for (let i = 1; i < ring.length; i++) {
		if (keyOf(ring[i]) < keyOf(ring[lead])) lead = i;
	}
	return [...ring.slice(lead), ...ring.slice(0, lead)];
}

/**
 * One node being walked depth first: the node, and where its walk has got to
 * among the steps out of it. A walk keeps these on a stack of its own, so how
 * deep a graph goes is bounded by memory and not by the engine's call stack;
 * a model read per caller reaches tens of thousands of states in a line
 * (issue #108, PANIC audit).
 */
type Frame<N> = { node: N; steps: Iterator<N> };

/**
 * The rings a directed graph closes on itself, each as its nodes in order.
 *
 * One ring per back edge of the depth-first walk, the shape `aggregate-tree`
 * already uses for `includes`: every cycle carries at least one back edge, so
 * nothing cyclic goes unreported, while a graph with none is walked once.
 * Rings are rotated to their lowest key and de-duplicated by it, so which node
 * the walk happened to start from changes neither the message nor the ref.
 * The walk visits nodes and steps in the order a recursive one would.
 */
export function cyclesOf<N>(
	nodes: Iterable<N>,
	nextOf: (node: N) => Iterable<N>,
	keyOf: (node: N) => string,
): N[][] {
	const rings: N[][] = [];
	const seen = new Set<string>();
	const path: N[] = [];
	const onPath = new Set<N>();
	const walked = new Set<N>();
	const frames: Frame<N>[] = [];

	const enter = (node: N) => {
		onPath.add(node);
		path.push(node);
		frames.push({ node, steps: nextOf(node)[Symbol.iterator]() });
	};

	for (const start of nodes) {
		if (walked.has(start)) continue;
		enter(start);
		while (frames.length > 0) {
			const frame = frames[frames.length - 1]!;
			const step = frame.steps.next();
			if (!step.done) {
				const next = step.value;
				if (onPath.has(next)) {
					const ring = leadWithLowestKey(path.slice(path.indexOf(next)), keyOf);
					const key = ring.map(keyOf).join(">");
					if (seen.has(key)) continue;
					seen.add(key);
					rings.push(ring);
				} else if (!walked.has(next)) enter(next);
				continue;
			}
			frames.pop();
			path.pop();
			onPath.delete(frame.node);
			walked.add(frame.node);
		}
	}
	return rings;
}

/**
 * The strongly connected components of a directed graph, as a component number
 * for every node reached from `nodes`, numbered in the order Tarjan's walk
 * completes them. Two nodes share a number exactly when each reaches the
 * other, so a closed walk through any steps of one component exists, and a
 * closed walk never leaves the component it is in. Linear in nodes and steps,
 * and walked on its own stack of frames like {@link cyclesOf}, in the order a
 * recursive walk would take.
 */
export function componentsOf<N>(
	nodes: Iterable<N>,
	nextOf: (node: N) => Iterable<N>,
): Map<N, number> {
	const component = new Map<N, number>();
	const index = new Map<N, number>();
	const low = new Map<N, number>();
	const stack: N[] = [];
	const onStack = new Set<N>();
	const frames: Frame<N>[] = [];
	let counter = 0;
	let components = 0;

	const enter = (node: N) => {
		index.set(node, counter);
		low.set(node, counter);
		counter++;
		stack.push(node);
		onStack.add(node);
		frames.push({ node, steps: nextOf(node)[Symbol.iterator]() });
	};
	const lower = (node: N, to: number) =>
		low.set(node, Math.min(low.get(node)!, to));

	for (const start of nodes) {
		if (index.has(start)) continue;
		enter(start);
		while (frames.length > 0) {
			const frame = frames[frames.length - 1]!;
			const step = frame.steps.next();
			if (!step.done) {
				const next = step.value;
				if (!index.has(next)) enter(next);
				else if (onStack.has(next)) lower(frame.node, index.get(next)!);
				continue;
			}
			// The node's steps are done: close its component if it is the
			// root of one, then hand its low link back to the node that
			// stepped into it, as returning from a recursive visit would.
			frames.pop();
			const { node } = frame;
			if (low.get(node) === index.get(node)) {
				let member: N;
				do {
					member = stack.pop()!;
					onStack.delete(member);
					component.set(member, components);
				} while (member !== node);
				components++;
			}
			const parent = frames[frames.length - 1];
			if (parent) lower(parent.node, low.get(node)!);
		}
	}
	return component;
}
