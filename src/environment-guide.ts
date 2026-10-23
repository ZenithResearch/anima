import {validDraftId} from '../workspace/introduction.mjs';
const id=new URL(location.href).searchParams.get('draft');
const back=new URL('workspace.html',location.href);
if(validDraftId(id))back.searchParams.set('draft',id);
document.querySelectorAll<HTMLAnchorElement>('[data-environment-return],.workspace-home').forEach(link=>link.href=back.pathname+back.search);
