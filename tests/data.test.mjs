import {test} from 'node:test';import assert from 'node:assert/strict';
import {validState,resizeEntry,renameMealEntries} from '../app/src/main/assets/www/data.js';
const result=Object.fromEntries(['k','p','f','c'].map((k,i)=>[k,{low:100/(i+1),mid:200/(i+1),high:300/(i+1)}]));
const entry={id:'one',name:'Блюдо',date:'2026-11-08',portion:100,meal:'Обед',result,input:{weight:1000,portion:100}};
const state={version:1,goals:{k:2450,p:150,f:70,c:305},entries:[entry]};
test('Old backups remain valid and JSON round trip preserves the diary',()=>{assert.equal(validState(state),true);assert.deepEqual(JSON.parse(JSON.stringify(state)),state)});
test('Reject duplicate identifiers, impossible dates, broken ranges and invalid goals',()=>{for(const bad of [{...state,entries:[entry,entry]},{...state,entries:[{...entry,date:'2026-02-31'}]},{...state,goals:{...state.goals,k:0}},{...state,entries:[{...entry,result:{...result,k:{low:30,mid:20,high:40}}}]}])assert.equal(validState(bad),false)});
test('Changing portion scales all uncertainty bands and preserves identity and recipe',()=>{const updated=resizeEntry(entry,{name:'Новое блюдо',portion:250,meal:'Ужин'});assert.equal(updated.id,entry.id);assert.equal(updated.result.k.mid,500);assert.equal(updated.result.k.low,250);assert.equal(updated.result.k.high,750);assert.equal(updated.input.weight,1000);assert.equal(updated.input.portion,250);assert.equal(entry.result.k.mid,200);assert.throws(()=>resizeEntry(entry,{name:'x',portion:1001,meal:'Ужин'}))});
test('Meal renaming keeps consumed calories attached, including swaps and date isolation',()=>{const rows=[entry,{...entry,id:'two',meal:'Ужин'},{...entry,id:'three',date:'2026-11-09'}];const renamed=renameMealEntries(rows,'2026-11-08',{'Обед':'Ужин','Ужин':'Обед'});assert.equal(renamed[0].meal,'Ужин');assert.equal(renamed[1].meal,'Обед');assert.equal(renamed[2].meal,'Обед');assert.equal(renamed[0].result.k.mid,200)});
test('Meal names that match object properties survive unrelated plan edits and backup round trips',()=>{
  const rows=['constructor','toString','__proto__'].map((meal,i)=>({...entry,id:String(i),meal}));
  const renamed=renameMealEntries(rows,'2026-11-08',{'Обед':'Ужин'});
  assert.deepEqual(renamed,rows);
  assert.equal(validState({...state,entries:JSON.parse(JSON.stringify(renamed))}),true);
});
