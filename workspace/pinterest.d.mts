export type PinterestBoard={version:1;id:string;name:string;description:string;owner:string;pinCount:number;privacy:'PUBLIC'|'SECRET'|'PROTECTED';environment:'production'|'sandbox';sourceUrl:string};
export type PinterestSource={version:1;boardId:string;title:string;owner:string;privacy:PinterestBoard['privacy'];pinCount:number;environment:PinterestBoard['environment'];attachedAt:string};
export function pinterestBoardId(value:unknown):boolean;
export function readPinterestBoard(value:unknown):PinterestBoard;
export function normalizePinterestBoard(value:unknown,environment?:'production'|'sandbox'):PinterestBoard;
