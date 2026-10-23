import type {PassageBox} from './life-passage.js';

// A swimming domain drawn from existing negative space, never a spacer row.
export function koiClearing(section:PassageBox,heading:PassageBox,copy:PassageBox,nextInset:number):PassageBox&{size:number} {
 const stacked=copy.top>=heading.top+heading.height-1;
 const bottom=section.top+section.height+Math.max(0,nextInset)*.5;
 const top=stacked?copy.top+copy.height-12:heading.top+heading.height+8;
 const width=stacked?section.width:heading.width;
 const height=Math.max(72,bottom-top);
 const size=Math.min(stacked?200:340,width*(stacked?.58:.52));
 return {left:stacked?section.left:heading.left,top,width,height,size};
}

export function readKoiClearing(marker:HTMLElement):ReturnType<typeof koiClearing> {
 const section=marker.parentElement!;
 const heading=section.querySelector<HTMLElement>('.about-heading, .section-heading')!;
 const copy=section.querySelector<HTMLElement>('.about-copy')!;
 const next=section.nextElementSibling;
 const open=koiClearing(section.getBoundingClientRect(),heading.getBoundingClientRect(),copy.getBoundingClientRect(),next?parseFloat(getComputedStyle(next).paddingTop)||0:0);
 const scale=Number(marker.dataset.waterLifeScale)||1;
 return {...open,size:Math.min(open.size*scale,open.width*.82)};
}
