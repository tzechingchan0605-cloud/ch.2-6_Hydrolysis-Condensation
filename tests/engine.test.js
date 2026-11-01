import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES, clone, emptyModel, preset, addNode, join, hydrolyse, components, productKey, chainOrder, initialModels } from '../src/engine.js';
import { dictionary, challenges } from '../src/content.js';

const select = model => model.nodes.map(n => n.id);
for (const [other, product] of [['glucose', 'maltose'], ['fructose', 'sucrose'], ['galactose', 'lactose']]) {
  for (const reversed of [false, true]) {
    test(`${product}: ${reversed ? 'reversed' : 'forward'} order; water and reversible identities`, () => {
      const types = reversed ? [other, 'glucose'] : ['glucose', other];
      const before = preset('carbs', types), immutable = clone(before);
      const result = join(before, select(before), 'carbs');
      assert.deepEqual(before, immutable);
      assert.equal(result.water, 1); assert.equal(result.model.water, 1); assert.equal(result.model.released, 1);
      assert.equal(productKey(components(result.model)[0], 'carbs'), product);
      const after = hydrolyse(result.model, result.model.edges.map(e => e.id), 'carbs').model;
      assert.equal(after.water, 0); assert.equal(after.used, 1); assert.equal(after.edges.length, 0);
      assert.deepEqual(after.nodes, before.nodes);
    });
  }
}
test('unsupported sugar combinations preserve the model and explain scope', () => {
  const before = preset('carbs', ['fructose', 'galactose']);
  const copy = clone(before);
  assert.throws(() => join(before, select(before), 'carbs'), /unsupported/);
  assert.deepEqual(before, copy);
});
test('six glucose units form five bonds and release five water; partial hydrolysis preserves fragments', () => {
  const before = preset('carbs', Array(6).fill('glucose'));
  const result = join(before, select(before), 'carbs');
  assert.equal(result.model.edges.length, 5); assert.equal(result.water, 5);
  const partial = hydrolyse(result.model, [result.model.edges[2].id], 'carbs').model;
  assert.equal(partial.water, 4); assert.equal(partial.used, 1);
  assert.deepEqual(components(partial).map(c => c.nodes.length), [3, 3]);
  const complete = hydrolyse(partial, partial.edges.map(e => e.id), 'carbs').model;
  assert.equal(complete.water, 0); assert.equal(complete.used, 5); assert.equal(components(complete).length, 6);
  assert.deepEqual(complete.nodes, before.nodes);
});
test('glucose fragments can rejoin at their chain ends without branching', () => {
  const before = preset('carbs', Array(6).fill('glucose'), true);
  const partial = hydrolyse(before, [before.edges[2].id], 'carbs').model;
  const result = join(partial, select(partial), 'carbs').model;
  assert.equal(components(result).length, 1); assert.equal(chainOrder(components(result)[0]).length, 6);
  for (const n of result.nodes) assert.ok(result.edges.filter(e => e.a === n.id || e.b === n.id).length <= 2);
});
test('glucose and amino-acid chain limits are enforced', () => {
  for (const [module, type, max, error] of [['carbs', 'glucose', 10, /maxGlucose/], ['proteins', 'aaA', 8, /maxAmino/]]) {
    const valid = preset(module, Array(max).fill(type));
    assert.equal(join(valid, select(valid), module).model.edges.length, max - 1);
    const tooMany = addNode(valid, type, module);
    assert.throws(() => join(tooMany, select(tooMany), module), error);
  }
});
test('triglyceride assembly is sequential, has three sites and preserves fatty-acid identities', () => {
  let model = preset('lipids', ['glycerol', 'fattyA', 'fattyB', 'fattyA']);
  const original = clone(model.nodes);
  for (let i = 1; i <= 3; i++) {
    model = join(model, [model.nodes[0].id, model.nodes[i].id], 'lipids').model;
    assert.equal(model.water, i);
    assert.equal(productKey(components(model)[0], 'lipids'), i === 3 ? 'triglyceride' : 'incomplete');
  }
  const extra = addNode(model, 'fattyB', 'lipids');
  assert.throws(() => join(extra, select(extra), 'lipids'), /threeSites/);
  model = hydrolyse(model, model.edges.map(e => e.id), 'lipids').model;
  assert.equal(model.used, 3); assert.equal(model.water, 0); assert.deepEqual(model.nodes, original);
});
test('lipids require exactly one glycerol', () => {
  const noGlycerol = preset('lipids', ['fattyA', 'fattyB']);
  assert.throws(() => join(noGlycerol, select(noGlycerol), 'lipids'), /needGlycerol/);
  const two = preset('lipids', ['glycerol', 'glycerol', 'fattyA']);
  assert.throws(() => join(two, select(two), 'lipids'), /needGlycerol/);
});
test('four amino acids form three peptide bonds; partial and complete hydrolysis preserve sequence and side chains', () => {
  const before = preset('proteins', ['aaA', 'aaB', 'aaC', 'aaA']);
  const result = join(before, select(before), 'proteins').model;
  assert.equal(result.edges.length, 3); assert.equal(result.water, 3);
  assert.deepEqual(chainOrder(components(result)[0]).map(n => n.type), ['aaA', 'aaB', 'aaC', 'aaA']);
  const partial = hydrolyse(result, [result.edges[1].id], 'proteins').model;
  assert.deepEqual(components(partial).map(c => c.nodes.map(n => n.type)), [['aaA', 'aaB'], ['aaC', 'aaA']]);
  const final = hydrolyse(partial, partial.edges.map(e => e.id), 'proteins').model;
  assert.deepEqual(final.nodes, before.nodes); assert.equal(final.used, 3); assert.equal(final.water, 0);
});
test('hydrolysis requires water and at least one selected bond', () => {
  const model = preset('carbs', ['glucose', 'glucose'], true); model.water = 0;
  const copy = clone(model);
  assert.throws(() => hydrolyse(model, [model.edges[0].id], 'carbs'), /needWater/);
  assert.throws(() => hydrolyse(model, [], 'carbs'), /selectBond/);
  assert.deepEqual(model, copy);
});
for (const [sugar, bases] of [['deoxy', ['A', 'T', 'G', 'C']], ['ribose', ['A', 'U', 'G', 'C']]]) {
  for (const base of bases) test(`${sugar} + ${base}: nucleotide recognition does not alter water`, () => {
    const before = preset('nucleotides', ['phosphate', sugar, `base${base}`]);
    const result = join(before, select(before), 'nucleotides');
    assert.equal(result.process, 'recognition'); assert.equal(result.water, 0); assert.equal(result.model.released, 0);
    assert.equal(components(result.model).length, 1);
    assert.equal(productKey(components(result.model)[0], 'nucleotides'), sugar === 'deoxy' ? 'dnaNucleotide' : 'rnaNucleotide');
  });
}
test('nucleotide recognition rejects wrong sugar/base and duplicated components', () => {
  for (const types of [['phosphate', 'deoxy', 'baseU'], ['phosphate', 'ribose', 'baseT']]) {
    const model = preset('nucleotides', types);
    assert.throws(() => join(model, select(model), 'nucleotides'), /wrongBase/);
  }
  const model = preset('nucleotides', ['phosphate', 'phosphate', 'baseA']);
  assert.throws(() => join(model, select(model), 'nucleotides'), /nucleotideParts/);
});
test('all provided challenge setups are valid and translations include all scientific identifiers', () => {
  for (const task of challenges) assert.ok(preset(task.module, task.types, task.joined));
  for (const [key, translations] of Object.entries(dictionary)) {
    assert.equal(translations.length, 2, key); assert.ok(translations.every(s => typeof s === 'string' && s.length), key);
  }
  for (const type of Object.values(TYPES).flat()) assert.ok(dictionary[type]);
  assert.equal(Object.keys(initialModels()).length, 4);
});
