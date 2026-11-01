// All scientific operations use this graph. Drawings and counters derive from it.
export const MODULES = ['carbs', 'lipids', 'proteins', 'nucleotides'];
export const TYPES = {
  carbs: ['glucose', 'fructose', 'galactose'],
  lipids: ['glycerol', 'fattyA', 'fattyB'],
  proteins: ['aaA', 'aaB', 'aaC'],
  nucleotides: ['phosphate', 'deoxy', 'ribose', 'baseA', 'baseT', 'baseG', 'baseC', 'baseU'],
};
export const clone = value => JSON.parse(JSON.stringify(value));
export const emptyModel = () => ({ nodes: [], edges: [], water: 0, released: 0, used: 0, nextId: 1 });
export function addNode(model, type, module) {
  if (!TYPES[module].includes(type)) throw new Error('wrongBlock');
  if (model.nodes.length >= 16) throw new Error('trayFull');
  const next = clone(model);
  next.nodes.push({ id: `n${next.nextId++}`, type });
  return next;
}
export function preset(module, types, joined = false) {
  let model = emptyModel();
  types.forEach(type => { model = addNode(model, type, module); });
  return joined ? join(model, model.nodes.map(n => n.id), module).model : model;
}
export function components(model) {
  const remaining = new Set(model.nodes.map(n => n.id));
  const result = [];
  while (remaining.size) {
    const stack = [remaining.values().next().value];
    const ids = new Set();
    while (stack.length) {
      const id = stack.pop();
      if (ids.has(id)) continue;
      ids.add(id); remaining.delete(id);
      model.edges.forEach(e => { if (e.a === id) stack.push(e.b); if (e.b === id) stack.push(e.a); });
    }
    result.push({ nodes: model.nodes.filter(n => ids.has(n.id)), edges: model.edges.filter(e => ids.has(e.a)) });
  }
  return result;
}
export function chainOrder(component) {
  if (!component.nodes.length) return [];
  const degree = id => component.edges.filter(e => e.a === id || e.b === id).length;
  let current = component.nodes.find(n => degree(n.id) <= 1)?.id || component.nodes[0].id;
  const order = [], visited = new Set();
  while (current) {
    order.push(component.nodes.find(n => n.id === current)); visited.add(current);
    const edge = component.edges.find(e => (e.a === current && !visited.has(e.b)) || (e.b === current && !visited.has(e.a)));
    current = edge ? (edge.a === current ? edge.b : edge.a) : null;
  }
  return order;
}
export function productKey(comp, module) {
  const types = comp.nodes.map(n => n.type).sort();
  if (types.length === 1) return types[0];
  if (module === 'carbs') {
    if (types.length > 2) return 'polySegment';
    return ({ 'glucose,glucose': 'maltose', 'fructose,glucose': 'sucrose', 'galactose,glucose': 'lactose' })[types.join(',')] || 'unsupported';
  }
  if (module === 'lipids') return comp.nodes.length === 4 ? 'triglyceride' : 'incomplete';
  if (module === 'proteins') return types.length === 2 ? 'dipeptide' : 'polypeptide';
  return types.includes('deoxy') ? 'dnaNucleotide' : 'rnaNucleotide';
}
export function join(model, selected, module) {
  const groups = components(model).filter(c => c.nodes.some(n => selected.includes(n.id)));
  if (groups.length < 2) throw new Error('selectTwo');
  const nodes = groups.flatMap(c => c.nodes);
  const next = clone(model);
  const links = [];
  const link = (a, b) => links.push({ id: `e${next.nextId++}`, a, b });
  if (module === 'carbs' || module === 'proteins') {
    const limit = module === 'carbs' ? 10 : 8;
    if (nodes.length > limit) throw new Error(module === 'carbs' ? 'maxGlucose' : 'maxAmino');
    if (module === 'carbs') {
      const validPair = nodes.length === 2 && ['glucose,glucose', 'fructose,glucose', 'galactose,glucose'].includes(nodes.map(n => n.type).sort().join(','));
      if (!validPair && !nodes.every(n => n.type === 'glucose')) throw new Error('unsupported');
    }
    for (let i = 1; i < groups.length; i++) {
      const previous = chainOrder(groups[i - 1]);
      link(previous.at(-1).id, chainOrder(groups[i])[0].id);
    }
  } else if (module === 'lipids') {
    const glycerols = nodes.filter(n => n.type === 'glycerol');
    if (glycerols.length !== 1) throw new Error('needGlycerol');
    const glycerol = glycerols[0];
    const fatty = nodes.filter(n => n.type.startsWith('fatty'));
    if (fatty.length > 3) throw new Error('threeSites');
    for (const acid of fatty) {
      if (!next.edges.some(e => e.a === acid.id || e.b === acid.id)) link(glycerol.id, acid.id);
    }
  } else {
    const phosphate = nodes.filter(n => n.type === 'phosphate');
    const sugars = nodes.filter(n => ['deoxy', 'ribose'].includes(n.type));
    const bases = nodes.filter(n => n.type.startsWith('base'));
    if (nodes.length !== 3 || phosphate.length !== 1 || sugars.length !== 1 || bases.length !== 1 || groups.some(g => g.edges.length)) throw new Error('nucleotideParts');
    if ((sugars[0].type === 'deoxy' && bases[0].type === 'baseU') || (sugars[0].type === 'ribose' && bases[0].type === 'baseT')) throw new Error('wrongBase');
    link(phosphate[0].id, sugars[0].id); link(sugars[0].id, bases[0].id);
  }
  if (!links.length) throw new Error('selectTwo');
  next.edges.push(...links);
  const water = module === 'nucleotides' ? 0 : links.length;
  next.water += water; next.released += water;
  return { model: next, water, bonds: links.length, process: module === 'nucleotides' ? 'recognition' : 'condensation' };
}
export function hydrolyse(model, edgeIds, module) {
  if (module === 'nucleotides') throw new Error('recognitionOnly');
  const edges = model.edges.filter(e => edgeIds.includes(e.id));
  if (!edges.length) throw new Error('selectBond');
  if (model.water < edges.length) throw new Error('needWater');
  const next = clone(model);
  next.edges = next.edges.filter(e => !edgeIds.includes(e.id));
  next.water -= edges.length; next.used += edges.length;
  return { model: next, water: edges.length, bonds: edges.length, process: 'hydrolysis' };
}
export function initialModels() {
  return {
    carbs: preset('carbs', ['glucose', 'glucose']),
    lipids: preset('lipids', ['glycerol', 'fattyA', 'fattyB', 'fattyA']),
    proteins: preset('proteins', ['aaA', 'aaB', 'aaC', 'aaA']),
    nucleotides: preset('nucleotides', ['phosphate', 'deoxy', 'baseA']),
  };
}
export function enzymeFor(component, module) {
  if (module === 'carbs') return ({ maltose: 'maltase', sucrose: 'sucrase', lactose: 'lactase' })[productKey(component, module)] || 'carbEnzymes';
  return module === 'lipids' ? 'lipidEnzymes' : 'proteases';
}
