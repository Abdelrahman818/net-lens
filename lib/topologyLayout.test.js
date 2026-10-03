import assert from "node:assert/strict";
import test from "node:test";
import { calculateOrthogonalPath, calculateTopologyLayout } from "./topologyLayout.js";

function node(id, type = "switch") {
  return { id, type, label: id, status: "online" };
}

test("centers a parent over the actual immediate child nodes", () => {
  const layout = calculateTopologyLayout(
    [node("root", "router"), node("a", "endpoint"), node("b", "endpoint"), node("c", "endpoint")],
    [
      { source: "root", target: "a" },
      { source: "root", target: "b" },
      { source: "root", target: "c" },
    ]
  );
  const root = layout.nodeById.get("root");
  const children = ["a", "b", "c"].map((id) => layout.nodeById.get(id));
  const minX = Math.min(...children.map((child) => child.x - child.width / 2));
  const maxX = Math.max(...children.map((child) => child.x + child.width / 2));

  assert.equal(root.x, (minX + maxX) / 2);
  assert.ok(maxX - minX < 600);
});

test("a narrow sibling subtree does not inherit a wide sibling subtree width", () => {
  const nodes = [
    node("root", "router"),
    node("wide"),
    node("narrow"),
    ...["1", "2", "3", "4", "5", "6"].map((id) => node(`wide-${id}`, "endpoint")),
    node("narrow-a", "endpoint"),
    node("narrow-b", "endpoint"),
  ];
  const edges = [
    { source: "root", target: "wide" },
    { source: "root", target: "narrow" },
    ...["1", "2", "3", "4", "5", "6"].map((id) => ({ source: "wide", target: `wide-${id}` })),
    { source: "narrow", target: "narrow-a" },
    { source: "narrow", target: "narrow-b" },
  ];
  const layout = calculateTopologyLayout(nodes, edges);
  const narrowChildren = ["narrow-a", "narrow-b"].map((id) => layout.nodeById.get(id));
  const width = Math.max(...narrowChildren.map((child) => child.x + child.width / 2))
    - Math.min(...narrowChildren.map((child) => child.x - child.width / 2));

  assert.ok(width < 400);
});

test("packs independent topology groups into rows without changing their local layout", () => {
  const nodes = Array.from({ length: 250 }, (_, index) => node(`isolated-${index}`, "endpoint"));
  const layout = calculateTopologyLayout(nodes, [], { maxComponentRowWidth: 500 });
  const rows = new Set(layout.nodes.map((item) => item.y));

  assert.ok(rows.size > 1);
  assert.ok(layout.width <= 600);
  assert.equal(layout.nodes.length, 250);
  assert.ok(layout.nodes.every((item) => Number.isFinite(item.x) && Number.isFinite(item.y)));
});

test("uses card-sized bounds and keeps sibling cards from overlapping", () => {
  const layout = calculateTopologyLayout(
    [node("root", "router"), node("a", "endpoint"), node("b", "endpoint")],
    [{ source: "root", target: "a" }, { source: "root", target: "b" }]
  );
  const a = layout.nodeById.get("a");
  const b = layout.nodeById.get("b");

  assert.equal(a.width, 164);
  assert.equal(a.height, 62);
  assert.ok(Math.abs(a.x - b.x) >= (a.width + b.width) / 2);
});

test("wraps wide sibling branches into compact rows centered under their parent", () => {
  const nodes = [node("root", "router"), ...Array.from({ length: 30 }, (_, index) => node(`leaf-${index}`, "endpoint"))];
  const edges = nodes.slice(1).map((child) => ({ source: "root", target: child.id }));
  const layout = calculateTopologyLayout(nodes, edges);
  const root = layout.nodeById.get("root");
  const leaves = layout.nodes.filter((item) => item.id !== "root");
  const rows = new Set(leaves.map((item) => item.y));
  const minX = Math.min(...leaves.map((item) => item.x - item.width / 2));
  const maxX = Math.max(...leaves.map((item) => item.x + item.width / 2));

  assert.ok(rows.size > 1);
  assert.ok(layout.width < 1300);
  assert.equal(root.x, (minX + maxX) / 2);
  for (let first = 0; first < leaves.length; first += 1) {
    for (let second = first + 1; second < leaves.length; second += 1) {
      const a = leaves[first];
      const b = leaves[second];
      const horizontalOverlap = Math.abs(a.x - b.x) < (a.width + b.width) / 2;
      const verticalOverlap = Math.abs(a.y - b.y) < (a.height + b.height) / 2;
      assert.equal(horizontalOverlap && verticalOverlap, false);
    }
  }
});

test("uses tighter spacing for small graphs and more breathing room for large graphs", () => {
  const makeFanout = (count) => {
    const nodes = [node("root", "router"), ...Array.from({ length: count }, (_, index) => node(`leaf-${index}`, "endpoint"))];
    return calculateTopologyLayout(
      nodes,
      nodes.slice(1).map((child) => ({ source: "root", target: child.id }))
    );
  };
  const small = makeFanout(4);
  const large = makeFanout(100);
  const rowGap = (layout) => {
    const children = layout.nodes.filter((item) => item.id !== "root");
    const firstRow = children.filter((item) => item.y === children[0].y).slice(0, 2);
    return Math.abs(firstRow[1].x - firstRow[0].x) -
      (firstRow[0].width + firstRow[1].width) / 2;
  };

  assert.ok(rowGap(small) < rowGap(large));
});

test("keeps the hierarchy gap constant for sparse and dense unwrapped levels", () => {
  const gap = 70;
  const sparseNodes = [node("root", "router"), node("switch"), node("leaf", "endpoint")];
  const sparse = calculateTopologyLayout(
    sparseNodes,
    [{ source: "root", target: "switch" }, { source: "switch", target: "leaf" }]
  );
  const denseNodes = [
    node("dense-root", "router"),
    ...Array.from({ length: 5 }, (_, index) => node(`dense-${index}`, "endpoint")),
  ];
  const dense = calculateTopologyLayout(
    denseNodes,
    denseNodes.slice(1).map((child) => ({ source: "dense-root", target: child.id }))
  );
  const root = sparse.nodeById.get("root");
  const firstChild = sparse.nodeById.get("switch");
  const secondChild = sparse.nodeById.get("leaf");
  const denseRoot = dense.nodeById.get("dense-root");
  const denseChild = dense.nodeById.get("dense-0");

  assert.equal(firstChild.y - firstChild.height / 2 - (root.y + root.height / 2), gap);
  assert.equal(secondChild.y - secondChild.height / 2 - (firstChild.y + firstChild.height / 2), gap);
  assert.equal(denseChild.y - denseChild.height / 2 - (denseRoot.y + denseRoot.height / 2), gap);
});

test("adds only the base gap between actual wrapped rows and accounts for node heights", () => {
  const nodes = [
    node("root", "router"),
    ...Array.from({ length: 5 }, (_, index) => node(`leaf-${index}`, "endpoint")),
  ];
  const layout = calculateTopologyLayout(
    nodes,
    nodes.slice(1).map((child) => ({ source: "root", target: child.id })),
    { maxComponentRowWidth: 400 }
  );
  const root = layout.nodeById.get("root");
  const children = layout.nodes.filter((item) => item.id !== "root");
  const rows = [...new Set(children.map((item) => item.y))].sort((a, b) => a - b);
  const firstRow = children.filter((item) => item.y === rows[0]);
  const secondRow = children.filter((item) => item.y === rows[1]);

  assert.equal(rows.length, 3);
  assert.equal(rows[0] - firstRow[0].height / 2 - (root.y + root.height / 2), 70);
  assert.equal(rows[1] - secondRow[0].height / 2 - (rows[0] + firstRow[0].height / 2), 70);
  assert.equal(rows[2] - children.filter((item) => item.y === rows[2])[0].height / 2 - (rows[1] + secondRow[0].height / 2), 70);
  assert.equal(firstRow[0].height, 62);
});

test("keeps ten-plus hierarchy levels content-driven", () => {
  const nodes = Array.from({ length: 12 }, (_, index) =>
    node(`level-${index}`, index === 0 ? "router" : "switch")
  );
  const edges = nodes.slice(1).map((item, index) => ({
    source: nodes[index].id,
    target: item.id,
  }));
  const layout = calculateTopologyLayout(nodes, edges);

  nodes.slice(1).forEach((item, index) => {
    const parent = layout.nodeById.get(nodes[index].id);
    const child = layout.nodeById.get(item.id);
    assert.equal(
      child.y - child.height / 2 - (parent.y + parent.height / 2),
      70
    );
    assert.ok(calculateOrthogonalPath(edges[index], layout.nodeById));
  });
});

test("orthogonal parent links use node centers rather than canvas bounds", () => {
  const layout = calculateTopologyLayout(
    [node("root", "router"), node("a", "endpoint"), node("b", "endpoint")],
    [{ source: "root", target: "a" }, { source: "root", target: "b" }]
  );
  const path = calculateOrthogonalPath({ source: "root", target: "a" }, layout.nodeById);

  assert.match(path, /M [\d.]+ [\d.]+ V [\d.]+ H [\d.]+ V [\d.]+/);
  assert.doesNotMatch(path, /H 0(?:\.0+)? /);
});

test("ignores null or dangling graph entries safely", () => {
  const layout = calculateTopologyLayout(
    [null, node("root", "router"), node("leaf", "endpoint")],
    [
      null,
      { source: "root", target: "leaf" },
      { source: "missing", target: "leaf" },
    ]
  );

  assert.equal(layout.nodes.length, 2);
  assert.ok(calculateOrthogonalPath(null, layout.nodeById) === "");
  assert.ok(calculateOrthogonalPath({ source: "missing", target: "leaf" }, layout.nodeById) === "");
  assert.ok(calculateOrthogonalPath({ source: "root", target: "leaf" }, layout.nodeById));
});
