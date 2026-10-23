export type CharacterRole='icp'|'creator';
export type CharacterKind=CharacterRole|'talent';
export type CharacterMetadata={id:string;kind:CharacterKind;name:string;profileLinks:readonly string[]};
export type CharacterPrompt={id:string;label:string;title:string;help:string;placeholder:string};
// ICP wording recovered from app/skill/CharacterSkill.tsx. Creator questions
// recovered from docs/chamber-webinar-workshop.md §8, not newly invented intake.
export const characterPrompts:Record<CharacterRole,readonly CharacterPrompt[]>={
 icp:[
  {id:'desire',label:'Desire',title:'What is this character trying to make true?',help:'Describe the progress, identity or feeling they want—not what you want to sell them.',placeholder:'They want to feel capable of…'},
  {id:'tension',label:'Tension',title:'What makes that desire difficult or contradictory?',help:'Name the friction between where they are and where they want to be.',placeholder:'They want expertise, but resist…'},
  {id:'model',label:'Mimetic model',title:'Who makes the movement feel credible?',help:'Think peer, guide, participant, challenger or aspirational model—not an influencer category.',placeholder:'They trust people who…'},
  {id:'moment',label:'Occasion',title:'When does the need become real enough to act?',help:'A moment, ritual, transition or recurring situation is more useful than a broad demographic.',placeholder:'The need becomes urgent when…'}
 ],
 creator:[
  {id:'expression',label:'Demonstrated expression',title:'What do they repeatedly make or discuss?',help:'Use your own work. Describe recurring subjects, and point to examples where useful.',placeholder:'In my work, I keep returning to…'},
  {id:'voice',label:'Voice & point of view',title:'What is their voice and point of view?',help:'Describe the way you see and express things, in your own words.',placeholder:'The way I see it…'},
  {id:'world',label:'Values & worlds',title:'Which desires, values, settings and communities are visible?',help:'You choose which parts of your work and world to describe.',placeholder:'What runs through my work is…'},
  {id:'formats',label:'Natural forms',title:'What formats appear natural to them?',help:'Think about the forms your work takes, including the disciplines you move between.',placeholder:'I feel most at home making…'},
  {id:'boundaries',label:'Interests & boundaries',title:'What have they intentionally told us about their interests or boundaries?',help:'Declare what you want to make more of, and what is outside your practice or availability.',placeholder:'More of this… / Not this…'},
  {id:'metrics',label:'Useful evidence',title:'Which optional metrics are relevant to this decision?',help:'Metrics are optional. Leave this blank or say “not included” if they are not useful here. A number needs a source and context.',placeholder:'Not included, or the evidence I want to share…'},
  {id:'permission',label:'Your permission',title:'Which information is authorized for matching?',help:'State what may inform an introduction, and what must stay private. This preview does not publish or match your information.',placeholder:'You may use… / Keep private…'}
 ]
};
// Talent uses the same evidence language, with owner-directed presence wording.
export function characterQuestions(kind:CharacterKind):readonly CharacterPrompt[]{
 if(kind!=='talent')return characterPrompts[kind];
 return characterPrompts.creator.map(prompt=>prompt.id==='expression'?{...prompt,title:'How does this character show up?',help:'Describe your presence on camera, on stage, in a room or in the worlds you move through.',placeholder:'When I show up as this character…'}:prompt.id==='formats'?{...prompt,title:'Which appearances and formats feel natural?',help:'Consider screen acting, modelling and print, digital/social, voice work, singing, stage performance or live appearances. You choose what belongs to this character.'}:prompt);
}
export const characterSources={icp:'app/skill/CharacterSkill.tsx',creator:'docs/chamber-webinar-workshop.md §8; docs/juiced-core.md §5'};
export type CharacterAnswers=Record<string,string>;
export function characterReady(prompt:CharacterPrompt,answer:string):boolean {
 return answer.trim().length>=(prompt.id==='metrics'?0:12)&&answer.length<=2000;
}
export function characterRecord(role:CharacterRole,answers:CharacterAnswers,character?:CharacterMetadata){
 return {schema:'anima.character-draft.v1',role,...(character?{character:{...character,profileLinks:[...character.profileLinks]}}:{}),status:'self-supplied draft',promptSource:characterSources[role]+(character?.kind==='talent'?'; talent prompts adapted from owner direction 2026-10-20':''),statements:characterQuestions(character?.kind||role).map(prompt=>({id:prompt.id,label:prompt.label,question:prompt.title,text:answers[prompt.id]||'',provenance:'You said'})),inferences:[],verification:'No external evidence verified; no matching or membership created'};
}
export function characterText(role:CharacterRole,answers:CharacterAnswers,character?:CharacterMetadata):string {
 const record=characterRecord(role,answers,character);
 return `${character?.kind==='talent'?'Talent':role==='icp'?'ICP':'Creative'} character — working draft\n\n${character?`Name · You said\n${character.name||'Untitled character'}\n\nProfile links · You supplied\n${character.profileLinks.join('\n')||'None linked'}\n\n`:''}${record.statements.map(s=>`${s.label} · You said\n${s.text}`).join('\n\n')}\n\n${record.verification}`;
}
