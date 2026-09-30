import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'../orchestre');
const draft=path.resolve(process.argv.find(x=>x.startsWith('--script='))?.slice(9)||path.join(here,'orchestre.mjs'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'rearmement-259-'));
const tool=path.join(tmp,'outil'), project=path.join(tmp,'projet');
const run=(args,cwd=project,bin=path.join(project,'scripts','orchestre.mjs'))=>{const r=spawnSync(process.execPath,[bin,...args],{cwd,encoding:'utf8',timeout:120000}); if(r.error)throw r.error; return {code:r.status,out:(r.stdout||'')+(r.stderr||'')};};
const expect=(r,code)=>{assert.equal(r.code,code,r.out);return r;};
try {
  fs.mkdirSync(tool);
  for(const name of ['bin','hooks','gabarits','juges','test','package.json']){
    const p=path.join(source,name); if(fs.existsSync(p))fs.cpSync(p,path.join(tool,name),{recursive:true});
  }
  fs.copyFileSync(draft,path.join(tool,'bin','orchestre.mjs'));
  fs.cpSync(path.join(source,'test','projet-factice'),project,{recursive:true});
  for(const args of [['init','-q'],['add','-A'],['-c','user.email=regression@example.invalid','-c','user.name=Regression259','commit','-qm','fixture']]) { const r=spawnSync('git',args,{cwd:project,encoding:'utf8'});assert.equal(r.status,0,r.stderr); }
  expect(run(['init','projet','--projet=regression-259'],tmp,path.join(tool,'bin','orchestre.mjs')),0);
  const orch=path.join(project,'.orchestre');
  // Les deux témoins sont générés par init ; on réserve le témoin d'échec explicitement.
  const id='001-test-echec';
  const verdicts=()=>fs.readFileSync(path.join(orch,'verdicts.jsonl'),'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse).filter(v=>v.id===id);
  const has=(dir)=>fs.existsSync(path.join(orch,dir,id+'.md'));
  const fail=()=>{
    expect(run(['prochaine','--agent=codex-regression','--tache='+id]),0);
    assert.ok(has('en-cours'));
    fs.renameSync(path.join(orch,'en-cours',id+'.md'),path.join(orch,'fait',id+'.md'));
    const r=run(['verifier',id]); assert.notEqual(r.code,0,r.out);assert.ok(has('refuse'));
  };
  fail(); expect(run(['rejouer',id]),0);
  assert.equal(verdicts().filter(v=>v.verdict==='REJOUÉ').length,0,'rejeu ordinaire sans événement');
  fail(); expect(run(['expirer']),0);
  assert.equal(verdicts().at(-1).verdict,'DISJONCTÉE');
  const before=verdicts(); expect(run(['rejouer',id]),3);assert.deepEqual(verdicts(),before);
  expect(run(['rejouer',id,'--forcer']),0);
  assert.equal(verdicts().at(-1).verdict,'REJOUÉ');
  assert.deepEqual(verdicts().slice(0,before.length),before,'historique intact');
  assert.ok(!verdicts().some(v=>v.verdict==='PASS'),'aucun PASS fabriqué');
  const digest=fs.readFileSync(path.join(orch,'digest.md'),'utf8');
  assert.ok(!digest.includes(id+' est DISJONCTÉE'),'Attention réarmée');
  // Première prise après réarmement doit réussir puis un nouvel échec seul ne disjoncte pas.
  fail(); expect(run(['expirer']),0);
  assert.equal(verdicts().filter(v=>v.verdict==='DISJONCTÉE').length,1);
  expect(run(['rejouer',id,'--forcer']),0);
  assert.equal(verdicts().filter(v=>v.verdict==='REJOUÉ').length,1,'--forcer ordinaire sans faux réarmement');
  fail();expect(run(['expirer']),0);
  assert.equal(verdicts().filter(v=>v.verdict==='DISJONCTÉE').length,2,'redisjonction sur nouveaux échecs');
  const snapshot=verdicts();expect(run(['rejouer','999-introuvable','--forcer']),3);assert.deepEqual(verdicts(),snapshot);
  console.log('PASS regression : historique conservé, réarmement, distribution et redisjonction');
  const old=spawnSync(process.execPath,[path.join(source,'test','preuve-026.mjs'),'--groupe=baux','--source='+tool],{cwd:tmp,encoding:'utf8',timeout:180000});
  process.stdout.write((old.stdout||'')+(old.stderr||''));if(old.error)throw old.error;
  assert.equal(old.status,0,'groupe baux existant');
} finally {
  const relative=path.relative(os.tmpdir(),tmp);
  assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative)&&path.basename(tmp).startsWith('rearmement-259-'));
  fs.rmSync(tmp,{recursive:true,force:true});
}
