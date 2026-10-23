const e=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// One identity molecule for the public site and application; only its destination changes.
export function BrandLockup(href:string,context=false,homeClass=''):string{
 return `<div class="brand-lockup"><div class="brand-name-line"><a class="wordmark ${e(homeClass)}" href="${e(href)}" aria-label="Anima home">anima</a><span class="brand-endorsement">By Zenith</span></div>${context?'<span class="brand-context">A creative network</span>':''}</div>`;
}
