export type PassageBox={left:number;top:number;width:number;height:number};
export const MAJOR=.61803398875,MINOR=1-MAJOR;
// A movement domain, not a layout box: adjoining water belongs to both sections.
// Never make a spacer or change a section's intrinsic content height for the art.
export function lifePassage(section:PassageBox,before:number,after:number):PassageBox {
 const lead=Math.max(0,before)*MINOR,trail=Math.max(0,after)*MINOR;
 // DOMRect coordinates are prototype accessors, not enumerable own fields.
 return {left:section.left,width:section.width,top:section.top-lead,height:section.height+lead+trail};
}
export function readLifePassage(marker:HTMLElement):PassageBox {
 const section=marker.parentElement!;
 const rect=marker.getBoundingClientRect();
 const previous=section.previousElementSibling,next=section.nextElementSibling;
 const previousInset=previous?parseFloat(getComputedStyle(previous).paddingBottom)||0:0;
 // Only borrow the next introduction, never its complete long capability list.
 const nextIntro=next?.querySelector('.section-intro,.section-heading');
 const nextInset=next?parseFloat(getComputedStyle(next).paddingTop)||0:0;
 return lifePassage(rect,previousInset,nextInset+(nextIntro?.getBoundingClientRect().height||0));
}
