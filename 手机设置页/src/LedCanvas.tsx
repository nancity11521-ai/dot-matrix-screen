import {useEffect,useRef} from 'react';
import compassFrames from './data/compass.json';
import musicEffects from './data/music-effects.json';
import {animations,collections,clockPixels,points,timerPixels,type Custom} from './model';
type Props={levels?:number[];bearing?:number;id:string;size?:number;brightness?:number;enabled?:boolean;blink?:boolean;seconds?:number;speed?:number;customs?:Custom[];pixels?:number[];label?:string};
const pencil=[166,144,122,123,145,167,189,211,233,255,277,299,321,343,365,366,344,322,300,278,256,234,212,190,168];
export function LedCanvas({id,size=140,brightness=80,enabled=true,blink=true,seconds=300,speed=1,customs=[],pixels,label,levels,bearing}:Props){
 const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  let current=id,previous='',nextChange=0;const started=Date.now();
  function draw(){
   const canvas=ref.current;if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;
   const ratio=2;canvas.width=size*ratio;canvas.height=size*ratio;ctx.scale(ratio,ratio);
   const group=collections.find(c=>c.id===id);if(group&&Date.now()>nextChange){const options=group.members.filter(x=>x!==previous);current=options[Math.floor(Math.random()*options.length)];previous=current;nextChange=Date.now()+3000;}
   const custom=customs.find(c=>c.id===current);const anim=animations.find(a=>a.id===current);const now=new Date();
   const index=Math.floor((Date.now()-started)/1000*(custom?.fps||12)*speed*(current==='SUNNY'?1/3:1));
   let lit=pixels||custom?.pixels[index%custom.pixels.length]||anim?.pixels[index%(anim?.pixels.length||1)]||[];
   if(current==='CLOCK'&&!pixels)lit=clockPixels(now,blink);if(current==='SAND'&&!pixels)lit=timerPixels(seconds,now);if(current==='PENCIL')lit=pencil;
   if(current==='COMPASS'&&bearing!==undefined)lit=compassFrames[Math.round(bearing)%360];
   if((current==='WAVE'||current==='SPECTRUM')&&levels?.length){lit=[];levels.forEach((level,i)=>{for(let y=0;y<Math.round(level*13);y++)lit.push((17-y)*23+3+i*2)});}
   const musicFrames=current==='MUSIC_SCATTER'?musicEffects.flowers:current==='MUSIC_RIPPLE'?musicEffects.ripples:null;
   const musicFrame=musicFrames?musicFrames[Math.floor((Date.now()-started)/1000*24*speed)%musicFrames.length]:null;
   const musicAlpha=new Map<number,number>(musicFrame?.map(([id,alpha])=>[id,alpha])||[]);
   if(musicFrame)lit=musicFrame.map(([id])=>id);
   const on=new Set(enabled?lit:[]);const center=size/2,pitch=size*.78/23,cell=pitch*.66;
   ctx.clearRect(0,0,size,size);ctx.fillStyle='#06080a';ctx.beginPath();ctx.arc(center,center,center-1,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='#171c20';ctx.lineWidth=.6;ctx.stroke();
   for(const pt of points){const x=center+(pt.x-11)*pitch,y=center+(pt.y-11)*pitch;ctx.shadowBlur=0;ctx.fillStyle='#171c20';ctx.fillRect(x-cell/2,y-cell/2,cell,cell);if(on.has(pt.id)){ctx.globalAlpha=(.2+brightness*.008)*(musicFrame?(musicAlpha.get(pt.id)||0):1);ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=cell*.8;ctx.fillRect(x-cell/2,y-cell/2,cell,cell);ctx.globalAlpha=1;}}
  }
  draw();const timer=window.setInterval(draw,42);return()=>window.clearInterval(timer);
 },[id,size,brightness,enabled,blink,id==='SAND'?seconds:0,speed,customs,pixels,levels,bearing]);
 return <canvas ref={ref} className="led-canvas" style={{width:size,height:size}} role="img" aria-label={label||'白光点阵预览'}/>;
}
