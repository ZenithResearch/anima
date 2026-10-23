export interface CoreExports {
  engine_version(): number;
  next_tab(key: number, index: number, count: number): number;
  process_count(role: number): number;
  process_reduce(state: number, event: number, value: number): number;
  opportunity_mask(live: number, digital: number, atmosphere: number): number;
  opportunity_mask_v2?(live: number, digital: number, atmosphere: number, promotion:number): number;
  opportunity_mask_v3?(live:number,digital:number,atmosphere:number,promotion:number,additional:number):number;
  opportunities_valid_v2?(mask:number):number;
  opportunities_valid(mask: number): number;
  life_start(heroBottom: number, viewportHeight: number): number;
  pond_x(x: number, left: number, width: number): number;
  pond_y(y: number, top: number, scrollY: number, width: number): number;
  koi_step?(component:number,x:number,y:number,vx:number,vy:number,gx:number,gy:number,px:number,py:number,pressure:number,cruise:number,dt:number):number;
  koi_step_v2?(component:number,x:number,y:number,vx:number,vy:number,gx:number,gy:number,px:number,py:number,pressure:number,cruise:number,dt:number,aspect:number):number;
}
export type Engine = { mode: 'wasm' | 'fallback'; exports: CoreExports | null };
export async function loadCore(): Promise<Engine> {
  const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),1500);
  try {
    const response = await fetch(new URL('../anima_core.wasm', import.meta.url),{signal:abort.signal});
    if (!response.ok) throw new Error('Core unavailable');
    const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
    const core = instance.exports as unknown as CoreExports;
    const required=['next_tab','process_count','process_reduce','opportunity_mask','opportunities_valid','life_start','pond_x','pond_y'];
    if (typeof core.engine_version !== 'function' || core.engine_version() !== 1 || required.some(name=>typeof core[name as keyof CoreExports]!=='function')) throw new Error('Unsupported core');
    return { mode: 'wasm', exports: core };
  } catch { return { mode: 'fallback', exports: null }; }
  finally { clearTimeout(timeout); }
}
export const keyCode = (key: string): number => ({ArrowRight:1,ArrowDown:1,ArrowLeft:2,ArrowUp:2,Home:3,End:4}[key] ?? 0);
