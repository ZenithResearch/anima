declare module '*.mjs' {
  export const MEDIA_FORMATS:readonly {id:string;label:string}[];
  export const PORTFOLIO_SCHEMA:string;
  export const PORTFOLIO_LIMIT:number;
  export function readTalentPortfolio(input:unknown,availableWorkTypes?:string[]):{value:null|{schema:string;characters:{id:string;name:string;description:string}[];media:{id:string;format:string;title:string;url:string;workTypes:string[];characterIds:string[]}[]};errors:{path:string;message:string}[]};
  export const OPPORTUNITY_GROUPS:readonly {label:string;options:readonly {key:string;label:string;description:string;bit:number}[]}[];
  export const OPPORTUNITY_OPTIONS:readonly {key:string;label:string;description:string;bit:number}[];
  export const OPPORTUNITY_MASK:number;
  export const OPPORTUNITY_ERROR:string;
  export class WaterBackdrop {
    constructor(host:HTMLElement);
    ready:boolean;forcedFallback:boolean;quiet:boolean;
    setQuiet(value:boolean):void;request():void;cancel():void;destroy():void;
    setLifeAnchors(anchors:number[][]):void;
    setKoiDriver(driver:((delta:number,contact:number[],pressure:number)=>{pose:number[];motion:number[]})|null):void;
    setLifeStyle(style:'pixels'|'ascii'):void;
    setTrailColor(id:string):string;
    setRainColor(id:string):string;
  }
  export const water:WaterBackdrop;
  export const TRAIL_COLORS:Readonly<Record<string,{label:string;swatch:string;mark?:string;crest:number[];depth:number[]}>>;
  export const DEFAULT_TRAIL_COLOR:string;
  export const RAIN_COLORS:Readonly<Record<string,{label:string;swatch:string;tones:number[][]}>>;
  export const DEFAULT_RAIN_COLOR:string;
  export function rainColor(id:string):string;
  export function trailColor(id:string):string;
  export function connectMotion(button:HTMLButtonElement|null,options:{renderer:WaterBackdrop;page?:Document}):{sync():void;destroy():void};
  export const LIFE_BAND:number;
  export const LIFE_SPECIES:readonly string[];
  export const STUDY_LIFE_SPECIES:readonly string[];
  export function lifeStartAfterHero(heroBottom:number,viewportHeight:number):number;
  export function configureInteractionCore(next:(key:string,index:number,count:number)=>number|null):void;
  export function configurePondCore(core:{x:(x:number,left:number,width:number)=>number;y:(y:number,top:number,scrollY:number,width:number)=>number}):void;
}
