// The existing preview remains a memory-only fixture. Normal workspace links
// enter the reviewed embedded-Wallet setup and retain their draft/request URL.
const preview=new URL(location.href).searchParams.get('preview')==='1';
void import(preview?'./service-review.js':'./service-candidate.js');
