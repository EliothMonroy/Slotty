import assert from 'node:assert/strict';
import test from 'node:test';
import { roll, prizes } from '../lib/game.ts';

test('all three horizontal rows pay and totals add up', () => {
  const result = roll(100, 1, 0, () => 0);
  assert.deepEqual(result.reels, [[0,0,0],[0,0,0],[0,0,0]]);
  assert.deepEqual(result.winningRows, [0,1,2]);
  assert.equal(result.payout, prizes[0] * 3);
});

test('one winning row pays once; vertical matches do not count', () => {
  const values = [0,0,0,.9, .99,0,0,0, .99,0,0,0];
  const result = roll(40, 1, 0, () => values.shift());
  assert.deepEqual(result.reels, [[0,0,0],[0,1,2],[0,1,2]]);
  assert.deepEqual(result.winningRows, [0]);
  assert.equal(result.payout,40);
  const loss=roll(0,1,0,()=>.5);
  assert.equal(loss.win,false);
  assert.equal(loss.payout,0);
  assert.deepEqual(loss.winningRows,[]);
});

test('diamond conversion and multiplier apply to each winning row', () => {
  const result=roll(100,3.5,5,()=>0);
  assert.deepEqual(result.reels,[[3,3,3],[3,3,3],[3,3,3]]);
  assert.equal(result.payout,530*3);
});

test('grid validity, summed payouts, and overall advertised odds at every luck level', () => {
  let seed=42;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32};
  for(let level=0;level<=8;level++){
    let wins=0;
    for(let i=0;i<10000;i++){
      const multiplier=1+(i%6)*.5;
      const result=roll(40+level*5,multiplier,i%6,random);
      assert.equal(result.reels.length,3);
      let expected=0;
      result.reels.forEach((row,index)=>{
        assert.equal(row.length,3);
        assert(row.every(s=>Number.isInteger(s)&&s>=0&&s<5));
        const unique=new Set(row).size;
        assert.equal(result.winningRows.includes(index),unique<3);
        expected+=unique===3?0:Math.round((unique===1?prizes[row[0]]:20)*multiplier/10)*10;
      });
      assert.equal(result.payout,expected);
      assert.equal(result.win,expected>0);
      assert.equal(result.payout%10,0);
      wins+=Number(result.win);
    }
    assert(Math.abs(wins/10000-(40+level*5)/100)<.02);
  }
});
