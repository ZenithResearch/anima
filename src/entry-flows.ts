// Entry intent is independent of membership identity and organization type.
// These are local journeys; future discovery/registration never looks completed.
export const entryFlows = {
 business: {
  id:'business-start',panel:'business-start-panel',eyebrow:'For businesses / free brand package',
  title:['Bring your brand to life.'],primary:'Create your brand package',
  alternative:'Enter Workspace',note:'No fields at entry. Zenith account first; an optional notification email later. Optional brand prompts.'
 },
 talent: {
  id:'talent-start', panel:'talent-start-panel', eyebrow:'For talent / a starting point',
  title:['Bring the sides','that feel like you.'],
  body:'Your presence, performance and voice can belong to different worlds. Define a character you want to bring to work, whether you also make the work yourself or run a studio.',
  steps:[
   {title:'Define a character.',body:'Describe your expression, voice, world, formats and boundaries. Optional profile links can express one character or several.'},
   {title:'Choose what to share.',body:'Review your statements and evidence permissions. Keep several characters without combining their voices or boundaries.'},
   {title:'Prepare a roster request.',body:'Choose the screen, modelling, digital/social, voice, singing or live work you want. Set your privacy and booking contact; include your agent if represented.'}
  ],
  primary:'Define your character', kind:'talent',
  alternative:'Go straight to roster details', href:'#introduction',
  note:'Your character stays in this tab. Roster details prepare an email for your review; nothing is enrolled or published automatically.'
 }
} as const;
