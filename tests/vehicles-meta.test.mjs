import test from 'node:test';
import assert from 'node:assert/strict';
import { VEHICLE_TYPES, PALETTE, vehicleLockColor } from '../js/vehicles.js';

test('八车型齐备且锁色规则正确', () => {
  assert.deepEqual([...VEHICLE_TYPES].sort(), ['ambulance', 'digger', 'dump', 'fire', 'loader', 'mixer', 'police', 'race'].sort());
  assert.equal(VEHICLE_TYPES.length, 8);
  assert.equal(vehicleLockColor('police'), 'blue');
  assert.equal(vehicleLockColor('fire'), 'red');
  assert.equal(vehicleLockColor('ambulance'), 'skip');
  assert.equal(vehicleLockColor('race'), null);
  assert.ok(Object.keys(PALETTE).includes('blue') && Object.keys(PALETTE).includes('red'));
});
