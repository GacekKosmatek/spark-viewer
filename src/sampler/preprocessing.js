// The methods in this class are used to pre-process the raw data
// sent in the proto. The proto data contains only what is necessary, and
// anything that could be computed based on the raw data is excluded.
//
// The preprocessing happens once, ahead of time when the data is first loaded.
// This means that there is a slightly longer initial delay in loading (in
// practice only a few milliseconds) - but the viewer interactions should then
// be nice and snappy because the data it needs has been pre-computed.

import { wrap as wrapWorker } from 'comlink';

// Creates a wrapped web-worker for more complex preprocessing
export function createWorker() {
    const worker = new Worker(
        new URL('./preprocessingWorker.js', import.meta.url)
    );
    return wrapWorker(worker);
}

// Deterministically assigns a unique integer id to each node in the data.
// This is used primarily for bookmarks (the 'id' of the node is added as
// a query param in the URL), so the that's why the generation of ids needs
// to be deterministic
export function labelData(nodes, i) {
    for (const n of nodes) {
        n.id = i++;
    }
    for (const n of nodes) {
        if (n.children) {
            i = labelData(n.children, i);
        }
    }
    return i;
}

// Uses the 'data.classSources' map to annotate node objects with their source.
// This saves the need for the source information to be duplicated across lots of
// nodes with the same class.
export function labelDataWithSource(data) {
    function visit(sources, nodes) {
        for (const node of nodes) {
            if (
                node.className &&
                !node.className.startsWith(
                    'com.destroystokyo.paper.event.executor.asm.generated.'
                )
            ) {
                const source = sources[node.className];
                if (source) {
                    node.source = source;
                }
            }
            visit(sources, node.children);
        }
    }

    if (data.classSources) {
        for (const thread of data.threads) {
            visit(data.classSources, thread.children);
        }
    }
}
