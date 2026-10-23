const frame=document.querySelector('#frame'),stage=document.querySelector('#stage'),size=document.querySelector('#size'),page=document.querySelector('#page');
function fit(){const [width,height]=size.value.split(' × ').map(Number),scale=Math.min(1,(innerWidth-24)/width,(innerHeight-76)/height);Object.assign(frame.style,{width:width+'px',height:height+'px',transform:`scale(${scale})`});Object.assign(stage.style,{width:width*scale+'px',height:height*scale+'px'});frame.width=width;frame.height=height;}
function open(){frame.src='../../'+page.value;fit();}
const params=new URLSearchParams(location.search);for(const [control,key] of [[size,'size'],[page,'page']]){const value=params.get(key);if([...control.options].some(option=>option.value===value))control.value=value;}
size.addEventListener('change',fit);page.addEventListener('change',open);addEventListener('resize',fit);open();

function inspect(){const d=frame.contentDocument;if(!d?.body)return;const width=d.documentElement.clientWidth,overflow=Math.max(0,d.documentElement.scrollWidth-width);document.querySelector('#info').textContent=`${width}px · horizontal overflow ${overflow}px · nothing sent`;}
frame.addEventListener('load',()=>{inspect();new ResizeObserver(inspect).observe(frame.contentDocument.documentElement);});size.addEventListener('change',()=>requestAnimationFrame(inspect));
