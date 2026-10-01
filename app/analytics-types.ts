export type AnalyticsKind='post'|'prompt'|'gear'|'tool'|'page';
export type AnalyticsEvent='view'|'engaged'|'read'|'copy'|'click';
export type AnalyticsContent={kind:AnalyticsKind;id:string;title:string;path:string;status:string};
export type AnalyticsMetrics={views:number;pageViews:number;cardViews:number;engaged:number;reads:number;copies:number;clicks:number};
export type AnalyticsRow=AnalyticsContent&AnalyticsMetrics&{previousViews:number};
export type AnalyticsReport={from:string;to:string;previousFrom:string;previousTo:string;installedAt:string;firstEvent:string|null;lastEvent:string|null;totals:AnalyticsMetrics;previous:AnalyticsMetrics;rows:AnalyticsRow[];daily:({day:string}&AnalyticsMetrics)[];sources:{name:string;views:number}[];devices:{name:string;views:number}[]};
export const kindLabels:Record<AnalyticsKind,string>={post:'Yazı',prompt:'Prompt',gear:'Ürün',tool:'Araç',page:'Sayfa'};
export function istanbulDay(date=new Date()){return new Date(date.getTime()+3*3600000).toISOString().slice(0,10)}
