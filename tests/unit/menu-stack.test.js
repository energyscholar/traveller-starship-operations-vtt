/**
 * AR-252: Menu Stack Unit Tests
 */

const { MenuStack, createMenuStack, renderMenu } = require('../../lib/combat/menu-stack');

// Test runner
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`\x1b[32m✓\x1b[0m ${name}`);
    passed++;
  } catch (err) {
    console.log(`\x1b[31m✗\x1b[0m ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

// Tests
console.log('\n=== Menu Stack Tests ===\n');

console.log('--- Basic Operations ---\n');

test('createMenuStack returns new instance', () => {
  const stack = createMenuStack();
  assert(stack instanceof MenuStack, 'Should be MenuStack instance');
  assertEqual(stack.depth(), 0, 'Should start empty');
});

test('push adds menu to stack', () => {
  const stack = createMenuStack();
  stack.push('Main Menu', [{ label: 'Option 1' }, { label: 'Option 2' }]);
  assertEqual(stack.depth(), 1);
  assertEqual(stack.current().title, 'Main Menu');
});

test('push multiple menus increases depth', () => {
  const stack = createMenuStack();
  stack.push('Level 1', [{ label: 'A' }]);
  stack.push('Level 2', [{ label: 'B' }]);
  stack.push('Level 3', [{ label: 'C' }]);
  assertEqual(stack.depth(), 3);
  assertEqual(stack.current().title, 'Level 3');
});

test('pop removes top menu', () => {
  const stack = createMenuStack();
  stack.push('Level 1', [{ label: 'A' }]);
  stack.push('Level 2', [{ label: 'B' }]);
  const popped = stack.pop();
  assertEqual(popped.title, 'Level 2');
  assertEqual(stack.depth(), 1);
  assertEqual(stack.current().title, 'Level 1');
});

test('pop returns null at root', () => {
  const stack = createMenuStack();
  stack.push('Root', [{ label: 'A' }]);
  const result = stack.pop();
  assertEqual(result, null, 'Should not pop root');
  assertEqual(stack.depth(), 1, 'Stack should still have root');
});

console.log('\n--- Navigation ---\n');

test('selectNext moves selection down', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }, { label: 'C' }]);
  assertEqual(stack.current().selected, 0);
  stack.selectNext();
  assertEqual(stack.current().selected, 1);
  stack.selectNext();
  assertEqual(stack.current().selected, 2);
});

test('selectNext wraps around', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }]);
  stack.selectNext();
  stack.selectNext();
  assertEqual(stack.current().selected, 0, 'Should wrap to start');
});

test('selectPrev moves selection up', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }, { label: 'C' }]);
  stack.current().selected = 2;
  stack.selectPrev();
  assertEqual(stack.current().selected, 1);
});

test('selectPrev wraps around', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }]);
  stack.selectPrev();
  assertEqual(stack.current().selected, 1, 'Should wrap to end');
});

test('selectByNumber selects correct item', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }, { label: 'C' }]);
  const result = stack.selectByNumber(2);
  assertEqual(result, true);
  assertEqual(stack.current().selected, 1);
});

test('selectByNumber returns false for invalid index', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }]);
  const result = stack.selectByNumber(5);
  assertEqual(result, false);
});

test('selectNext skips disabled items', () => {
  const stack = createMenuStack();
  stack.push('Menu', [
    { label: 'A' },
    { label: 'B', disabled: true },
    { label: 'C' }
  ]);
  stack.selectNext();
  assertEqual(stack.current().selected, 2, 'Should skip disabled');
});

console.log('\n--- Breadcrumbs ---\n');

test('getBreadcrumbs returns trail', () => {
  const stack = createMenuStack();
  stack.push('Main', [{ label: 'A' }]);
  stack.push('Sub', [{ label: 'B' }]);
  stack.push('SubSub', [{ label: 'C' }]);
  const crumbs = stack.getBreadcrumbs();
  assertEqual(crumbs.length, 3);
  assertEqual(crumbs[0], 'Main');
  assertEqual(crumbs[2], 'SubSub');
});

test('getBreadcrumbString formats correctly', () => {
  const stack = createMenuStack();
  stack.push('Main', [{ label: 'A' }]);
  stack.push('Sub', [{ label: 'B' }]);
  const str = stack.getBreadcrumbString(' > ');
  assertEqual(str, 'Main > Sub');
});

console.log('\n--- Execution ---\n');

test('executeSelected calls action', () => {
  const stack = createMenuStack();
  let called = false;
  stack.push('Menu', [
    { label: 'Action', action: () => { called = true; return 'result'; } }
  ]);
  const result = stack.executeSelected();
  assert(called, 'Action should be called');
  assertEqual(result.type, 'action');
  assertEqual(result.result, 'result');
});

test('executeSelected pushes submenu', () => {
  const stack = createMenuStack();
  stack.push('Menu', [
    { label: 'Submenu', submenu: [{ label: 'Sub Item' }] }
  ]);
  const result = stack.executeSelected();
  assertEqual(result.type, 'submenu');
  assertEqual(stack.depth(), 2);
  assertEqual(stack.current().title, 'Submenu');
});

test('executeSelected returns null for disabled', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'Disabled', disabled: true, action: () => {} }]);
  const result = stack.executeSelected();
  assertEqual(result, null);
});

console.log('\n--- Context ---\n');

test('context is preserved through stack', () => {
  const stack = createMenuStack();
  stack.push('Level 1', [{ label: 'A' }], { weapon: 'laser' });
  stack.push('Level 2', [{ label: 'B' }], { target: 'enemy' });
  const ctx = stack.getContext();
  assertEqual(ctx.weapon, 'laser');
  assertEqual(ctx.target, 'enemy');
});

console.log('\n--- Input Handling ---\n');

test('handleInput number key selects and executes', () => {
  const stack = createMenuStack();
  let executed = false;
  stack.push('Menu', [
    { label: 'A' },
    { label: 'B', action: () => { executed = true; } }
  ]);
  const result = stack.handleInput('2');
  assert(result.handled);
  assert(executed);
});

test('handleInput escape pops submenu', () => {
  const stack = createMenuStack();
  stack.push('Main', [{ label: 'A' }]);
  stack.push('Sub', [{ label: 'B' }]);
  const result = stack.handleInput('escape');
  assert(result.handled);
  assertEqual(stack.depth(), 1);
});

test('handleInput escape at root returns cancelled', () => {
  const stack = createMenuStack();
  stack.push('Main', [{ label: 'A' }]);
  const result = stack.handleInput('escape');
  assert(result.handled);
  assert(result.cancelled);
});

test('handleInput up/down navigates', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'A' }, { label: 'B' }]);
  stack.handleInput('down');
  assertEqual(stack.current().selected, 1);
  stack.handleInput('up');
  assertEqual(stack.current().selected, 0);
});

console.log('\n--- Rendering ---\n');

test('renderMenu produces output', () => {
  const stack = createMenuStack();
  stack.push('Test Menu', [{ label: 'Option 1' }, { label: 'Option 2' }]);
  const lines = renderMenu(stack);
  assert(lines.length > 0, 'Should have output lines');
  assert(lines.some(l => l.includes('Test Menu')), 'Should include title');
  assert(lines.some(l => l.includes('Option 1')), 'Should include items');
});

test('renderMenu shows breadcrumbs for nested menus', () => {
  const stack = createMenuStack();
  stack.push('Main', [{ label: 'A' }]);
  stack.push('Sub', [{ label: 'B' }]);
  const lines = renderMenu(stack, { showBreadcrumbs: true });
  assert(lines.some(l => l.includes('Main') && l.includes('Sub')), 'Should show breadcrumbs');
});

test('renderMenu shows submenu arrow', () => {
  const stack = createMenuStack();
  stack.push('Menu', [{ label: 'Has Sub', submenu: [{ label: 'Child' }] }]);
  const lines = renderMenu(stack);
  assert(lines.some(l => l.includes('→')), 'Should show submenu arrow');
});

// Summary
console.log('\n========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

process.exit(failed > 0 ? 1 : 0);
