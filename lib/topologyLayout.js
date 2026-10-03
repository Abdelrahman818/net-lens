const DEFAULT_NODE_WIDTH = 184;
const DEFAULT_NODE_HEIGHT = 72;
const ENDPOINT_NODE_WIDTH = 164;
const ENDPOINT_NODE_HEIGHT = 62;
const MIN_HORIZONTAL_GAP = 22;
const MAX_HORIZONTAL_GAP = 50;
const BASE_VERTICAL_GAP = 70;
const MIN_COMPONENT_GAP = 28;
const MAX_COMPONENT_GAP = 56;
const DEFAULT_COMPONENT_ROW_WIDTH = 1200;
const DEFAULT_PADDING = 40;

function layoutSpacing(nodeCount) {
  const density = Math.max(0, Math.min(1, (nodeCount - 12) / 88));
  return {
    horizontalGap: Math.round(MIN_HORIZONTAL_GAP + density * (MAX_HORIZONTAL_GAP - MIN_HORIZONTAL_GAP)),
    componentGap: Math.round(MIN_COMPONENT_GAP + density * (MAX_COMPONENT_GAP - MIN_COMPONENT_GAP)),
  };
}

function nodeSize(node) {
  const endpoint = node.type === "endpoint" ||
    ["pc", "laptop", "printer", "camera", "phone", "ip_phone", "smartphone"].includes(node.type);
  return {
    width: node.width || (endpoint ? ENDPOINT_NODE_WIDTH : DEFAULT_NODE_WIDTH),
    height: node.height || (endpoint ? ENDPOINT_NODE_HEIGHT : DEFAULT_NODE_HEIGHT),
  };
}

function buildGraph(nodes, edges) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map(nodes.map((node) => [node.id, new Set()]));
  const incoming = new Map(nodes.map((node) => [node.id, new Set()]));

  edges.forEach((edge) => {
    if (!edge || edge.source == null || edge.target == null) return;
    if (!byId.has(edge.source) || !byId.has(edge.target) || edge.source === edge.target) return;
    outgoing.get(edge.source).add(edge.target);
    incoming.get(edge.target).add(edge.source);
    outgoing.get(edge.target).add(edge.source);
    incoming.get(edge.source).add(edge.target);
  });

  return { byId, outgoing, incoming };
}

function orderedNeighbors(ids, byId) {
  return [...ids].sort((a, b) => (
    (byId.get(a)?.type === "endpoint" ? 1 : 0) - (byId.get(b)?.type === "endpoint" ? 1 : 0)
    || String(byId.get(a)?.label || "").localeCompare(String(byId.get(b)?.label || ""))
  ));
}

function getComponents(nodes, outgoing, byId) {
  const visited = new Set();
  const components = [];
  nodes.forEach((node) => {
    if (visited.has(node.id)) return;
    const component = [];
    const queue = [node.id];
    visited.add(node.id);
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const id = queue[queueIndex];
      component.push(id);
      orderedNeighbors(outgoing.get(id) || [], byId).forEach((neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }
    components.push(component);
  });
  return components;
}

function chooseRoot(component, incoming, byId) {
  const componentIds = new Set(component);
  const roots = component.filter((id) => ![...incoming.get(id)].some((parent) => componentIds.has(parent)));
  const candidates = roots.length ? roots : component;
  return [...candidates].sort((a, b) => {
    const aNode = byId.get(a);
    const bNode = byId.get(b);
    const aGateway = aNode?.gateway || /gateway|mikrotik|routeros/i.test(`${aNode?.label || ""} ${aNode?.vendor || ""}`);
    const bGateway = bNode?.gateway || /gateway|mikrotik|routeros/i.test(`${bNode?.label || ""} ${bNode?.vendor || ""}`);
    return Number(bGateway) - Number(aGateway)
      || (aNode?.type === "router" ? -1 : 0) - (bNode?.type === "router" ? -1 : 0)
      || String(aNode?.label || "").localeCompare(String(bNode?.label || ""));
  })[0];
}

export function calculateTopologyLayout(nodes = [], edges = [], options = {}) {
  const uniqueNodes = [...new Map(
    nodes
      .filter((node) => node && typeof node === "object" && node.id != null)
      .map((node) => [String(node.id), node])
  ).values()];
  const spacing = layoutSpacing(uniqueNodes.length);
  const horizontalGap = options.horizontalGap ?? spacing.horizontalGap;
  const verticalGap = options.verticalGap ?? BASE_VERTICAL_GAP;
  const componentGap = options.componentGap ?? spacing.componentGap;
  const maxComponentRowWidth = options.maxComponentRowWidth ?? DEFAULT_COMPONENT_ROW_WIDTH;
  const padding = options.padding ?? DEFAULT_PADDING;
  if (!uniqueNodes.length) return { nodes: [], width: padding * 2, height: padding * 2, nodeById: new Map() };

  const validEdges = Array.isArray(edges) ? edges : [];
  const { byId, outgoing, incoming } = buildGraph(uniqueNodes, validEdges);
  const components = getComponents(uniqueNodes, outgoing, byId);
  const positions = new Map();
  const componentLayouts = [];

  components.forEach((component) => {
    const componentIds = new Set(component);
    const root = chooseRoot(component, incoming, byId);
    const parentById = new Map([[root, null]]);
    const childrenById = new Map(component.map((id) => [id, []]));
    const queue = [root];
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const current = queue[queueIndex];
      orderedNeighbors(outgoing.get(current) || [], byId).forEach((neighbor) => {
        if (!componentIds.has(neighbor) || parentById.has(neighbor)) return;
        parentById.set(neighbor, current);
        childrenById.get(current).push(neighbor);
        queue.push(neighbor);
      });
    }
    component.forEach((id) => {
      if (parentById.has(id)) return;
      parentById.set(id, null);
      childrenById.get(id).push(...[]);
    });

    const localPositions = new Map();
    const subtreeLayouts = new Map();
    const measure = (id) => {
      if (subtreeLayouts.has(id)) return subtreeLayouts.get(id);
      const children = childrenById.get(id) || [];
      const size = nodeSize(byId.get(id));
      const childLayouts = children.map((child) => ({ id: child, ...measure(child) }));
      const rows = [];
      let row = [];
      let rowWidth = 0;
      let rowNodeHeight = 0;
      const finishRow = () => {
        rows.push({
          children: row,
          width: rowWidth,
          height: Math.max(...row.map((item) => item.height)),
          nodeHeight: rowNodeHeight,
        });
        row = [];
        rowWidth = 0;
        rowNodeHeight = 0;
      };
      childLayouts.forEach((child) => {
        const nextWidth = rowWidth + (row.length ? horizontalGap : 0) + child.width;
        if (row.length && nextWidth > maxComponentRowWidth) {
          finishRow();
        }
        rowWidth += (row.length ? horizontalGap : 0) + child.width;
        rowNodeHeight = Math.max(rowNodeHeight, child.nodeHeight);
        row.push(child);
      });
      if (row.length) {
        finishRow();
      }

      const width = Math.max(size.width, ...rows.map((item) => item.width));
      let rowOffset = 0;
      let childrenBottom = 0;
      rows.forEach((item) => {
        item.offsetY = rowOffset;
        childrenBottom = Math.max(childrenBottom, rowOffset + item.height);
        rowOffset += item.nodeHeight + verticalGap;
      });
      const height = size.height + (rows.length ? verticalGap + childrenBottom : 0);
      const result = { width, height, nodeHeight: size.height, rows };
      subtreeLayouts.set(id, result);
      return result;
    };

    const place = (id, startX, centerY, depth) => {
      const size = nodeSize(byId.get(id));
      const subtree = measure(id);
      const centerX = startX + subtree.width / 2;
      localPositions.set(id, { x: centerX, y: centerY, depth });
      let rowTop = centerY + size.height / 2 + verticalGap;
      subtree.rows.forEach((row) => {
        let childX = startX + (subtree.width - row.width) / 2;
        row.children.forEach((child) => {
          const childTop = rowTop + (row.nodeHeight - child.nodeHeight) / 2;
          place(
            child.id,
            childX,
            childTop + child.nodeHeight / 2,
            depth + 1
          );
          childX += child.width + horizontalGap;
        });
        rowTop += row.nodeHeight + verticalGap;
      });
    };

    const componentLayout = measure(root);
    place(root, 0, nodeSize(byId.get(root)).height / 2, 0);
    const localNodes = [...localPositions.entries()].map(([id, position]) => {
      const size = nodeSize(byId.get(id));
      return {
        id,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        depth: position.depth,
      };
    });
    componentLayouts.push({
      width: componentLayout.width,
      height: componentLayout.height,
      nodes: localNodes,
    });
  });

  let rowX = padding;
  let rowY = padding;
  let rowHeight = 0;
  let contentWidth = 0;
  componentLayouts.forEach((component) => {
    if (
      rowX > padding &&
      rowX + component.width > padding + maxComponentRowWidth
    ) {
      rowY += rowHeight + componentGap;
      rowX = padding;
      rowHeight = 0;
    }
    component.nodes.forEach((node) => {
      positions.set(node.id, {
        ...node,
        x: rowX + node.x,
        y: rowY + node.y,
      });
    });
    rowX += component.width + componentGap;
    contentWidth = Math.max(contentWidth, rowX - componentGap);
    rowHeight = Math.max(rowHeight, component.height);
  });

  const width = Math.max(padding * 2, contentWidth + padding);
  const maxHeight = rowY + rowHeight + padding;
  const layoutNodes = uniqueNodes.map((node) => ({
    ...node,
    x: positions.get(node.id)?.x || padding,
    y: positions.get(node.id)?.y || padding,
    depth: positions.get(node.id)?.depth ?? 0,
    width: positions.get(node.id)?.width || nodeSize(node).width,
    height: positions.get(node.id)?.height || nodeSize(node).height,
  }));

  return { nodes: layoutNodes, width, height: maxHeight, nodeById: new Map(layoutNodes.map((node) => [node.id, node])) };
}

export function calculateOrthogonalPath(edge, nodeById) {
  if (!edge || !nodeById || typeof nodeById.get !== "function") return "";
  const source = nodeById.get(edge.source);
  const target = nodeById.get(edge.target);
  if (!source || !target ||
      !Number.isFinite(source.x) ||
      !Number.isFinite(source.y) ||
      !Number.isFinite(target.x) ||
      !Number.isFinite(target.y)) return "";
  const sourceBottom = source.y + source.height / 2;
  const targetTop = target.y - target.height / 2;
  const sourceRight = source.x + source.width / 2;
  const targetLeft = target.x - target.width / 2;
  if (target.depth > source.depth) {
    const midpoint = sourceBottom + Math.max(24, (targetTop - sourceBottom) / 2);
    return `M ${source.x} ${sourceBottom} V ${midpoint} H ${target.x} V ${targetTop}`;
  }
  const right = Math.max(sourceRight, targetLeft) + 28;
  return `M ${sourceRight} ${source.y} H ${right} V ${target.y} H ${targetLeft}`;
}
