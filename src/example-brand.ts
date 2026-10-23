import {emptyBrandPackage,setPeople,type BrandPackageDraft} from './brand-package-model.js';
// Synthetic opt-in example. Never seed or overwrite a user's saved draft.
export function exampleBrand():BrandPackageDraft {
 const draft=emptyBrandPackage();
 draft.answers={brand:'A small neighbourhood repair studio restoring everyday objects and teaching people how to care for them.',body:'The shoulders settle. There is time to look closely and a steady surface to work on.',emotion:'Welcome, curiosity and growing confidence. It feels possible to learn and make a difference.',world:'People can see the work in progress, ask how something is repaired and find the tools and explanations they need. A patient person makes room for them at the bench.',signature:'A shared look at what is broken; a first successful repair; leaving with an object and the knowledge to look after it.',references:'Reference notes for a fictional practice. No files, websites or boards have been imported.'};
 setPeople(draft,['Neighbours hoping to keep a well-used object in their lives.','First-time makers who want a patient introduction to repair.','Experienced makers looking for specialist tools and collaborators.','Families learning useful skills together.','Local shops looking for a dependable repair partner.']);
 return draft;
}
