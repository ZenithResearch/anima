import type {Engine} from './core.js';
import {defineOpportunities} from './opportunities.js';
import {defineModal} from './modal.js';
import {defineProcess} from './process.js';
import {defineSurface} from './surface.js';
import {defineOrbs} from './orbs.js';
import {defineReflection} from './reflection.js';
import {defineCharacter} from './character.js';
import {defineBrandReferences} from './brand-references.js';
import {defineTalentPortfolio} from './talent-portfolio.js';
export type {OpportunitySelection} from './opportunities.js';
export function defineComponents(engine:Engine):void {
 defineOpportunities(engine);defineModal();defineProcess(engine);defineSurface();defineOrbs();defineCharacter();defineTalentPortfolio();defineReflection();defineBrandReferences();
}
