import test from 'node:test';
import assert from 'node:assert/strict';
import {appearance,appearanceScore,drawTracking} from '../runner-tracking.js';
const pose=()=>Array.from({length:33},(_,i)=>({x:[11,23,25].includes(i)?.35:.65,y:[11,12].includes(i)?.3:[23,24].includes(i)?.6:.85,visibility:.99}));
function image(rgb){const data=new Uint8ClampedArray(100*100*4);for(let i=0;i<data.length;i+=4)data.set([...rgb,255],i);return {data,width:100,height:100};}
test('appearance samples image pixels and tolerates uniform lighting changes',()=>{const p=pose(),a=appearance(image([180,40,30]),p),b=appearance(image([90,20,15]),p),c=appearance(image([20,40,180]),p);assert.ok(a.shirt);assert.equal(appearanceScore(a,b),0);assert.equal(appearanceScore(a,c),null);assert.ok(appearance(image([0,0,0]),p).shirt);assert.ok(appearance(image([255,255,255]),p).shirt);});
test('unreliable torso cannot enroll an appearance profile',()=>{const p=pose();p[11].visibility=.1;assert.equal(appearance(image([180,40,30]),p),null);});
test('overlay mirrors camera coordinates and marks the selected player and recovery',()=>{const calls=[];const c=new Proxy({},{get:(o,k)=>o[k]??((...args)=>calls.push([k,...args]))});drawTracking(c,[pose()],0,false,480,360);assert.ok(calls.some(v=>v[0]==='moveTo'&&Math.abs(v[1]-312)<.01));assert.ok(calls.some(v=>v[0]==='fillText'&&v[1]==='PLAYER · LOCKED'));drawTracking(c,[pose()],0,true,480,360);assert.ok(calls.some(v=>v[0]==='fillText'&&v[1]==='PLAYER · WAITING'));assert.equal(c.globalAlpha,1);});
