// One hypothetical relationship. Each view answers a different decision.
export const reflectionViews = [
 {
  id:'business',label:'For businesses',eyebrow:'The audience you want to reach',
  title:'The emerging independent',
  quote:'“I want to build something of my own, without performing a version of myself I don’t believe.”',
  context:'An example audience for a brand helping independent makers launch their practice.',
  counterpartLabel:'Reflected in a creator',counterpart:'The open-door maker',
  counterpartCopy:'Their process journal and short films make the messy middle visible, inviting others to take part.',
  rows:[
   {label:'Why it could resonate',text:'Your audience wants independence to feel possible. This creator shows the process before the polished result.'},
   {label:'What you could make',text:'A short-film diary and an open-studio session, supported by your brand’s space and production.'}
  ],
  detailLabel:'Explore the fit and what to agree',
  details:[
   {label:'Shared world',text:'Workshops, learning in public and the first steps of an independent practice connect the audience and creator.'},
   {label:'Evidence to check',text:'Review relevant work and audience context together. A shared theme alone does not establish a fit or availability.'},
   {label:'Agree together',text:'The brief, pay, creative control and usage. Neither side should manufacture a testimonial or claim they cannot stand behind.'},
   {label:'Beyond one campaign',text:'If both choose to continue, a shared making journal could grow, with other makers adding their own process.'}
  ],
  primary:{label:'Start with your brand',href:'#business-start'},
  alternative:{label:'Explore your audience',href:'#character',character:'icp'}
 },
 {
  id:'talent',label:'For creatives & talent',eyebrow:'The character of your practice',
  title:'The open-door maker',
  quote:'“I show the messy middle: making, learning in public and inviting other people into the process.”',
  context:'An example creative practice expressed through a process journal and a short-film channel.',
  counterpartLabel:'Reflected in a business',counterpart:'A place for independent makers',
  counterpartCopy:'A brand whose audience is finding the confidence to show their work and build a practice of their own.',
  rows:[
   {label:'Why it could fit your work',text:'The brand can support the films and shared making you already care about, rather than ask you to perform a different identity.'},
   {label:'What you could make',text:'Lead the short-film diary and open-studio session, with space and production support agreed around your practice.'}
  ],
  detailLabel:'Explore your part and your terms',
  details:[
   {label:'Your point of view',text:'Bring your own process, voice and ways of inviting people in. The audience connection is a possibility to explore, not an instruction to become someone else.'},
   {label:'Your boundaries',text:'Choose which character and profile expressions belong in the work. Decline claims or formats you cannot stand behind.'},
   {label:'Agree together',text:'Your role, pay, creative control, time and usage before work begins. You and the business both choose whether to continue.'},
   {label:'What could grow',text:'A continuing making journal could become part of your practice, with other makers contributing, if that remains work you want to make.'}
  ],
  primary:{label:'Define your practice',href:'#character',character:'creator'},
  alternative:{label:'Explore the talent path',href:'#talent-start'}
 }
] as const;
