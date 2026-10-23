import type {Engine} from './core.js';
import type {ProcessRole} from './process-copy.js';
export const ProcessEvent={Role:0,Select:1,Next:2,Previous:3,First:4,Last:5} as const;
export type ProcessState={role:ProcessRole;step:number;count:number};
export const processCount=(role:number):number=>role===0?6:role===1?5:0;
export function decodeProcess(packed:number):ProcessState {
 const role=packed>>>16,step=packed&65535,count=processCount(role);
 if(!count||step>=count)return {role:'client',step:0,count:6};
 return {role:role===0?'client':'creator',step,count};
}
// Minimal native fallback, also used as an independent parity reference.
export function fallbackProcess(packed:number,event:number,value=0):number {
 const state=decodeProcess(packed);let role=state.role==='client'?0:1,step=state.step;
 if(event===ProcessEvent.Role&&(value===0||value===1)){role=value;step=0;}
 else if(event===ProcessEvent.Select&&Number.isInteger(value)&&value>=0&&value<state.count)step=value;
 else if(event===ProcessEvent.Next)step=(step+1)%state.count;
 else if(event===ProcessEvent.Previous)step=(step+state.count-1)%state.count;
 else if(event===ProcessEvent.First)step=0;
 else if(event===ProcessEvent.Last)step=state.count-1;
 return (role<<16)|step;
}
export const reduceProcess=(engine:Engine,packed:number,event:number,value=0):number=>
 engine.exports?engine.exports.process_reduce(packed,event,value):fallbackProcess(packed,event,value);
