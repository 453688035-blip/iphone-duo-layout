import assert from 'node:assert/strict';
import test from 'node:test';
import { auditClone, collectGeometry, mapClone, snapshotTree } from './audit.mjs';

const translation = (x, y) => [[1, 0, x], [0, 1, y]];

function scene(id, options = {}, children = []) {
  const node = {
    id,
    type: 'FRAME',
    name: id,
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    absoluteTransform: translation(0, 0),
    children,
    ...options,
  };
  children.forEach(child => { child.parent = node; });
  return node;
}

test('clone mapping retains hidden layers and validates ordered structure before edits', () => {
  const hiddenText = scene('hidden', { type: 'TEXT', visible: false });
  const hiddenCopy = scene('hidden-copy', { type: 'TEXT', name: 'hidden', visible: false });
  const source = scene('source', {}, [hiddenText]);
  const target = scene('target', { name: 'source' }, [hiddenCopy]);
  const map = mapClone(source, target);
  assert.equal(map.get('hidden'), hiddenCopy);
  hiddenCopy.name = 'other';
  assert.throws(() => mapClone(source, target), /hidden/);
});

test('audit accepts resizing and remapped prototype links while preserving bindings and instance overrides', async () => {
  const click = id => [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: id }] }];
  const optionText = { type: 'TEXT', characters: 'Open' };
  const base = {
    type: 'INSTANCE',
    name: 'Open button',
    getMainComponentAsync: async () => ({ id: 'component' }),
    componentProperties: { Size: { type: 'VARIANT', value: 'Normal' } },
    boundVariables: { itemSpacing: { type: 'VARIABLE_ALIAS', id: 'space-variable' } },
    explicitVariableModes: { theme: 'dark' },
  };
  const sourceButton = scene('button', {
    ...base, reactions: click('detail'), overrides: [{ id: 'label', overriddenFields: ['characters', 'width'] }],
  }, [scene('label', optionText)]);
  const targetButton = scene('button-copy', {
    ...base, reactions: click('detail-copy'), overrides: [{ id: 'label-copy', overriddenFields: ['characters'] }],
  }, [scene('label-copy', { ...optionText, name: 'label' })]);
  const source = scene('source', {}, [sourceButton, scene('detail')]);
  const clone = scene('copy', { name: 'source' }, [targetButton, scene('detail-copy', { name: 'detail' })]);
  const before = await snapshotTree(source);
  const mapping = mapClone(source, clone);
  clone.width = 500;
  clone.name = 'Book';
  targetButton.width = 180;
  const clean = await auditClone({ source, before, clone, mapping });
  assert.deepEqual(clean, []);

  targetButton.reactions = click('detail');
  targetButton.boundVariables = {};
  targetButton.getMainComponentAsync = async () => ({ id: 'other-component' });
  sourceButton.height = 72;
  assert.deepEqual((await auditClone({ source, before, clone, mapping })).map(issue => issue.code), [
    'source-changed', 'variable-binding-changed', 'prototype-link-needs-review', 'main-component-changed',
  ]);
});

test('audit reports lost layers and inherited mode changes', async () => {
  const source = scene('source', { resolvedVariableModes: { theme: 'dark' } }, [scene('child')]);
  const clone = scene('copy', { name: 'source', resolvedVariableModes: { theme: 'light' } }, [scene('child-copy', { name: 'child' })]);
  const before = await snapshotTree(source);
  const mapping = mapClone(source, clone);
  clone.children.length = 0;
  assert.deepEqual((await auditClone({ source, before, clone, mapping })).map(issue => [issue.code, issue.severity]), [
    ['resolved-variable-mode-changed', 'warning'], ['missing-layer', 'error'],
  ]);
});

test('an instance whose component set has errors is skipped instead of aborting the audit', async () => {
  // Figma throws from every property read on an instance whose component set
  // itself has errors; the snapshot has to degrade to "unknown".
  const hostError = () => {
    throw new Error('In get_componentProperties: Component set for node has existing errors.');
  };
  const brokenInstance = (id, name) => {
    const node = scene(id, {
      type: 'INSTANCE', name,
      getMainComponentAsync: async () => ({ id: 'component' }),
    });
    for (const key of ['componentProperties', 'componentPropertyReferences', 'overrides']) {
      Object.defineProperty(node, key, { get: hostError, configurable: true });
    }
    return node;
  };
  const source = scene('source', {}, [brokenInstance('broken', 'Broken')]);
  const clone = scene('copy', { name: 'source' }, [brokenInstance('broken-copy', 'Broken')]);
  const before = await snapshotTree(source);
  const mapping = mapClone(source, clone);
  const issues = await auditClone({ source, before, clone, mapping });
  assert.deepEqual(issues, []);
});

test('geometry converts a rotated and scaled frame to local coordinates without counting shadows', () => {
  const root = scene('root', { absoluteTransform: [[0, -2, 250], [2, 0, 300]] }, [
    scene('tap', {
      width: 44, height: 52, opacity: 0,
      absoluteTransform: [[0, -2, 190], [2, 0, 340]],
      absoluteRenderBounds: { x: 60, y: 300, width: 145, height: 150 },
    }),
    scene('hidden', { type: 'TEXT', characters: 'ignored', visible: false }),
  ]);
  const result = collectGeometry(root, new Map([['tap', 'control']]));
  assert.deepEqual(result, {
    nodes: [{ id: 'tap', role: 'control', bounds: { x: 20, y: 30, width: 44, height: 52 } }],
    issues: [],
  });
});

test('geometry checks visible scrolling items without treating intentional offscreen content as overflow', () => {
  const scroll = scene('scroll', { overflowDirection: 'VERTICAL' }, [
    scene('visible', { type: 'TEXT', characters: 'First', width: 50, height: 18 }),
    scene('partial', {
      width: 44, height: 44, absoluteTransform: translation(0, 70),
      reactions: [{ trigger: { type: 'ON_CLICK' } }],
    }),
    scene('below', { type: 'TEXT', characters: 'Last', width: 50, height: 18, absoluteTransform: translation(0, 130) }),
  ]);
  const root = scene('root', {}, [scroll]);
  const result = collectGeometry(root);
  assert.deepEqual(result.nodes.map(node => [node.id, node.role, node.bounds.height]), [
    ['visible', 'content', 18], ['partial', 'critical-content', 30],
  ]);
  assert.deepEqual(result.issues.map(issue => [issue.nodeId, issue.code]), [
    ['partial', 'partial-scroll-item-needs-review'], ['root', 'scroll-end-needs-review'],
  ]);
});

test('geometry flags non-scroll clipping for text inside a control', () => {
  const button = scene('button', { width: 50, height: 44, clipsContent: true }, [
    scene('label', { type: 'TEXT', characters: 'Long button title', width: 100, height: 16 }),
  ]);
  const result = collectGeometry(scene('root', {}, [button]), new Map([['button', 'control']]));
  assert.deepEqual(result.nodes.map(node => node.id), ['button']);
  assert.deepEqual(result.issues, [{ code: 'clipped-foreground', severity: 'warning', nodeId: 'label', detail: 'button' }]);
});
