import test from 'node:test';
import assert from 'node:assert/strict';
import { BADGE_CHAR } from '../js/rewards-data.js';
import { VEHICLE_TYPES } from '../js/vehicles.js';

test('BADGE_CHAR 恰好覆盖8种车型，且与 VEHICLE_TYPES 一致', () => {
  assert.deepEqual(Object.keys(BADGE_CHAR).sort(), [...VEHICLE_TYPES].sort());
  assert.equal(Object.keys(BADGE_CHAR).length, 8);
});
