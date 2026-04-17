"use client";

import { useEffect, useRef, useState } from "react";

/* ─── Scale ──────────────────────────────────────────────────────────────── */
const GRID = 20;        // px per grid cell
const PPF  = GRID * 4;  // 80 px = 1 foot

function snap(v: number) { return Math.round(v / GRID) * GRID; }

function polyArea(pts: {x:number,y:number}[]) {
  let a = 0, n = pts.length;
  for (let i = 0; i < n; i++) { const j=(i+1)%n; a+=pts[i].x*pts[j].y-pts[j].x*pts[i].y; }
  return Math.abs(a / 2);
}
function polyPerim(pts: {x:number,y:number}[]) {
  let p = 0, n = pts.length;
  for (let i = 0; i < n; i++) { const j=(i+1)%n; p+=Math.hypot(pts[j].x-pts[i].x,pts[j].y-pts[i].y); }
  return p;
}

/** Convert canvas pixels → inches label  e.g. "30\"" */
function fmtInches(px: number): string {
  const inches = Math.abs(px) / PPF * 12;
  return `${Number(inches.toFixed(1))}"`;
}

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ToolMode  = "select" | "draw";
type ShapeKind = "countertop" | "island" | "backsplash" | "cutout";

interface ShapeMeta {
  id: string; label: string; kind: ShapeKind;
  sqft: number; perimLf: number;
  widthFt: number; heightFt: number;
  corners: number; cutouts: number; backLf: number;
  shapeLabor: boolean; edgeLabor: boolean; hasBack: boolean;
}

interface Rates {
  material: number; shapePerSqft: number; edgePerLf: number;
  cornerEach: number; sinkEach: number; backPerLf: number;
}

const DEF_RATES: Rates = {
  material:0, shapePerSqft:0, edgePerLf:0,
  cornerEach:0, sinkEach:0, backPerLf:0,
};

function calcCost(m: ShapeMeta, r: Rates) {
  const mat = m.kind!=="cutout" ? m.sqft*r.material : 0;
  const sl  = m.shapeLabor ? m.sqft*r.shapePerSqft : 0;
  const el  = m.edgeLabor  ? m.perimLf*r.edgePerLf : 0;
  const cl  = m.corners*r.cornerEach;
  const cut = m.cutouts*r.sinkEach;
  const bl  = m.hasBack ? m.backLf*r.backPerLf : 0;
  return { mat, sl, el, cl, cut, bl, total: mat+sl+el+cl+cut+bl };
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  root:    { display:"flex", height:"100vh", overflow:"hidden", fontFamily:"system-ui,sans-serif", background:"#020617", color:"#cbd5e1" } as React.CSSProperties,
  left:    { width:220, minWidth:220, background:"#0d1424", borderRight:"1px solid #1e293b", display:"flex", flexDirection:"column" as const, overflowY:"auto" as const },
  center:  { flex:1, display:"flex", flexDirection:"column" as const, overflow:"hidden" },
  right:   { width:290, minWidth:290, background:"#0d1424", borderLeft:"1px solid #1e293b", display:"flex", flexDirection:"column" as const, overflowY:"auto" as const },
  sec:     { padding:"10px 12px", borderBottom:"1px solid #1e293b" } as React.CSSProperties,
  secTitle:{ fontSize:10, fontWeight:700, color:"#475569", letterSpacing:"0.08em", textTransform:"uppercase" as const, marginBottom:6 },
  toolBtn: (active:boolean): React.CSSProperties => ({
    display:"flex", alignItems:"center", gap:6, width:"100%", padding:"7px 10px",
    borderRadius:6, border:"none", cursor:"pointer", fontSize:13, fontWeight:active?600:400,
    background: active ? "rgba(34,197,94,0.15)" : "transparent",
    color: active ? "#22c55e" : "#94a3b8",
  }),
  tplBtn:  { width:"100%", padding:"6px 10px", marginBottom:4, borderRadius:5, border:"1px solid #1e293b",
             background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:12, textAlign:"left" as const },
  propRow: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 } as React.CSSProperties,
  propLbl: { fontSize:12, color:"#64748b" } as React.CSSProperties,
  propVal: { fontSize:12, color:"#e2e8f0", fontWeight:500 } as React.CSSProperties,
  inp:     { width:"100%", background:"#020617", border:"1px solid #1e293b", borderRadius:5, padding:"5px 8px", color:"#e2e8f0", fontSize:12 } as React.CSSProperties,
  badge:   (c:string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", padding:"1px 8px", borderRadius:99, fontSize:10, fontWeight:600, background:`${c}22`, color:c }),
  btn:     (c:string): React.CSSProperties => ({
    padding:"5px 12px", borderRadius:5, border:"none", cursor:"pointer",
    background:c, color:"#fff", fontSize:12, fontWeight:500,
  }),
  costRow: (bold?:boolean): React.CSSProperties => ({
    display:"flex", justifyContent:"space-between", fontSize:bold?13:11,
    fontWeight: bold?700:400, color: bold?"#e2e8f0":"#94a3b8",
    marginBottom: bold?0:3, paddingTop: bold?8:0,
    borderTop: bold?"1px solid #1e293b":"none",
  }),
  bottomBar: { borderTop:"1px solid #1e293b", padding:"10px 16px", display:"flex", gap:24, alignItems:"center", background:"#0d1424" } as React.CSSProperties,
  statLbl: { fontSize:11, color:"#475569" } as React.CSSProperties,
  statVal: { fontSize:15, fontWeight:700, color:"#22c55e" } as React.CSSProperties,
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function DrawingPage() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const fRef         = useRef<any>(null);
  const cRef         = useRef<any>(null);
  const modeRef      = useRef<ToolMode>("select");
  const ptsRef       = useRef<{x:number,y:number}[]>([]);
  const tmpRef       = useRef<any[]>([]);
  const shapesRef    = useRef<Record<string,any>>({});
  const dimLabelsRef = useRef<Record<string,{wObj:any;hObj:any}>>({});
  const metasRef     = useRef<Record<string,ShapeMeta>>({});

  const [ready, setReady]         = useState(false);
  const [mode, setMode]           = useState<ToolMode>("select");
  const [drawing, setDrawing]     = useState(false);
  const [ptCount, setPtCount]     = useState(0);
  const [metas, setMetas]         = useState<Record<string,ShapeMeta>>({});
  const [selId, setSelId]         = useState<string|null>(null);
  const [rates, setRates]         = useState<Rates>(DEF_RATES);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [dbShapes, setDbShapes]   = useState<{
    id:string; label:string; kind:ShapeKind; stroke:string;
    image?:string; normalizedPoints?:{x:number;y:number}[];
    defaultWidthFt:number; defaultHeightFt:number; defaultCorners?:number;
  }[]>([]);
  const [shapeSearch, setShapeSearch] = useState("");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { metasRef.current = metas; }, [metas]);

  // Load custom shapes from DB
  useEffect(() => {
    fetch("/api/shape-templates")
      .then(r => r.json())
      .then(j => {
        setDbShapes((j.templates ?? []).map((t: any) => ({
          id:               t.id,
          label:            t.name,
          kind:             t.kind as ShapeKind,
          stroke:           t.stroke_color,
          image:            t.image_data ?? undefined,
          normalizedPoints: t.normalized_points ?? undefined,
          defaultWidthFt:   Number(t.default_width_ft),
          defaultHeightFt:  Number(t.default_height_ft),
          defaultCorners:   t.default_corners ?? 4,
        })));
      }).catch(() => {});
  }, []);

  /* ── dimension label helpers ─────────────────────────────────────── */
  function getShapeBounds(obj: any) {
    try { return obj.getBoundingRect(false, true); } catch { return obj.getBoundingRect(); }
  }

  function makeDimText(text: string, left: number, top: number) {
    const fabric = fRef.current; if (!fabric) return null;
    const obj = new (fabric.Text || fabric.FabricText)(text, {
      left, top, originX:"center", originY:"center",
      fontSize:11, fill:"#1e40af", fontFamily:"monospace",
      backgroundColor:"rgba(219,234,254,0.9)", padding:3,
      selectable:false, evented:false,
    });
    obj._isDimLabel = true;
    return obj;
  }

  function createDimLabels(id: string, obj: any) {
    const c = cRef.current; if (!c) return;
    const old = dimLabelsRef.current[id];
    if (old) { try { c.remove(old.wObj); c.remove(old.hObj); } catch {} }
    const br   = getShapeBounds(obj);
    const wObj = makeDimText(`W: ${fmtInches(br.width)}`,  br.left + br.width/2,         Math.max(br.top - 16, 12));
    const hObj = makeDimText(`H: ${fmtInches(br.height)}`, br.left + br.width/2,         br.top + br.height + 16);
    if (!wObj || !hObj) return;
    c.add(wObj); c.add(hObj);
    try { (c.bringToFront||c.bringObjectToFront).call(c,wObj); (c.bringToFront||c.bringObjectToFront).call(c,hObj); } catch {}
    dimLabelsRef.current[id] = { wObj, hObj };
  }

  function updateDimLabels(obj: any) {
    const c = cRef.current; const id = obj?._shapeId;
    if (!c || !id) return;
    const labels = dimLabelsRef.current[id];
    if (!labels) { createDimLabels(id, obj); return; }
    const br = getShapeBounds(obj);
    try {
      labels.wObj.set({ text:`W: ${fmtInches(br.width)}`,  left:br.left+br.width/2, top:Math.max(br.top-16,12) });
      labels.hObj.set({ text:`H: ${fmtInches(br.height)}`, left:br.left+br.width/2, top:br.top+br.height+16 });
    } catch {}
    c.renderAll();
  }

  function removeDimLabels(id: string) {
    const c = cRef.current;
    const labels = dimLabelsRef.current[id];
    if (c && labels) { try { c.remove(labels.wObj); c.remove(labels.hObj); } catch {} }
    delete dimLabelsRef.current[id];
  }

  /* ── grid ─────────────────────────────────────────────────────────── */
  function drawGrid(c: any, fabric: any) {
    const W=c.width, H=c.height;
    for (let x=0;x<=W;x+=GRID){const l=new fabric.Line([x,0,x,H],{stroke:"#d1d5db",strokeWidth:1,selectable:false,evented:false});l.isGrid=true;c.add(l);c.sendObjectToBack(l);}
    for (let y=0;y<=H;y+=GRID){const l=new fabric.Line([0,y,W,y],{stroke:"#d1d5db",strokeWidth:1,selectable:false,evented:false});l.isGrid=true;c.add(l);c.sendObjectToBack(l);}
  }

  /* ── draw helpers ─────────────────────────────────────────────────── */
  function addPt(c: any, fabric: any, pt: {x:number,y:number}) {
    const pts = ptsRef.current;
    if (pts.length>0){const prev=pts[pts.length-1];const seg=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#22c55e",strokeWidth:2,selectable:false,evented:false});c.add(seg);tmpRef.current.push(seg);}
    const dot=new fabric.Circle({left:pt.x-4,top:pt.y-4,radius:4,fill:"#22c55e",selectable:false,evented:false});
    c.add(dot);tmpRef.current.push(dot);ptsRef.current=[...pts,pt];setPtCount(ptsRef.current.length);c.renderAll();
  }

  function updatePreview(c: any, fabric: any, pt: {x:number,y:number}) {
    const tmp=tmpRef.current;
    if(tmp.length&&tmp[tmp.length-1]._isPreview)c.remove(tmp.pop());
    const pts=ptsRef.current;if(!pts.length)return;
    const prev=pts[pts.length-1];
    const l=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#22c55e",strokeWidth:1,strokeDashArray:[4,3],selectable:false,evented:false,opacity:0.6});
    l._isPreview=true;c.add(l);tmp.push(l);c.renderAll();
  }

  function finishPoly(c: any, fabric: any) {
    const pts=ptsRef.current;if(pts.length<3){cancelDraw();return;}
    tmpRef.current.forEach(o=>c.remove(o));tmpRef.current=[];
    const poly=new fabric.Polygon([...pts],{fill:"rgba(16,185,129,0.1)",stroke:"#22c55e",strokeWidth:2,objectCaching:false});
    const sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2));
    const lf=parseFloat((polyPerim(pts)/PPF).toFixed(2));
    const id=`p_${Date.now()}`;
    poly._shapeId=id;
    c.add(poly);
    const br=getShapeBounds(poly);
    const widthFt=parseFloat((br.width/PPF).toFixed(2));
    const heightFt=parseFloat((br.height/PPF).toFixed(2));
    shapesRef.current[id]=poly;
    const count=Object.keys(metasRef.current).length;
    const meta:ShapeMeta={id,label:`Top ${count+1}`,kind:"countertop",sqft,perimLf:lf,widthFt,heightFt,corners:pts.length,cutouts:0,backLf:0,shapeLabor:true,edgeLabor:true,hasBack:false};
    createDimLabels(id,poly);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);c.setActiveObject(poly);
    ptsRef.current=[];tmpRef.current=[];setDrawing(false);setPtCount(0);c.renderAll();
  }

  function cancelDraw() {
    const c=cRef.current;if(!c)return;
    tmpRef.current.forEach(o=>c.remove(o));tmpRef.current=[];ptsRef.current=[];
    setDrawing(false);setPtCount(0);c.renderAll();
  }

  /* ── fabric init ──────────────────────────────────────────────────── */
  useEffect(() => {
    if(!canvasRef.current) return;
    let gone=false;
    (async()=>{
      const mod=await import("fabric");
      const fabric=(mod as any).fabric??mod;
      fRef.current=fabric;
      if(gone||!canvasRef.current) return;
      const c=new fabric.Canvas(canvasRef.current,{backgroundColor:"#ffffff",width:900,height:560});
      cRef.current=c;drawGrid(c,fabric);

      function recalc(obj: any) {
        const id=obj._shapeId;if(!id)return;
        let sqft=0,perimLf=0;
        const br=getShapeBounds(obj);
        const widthFt=parseFloat((br.width/PPF).toFixed(2));
        const heightFt=parseFloat((br.height/PPF).toFixed(2));
        if(obj.type==="rect"){const W=obj.getScaledWidth(),H=obj.getScaledHeight();sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2));perimLf=parseFloat((2*(W+H)/PPF).toFixed(2));}
        else if(obj.type==="polygon"||obj.type==="polyline"){const sX=obj.scaleX??1,sY=obj.scaleY??1;const pts=(obj.points??[]).map((p:any)=>({x:p.x*sX,y:p.y*sY}));sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2));perimLf=parseFloat((polyPerim(pts)/PPF).toFixed(2));}
        else{const W=obj.getScaledWidth(),H=obj.getScaledHeight();sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2));perimLf=parseFloat((Math.PI*(W+H)/2/PPF).toFixed(2));}
        setMetas(prev=>{ if(!prev[id])return prev; return{...prev,[id]:{...prev[id],sqft,perimLf,widthFt,heightFt}}; });
        updateDimLabels(obj);
      }

      c.on("mouse:down",(opt:any)=>{
        if(modeRef.current!=="draw")return;
        const p=c.getPointer(opt.e);const pt={x:snap(p.x),y:snap(p.y)};
        const pts=ptsRef.current;
        if(pts.length>=3&&Math.hypot(pt.x-pts[0].x,pt.y-pts[0].y)<=GRID*1.5){finishPoly(c,fabric);return;}
        setDrawing(true);addPt(c,fabric,pt);
      });
      c.on("mouse:move",(opt:any)=>{if(modeRef.current!=="draw"||!ptsRef.current.length)return;const p=c.getPointer(opt.e);updatePreview(c,fabric,{x:snap(p.x),y:snap(p.y)});});
      c.on("mouse:dblclick",()=>{if(modeRef.current==="draw"&&ptsRef.current.length>=3){ptsRef.current.pop();const tmp=tmpRef.current;[tmp.pop(),tmp.pop()].forEach(o=>o&&c.remove(o));setPtCount(ptsRef.current.length);finishPoly(c,fabric);}});
      c.on("selection:created",(opt:any)=>setSelId(opt.selected?.[0]?._shapeId??null));
      c.on("selection:updated",(opt:any)=>setSelId(opt.selected?.[0]?._shapeId??null));
      c.on("selection:cleared",()=>setSelId(null));
      c.on("object:scaling",(opt:any)=>recalc(opt.target));
      c.on("object:modified",(opt:any)=>recalc(opt.target));
      c.on("object:moving",(opt:any)=>updateDimLabels(opt.target));
      c.on("object:rotating",(opt:any)=>updateDimLabels(opt.target));

      setReady(true);
    })();
    return()=>{ gone=true; cRef.current?.dispose(); cRef.current=null; };
  }, []);

  /* ── shape factories ──────────────────────────────────────────────── */
  function mkMeta(label:string,kind:ShapeKind,sqft:number,lf:number,corners:number,widthFt:number,heightFt:number):ShapeMeta {
    return {id:"",label,kind,sqft,perimLf:lf,widthFt,heightFt,corners,cutouts:0,backLf:0,shapeLabor:true,edgeLabor:true,hasBack:false};
  }

  function addFabricObj(obj: any, meta: ShapeMeta) {
    const c=cRef.current;if(!c)return;
    const id=`s_${Date.now()}`;meta.id=id;obj._shapeId=id;
    c.add(obj);c.setActiveObject(obj);shapesRef.current[id]=obj;
    createDimLabels(id,obj);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);c.renderAll();
  }

  function addRect() {
    const f=fRef.current;if(!f)return;
    const W=200,H=60;
    addFabricObj(new f.Rect({left:80,top:80,width:W,height:H,fill:"rgba(16,185,129,0.1)",stroke:"#22c55e",strokeWidth:2}),
      mkMeta(`Top ${Object.keys(metas).length+1}`,"countertop",parseFloat(((W/PPF)*(H/PPF)).toFixed(2)),parseFloat((2*(W+H)/PPF).toFixed(2)),4,parseFloat((W/PPF).toFixed(2)),parseFloat((H/PPF).toFixed(2))));
  }
  function addIsland() {
    const f=fRef.current;if(!f)return;
    const W=180,H=90;
    addFabricObj(new f.Rect({left:200,top:200,width:W,height:H,fill:"rgba(59,130,246,0.1)",stroke:"#3b82f6",strokeWidth:2,rx:6,ry:6}),
      mkMeta(`Island ${Object.keys(metas).length+1}`,"island",parseFloat(((W/PPF)*(H/PPF)).toFixed(2)),parseFloat((2*(W+H)/PPF).toFixed(2)),4,parseFloat((W/PPF).toFixed(2)),parseFloat((H/PPF).toFixed(2))));
  }
  function addLShape() {
    const f=fRef.current;if(!f)return;
    const pts=[{x:0,y:0},{x:240,y:0},{x:240,y:60},{x:100,y:60},{x:100,y:180},{x:0,y:180}];
    addFabricObj(new f.Polygon(pts,{left:80,top:80,fill:"rgba(168,85,247,0.1)",stroke:"#a855f7",strokeWidth:2}),
      mkMeta(`L-Shape ${Object.keys(metas).length+1}`,"countertop",parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2)),parseFloat((polyPerim(pts)/PPF).toFixed(2)),6,parseFloat((240/PPF).toFixed(2)),parseFloat((180/PPF).toFixed(2))));
  }
  function addUShape() {
    const f=fRef.current;if(!f)return;
    const pts=[{x:0,y:0},{x:60,y:0},{x:60,y:140},{x:120,y:140},{x:120,y:0},{x:240,y:0},{x:240,y:60},{x:180,y:60},{x:180,y:200},{x:0,y:200}];
    addFabricObj(new f.Polygon(pts,{left:80,top:60,fill:"rgba(251,191,36,0.1)",stroke:"#fbbf24",strokeWidth:2}),
      mkMeta(`U-Shape ${Object.keys(metas).length+1}`,"countertop",parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2)),parseFloat((polyPerim(pts)/PPF).toFixed(2)),10,parseFloat((240/PPF).toFixed(2)),parseFloat((200/PPF).toFixed(2))));
  }
  function addSink() {
    const f=fRef.current;if(!f)return;
    const id=`cut_${Date.now()}`;
    const obj=new f.Ellipse({left:240,top:120,rx:52,ry:34,fill:"rgba(15,23,42,0.85)",stroke:"#f97316",strokeDashArray:[6,4],strokeWidth:2});
    obj._shapeId=id;
    const meta:ShapeMeta={id,label:"Sink Cutout",kind:"cutout",sqft:0,perimLf:0,widthFt:parseFloat(((52*2)/PPF).toFixed(2)),heightFt:parseFloat(((34*2)/PPF).toFixed(2)),corners:0,cutouts:1,backLf:0,shapeLabor:false,edgeLabor:false,hasBack:false};
    cRef.current.add(obj);cRef.current.setActiveObject(obj);shapesRef.current[id]=obj;
    createDimLabels(id,obj);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);cRef.current.renderAll();
  }
  function addSeam() {
    const f=fRef.current;if(!f)return;
    cRef.current.add(new f.Line([100,200,440,200],{stroke:"#eab308",strokeWidth:2,strokeDashArray:[8,5]}));
    cRef.current.renderAll();
  }

  function deleteSelected() {
    const c=cRef.current;if(!c)return;
    const obj=c.getActiveObject();if(!obj)return;
    const id=obj._shapeId;
    if(id){removeDimLabels(id);delete shapesRef.current[id];setMetas(p=>{const n={...p};delete n[id];return n;});if(selId===id)setSelId(null);}
    c.remove(obj);c.renderAll();
  }

  /* ── DB template shapes ───────────────────────────────────────────── */
  function addTemplateShape(tpl: typeof dbShapes[0]) {
    const f=fRef.current; const c=cRef.current; if(!f||!c) return;
    const widthPx  = tpl.defaultWidthFt  * PPF;
    const heightPx = tpl.defaultHeightFt * PPF;
    const left = 60 + (Object.keys(metas).length % 3) * 30;
    const top  = 60 + (Object.keys(metas).length % 3) * 20;

    if (tpl.normalizedPoints && tpl.normalizedPoints.length >= 3) {
      const pts = tpl.normalizedPoints.map(p => ({ x: Math.round(p.x*widthPx), y: Math.round(p.y*heightPx) }));
      const fill = `${tpl.stroke}18`;
      const obj = new f.Polygon(pts,{left,top,fill,stroke:tpl.stroke,strokeWidth:2,objectCaching:false});
      const sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2));
      const lf=parseFloat((polyPerim(pts)/PPF).toFixed(2));
      addFabricObj(obj,mkMeta(tpl.label,tpl.kind,sqft,lf,tpl.defaultCorners??pts.length,tpl.defaultWidthFt,tpl.defaultHeightFt));
    } else if (tpl.image) {
      const ImgCls = f.Image || f.FabricImage;
      if (ImgCls?.fromURL) {
        // Fabric v6 uses Promise-based fromURL; v5 used a callback as the second arg.
        // Detect which API is in use by checking if the return value is a Promise.
        const crossOriginOpt = tpl.image.startsWith("data:") ? {} : { crossOrigin: "anonymous" };
        const applyImg = (img: any) => {
          img.scaleToWidth(widthPx); img.set({left,top});
          const sqft=parseFloat((tpl.defaultWidthFt*tpl.defaultHeightFt).toFixed(2));
          const lf=parseFloat((2*(tpl.defaultWidthFt+tpl.defaultHeightFt)).toFixed(2));
          addFabricObj(img,mkMeta(tpl.label,tpl.kind,sqft,lf,tpl.defaultCorners??4,tpl.defaultWidthFt,tpl.defaultHeightFt));
        };
        const result = ImgCls.fromURL(tpl.image, crossOriginOpt);
        if (result && typeof result.then === "function") {
          result.then(applyImg).catch(() => {
            // Image failed to load — fall back to a coloured rectangle
            const fill=`${tpl.stroke}18`;
            const obj=new f.Rect({left,top,width:widthPx,height:heightPx,fill,stroke:tpl.stroke,strokeWidth:2});
            const sqft=parseFloat((tpl.defaultWidthFt*tpl.defaultHeightFt).toFixed(2));
            const lf=parseFloat((2*(tpl.defaultWidthFt+tpl.defaultHeightFt)).toFixed(2));
            addFabricObj(obj,mkMeta(tpl.label,tpl.kind,sqft,lf,tpl.defaultCorners??4,tpl.defaultWidthFt,tpl.defaultHeightFt));
          });
        } else {
          // Fabric v5 callback style — result is the image directly or undefined
          ImgCls.fromURL(tpl.image, applyImg, crossOriginOpt);
        }
      }
    } else {
      const fill=`${tpl.stroke}18`;
      const obj=new f.Rect({left,top,width:widthPx,height:heightPx,fill,stroke:tpl.stroke,strokeWidth:2});
      const sqft=parseFloat((tpl.defaultWidthFt*tpl.defaultHeightFt).toFixed(2));
      const lf=parseFloat((2*(tpl.defaultWidthFt+tpl.defaultHeightFt)).toFixed(2));
      addFabricObj(obj,mkMeta(tpl.label,tpl.kind,sqft,lf,tpl.defaultCorners??4,tpl.defaultWidthFt,tpl.defaultHeightFt));
    }
  }

  /* ── manual dimension change ──────────────────────────────────────── */
  function handleDimChange(id: string, dim: "width"|"height", valFt: number) {
    const c=cRef.current;const obj=shapesRef.current[id];
    if(!c||!obj||valFt<=0)return;
    const br=getShapeBounds(obj);
    const newPx=valFt*PPF;
    if(dim==="width"){const factor=newPx/br.width;obj.set("scaleX",(obj.scaleX??1)*factor);}
    else{const factor=newPx/br.height;obj.set("scaleY",(obj.scaleY??1)*factor);}
    obj.setCoords();
    c.renderAll();
    // Recalc meta after resize
    const newBr=getShapeBounds(obj);
    const widthFt=parseFloat((newBr.width/PPF).toFixed(2));
    const heightFt=parseFloat((newBr.height/PPF).toFixed(2));
    let sqft=0,perimLf=0;
    if(obj.type==="rect"){const W=obj.getScaledWidth(),H=obj.getScaledHeight();sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2));perimLf=parseFloat((2*(W+H)/PPF).toFixed(2));}
    else if(obj.type==="polygon"||obj.type==="polyline"){const sX=obj.scaleX??1,sY=obj.scaleY??1;const pts=(obj.points??[]).map((p:any)=>({x:p.x*sX,y:p.y*sY}));sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2));perimLf=parseFloat((polyPerim(pts)/PPF).toFixed(2));}
    else{const W=obj.getScaledWidth(),H=obj.getScaledHeight();sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2));perimLf=parseFloat((Math.PI*(W+H)/2/PPF).toFixed(2));}
    updMeta(id,{widthFt,heightFt,sqft,perimLf});
    createDimLabels(id,obj);
    c.renderAll();
  }

  function updMeta(id: string, u: Partial<ShapeMeta>) { setMetas(p=>({...p,[id]:{...p[id],...u}})); }
  function numInc(id: string, field:"corners"|"cutouts", delta: number) { const m=metas[id];if(!m)return;updMeta(id,{[field]:Math.max(0,(m[field]??0)+delta)}); }

  function handleSave() {
    const c=cRef.current;if(!c)return;
    // hide dim labels for clean PNG export
    const dimObjs=Object.values(dimLabelsRef.current).flatMap(d=>[d.wObj,d.hObj]).filter(Boolean);
    dimObjs.forEach(o=>{try{o.set("visible",false);}catch{}});
    c.renderAll();
    const data={shapes:Object.values(metas),rates,totalSqft:totSqft.toFixed(2),totalCost:totCost.toFixed(2)};
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
    a.download="layout.json";a.click();
    const ia=document.createElement("a");
    ia.href=c.toDataURL({format:"png",multiplier:1.5});
    ia.download="layout.png";ia.click();
    dimObjs.forEach(o=>{try{o.set("visible",true);}catch{}});
    c.renderAll();
  }

  /* ── derived ──────────────────────────────────────────────────────── */
  const selMeta = selId ? metas[selId] : null;
  const selCost = selMeta ? calcCost(selMeta, rates) : null;
  const totSqft = Object.values(metas).reduce((s,m)=>s+(m.kind!=="cutout"?m.sqft:0),0);
  const totCost = Object.values(metas).reduce((s,m)=>s+calcCost(m,rates).total,0);

  /* ── render ───────────────────────────────────────────────────────── */
  return (
    <div style={S.root}>

      {/* ── LEFT PANEL ── */}
      <div style={S.left}>
        <div style={{...S.sec,paddingBottom:4}}>
          <div style={{fontSize:12,fontWeight:700,color:"#22c55e",marginBottom:2}}>Drawing Tool</div>
          <div style={{fontSize:10,color:"#475569"}}>Countertop estimator</div>
        </div>

        {/* Tools */}
        <div style={S.sec}>
          <div style={S.secTitle}>Tools</div>
          <button style={S.toolBtn(mode==="select")} onClick={()=>setMode("select")}><span>↖</span>Select / Move</button>
          <button style={S.toolBtn(mode==="draw")}   onClick={()=>setMode("draw")}><span>✏️</span>Draw Shape</button>
          {drawing&&(
            <div style={{marginTop:6,padding:"6px 10px",background:"rgba(34,197,94,0.08)",borderRadius:6}}>
              <div style={{fontSize:11,color:"#22c55e",marginBottom:4}}>{ptCount} point{ptCount!==1?"s":""} — click near start to close</div>
              <div style={{display:"flex",gap:6}}>
                <button style={S.btn("#22c55e")} onClick={()=>{const c=cRef.current,f=fRef.current;if(c&&f)finishPoly(c,f);}}>Close</button>
                <button style={S.btn("#475569")} onClick={cancelDraw}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Templates */}
        <div style={S.sec}>
          <div style={S.secTitle}>Add Shape</div>
          {([["Straight Top",addRect,"#22c55e"],["Island",addIsland,"#3b82f6"],["L-Shape",addLShape,"#a855f7"],["U-Shape",addUShape,"#fbbf24"],["Sink Cutout",addSink,"#f97316"],["Seam Line",addSeam,"#eab308"]] as [string,()=>void,string][]).map(([lbl,fn,col])=>(
            <button key={lbl} style={{...S.tplBtn,borderColor:col,color:col}} disabled={!ready} onClick={fn}>+ {lbl}</button>
          ))}
        </div>

        {/* My Shapes — from Shape Library */}
        {dbShapes.length > 0 && (
          <div style={S.sec}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={S.secTitle}>My Shapes ({dbShapes.length})</div>
            </div>
            {/* Search */}
            <div style={{position:"relative",marginBottom:6}}>
              <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#475569",pointerEvents:"none"}}>🔍</span>
              <input
                type="text"
                placeholder="Search shapes…"
                value={shapeSearch}
                onChange={e=>setShapeSearch(e.target.value)}
                style={{...S.inp,paddingLeft:24,fontSize:11}}
              />
              {shapeSearch&&(
                <button onClick={()=>setShapeSearch("")}
                  style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#475569",cursor:"pointer",fontSize:13,lineHeight:1}}>✕</button>
              )}
            </div>
            {/* Grid */}
            {(()=>{
              const filtered=dbShapes.filter(t=>t.label.toLowerCase().includes(shapeSearch.toLowerCase()));
              return filtered.length===0?(
                <div style={{fontSize:11,color:"#475569",textAlign:"center",padding:"10px 0"}}>No shapes match "{shapeSearch}"</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {filtered.map(tpl=>(
                    <button key={tpl.id} disabled={!ready} onClick={()=>addTemplateShape(tpl)}
                      title={`Add ${tpl.label}`}
                      style={{
                        background:"#060d18",border:`1px solid ${tpl.stroke}40`,
                        borderRadius:6,padding:"4px 3px",cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                      }}
                      onMouseEnter={e=>(e.currentTarget.style.borderColor=tpl.stroke)}
                      onMouseLeave={e=>(e.currentTarget.style.borderColor=`${tpl.stroke}40`)}>
                      {tpl.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tpl.image} alt={tpl.label} style={{width:"100%",height:42,objectFit:"contain"}}/>
                      ) : (
                        <div style={{width:"100%",height:42,background:`${tpl.stroke}18`,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:tpl.stroke}}>⬜</div>
                      )}
                      <span style={{fontSize:9,color:"#94a3b8",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%",textAlign:"center"}}>
                        {tpl.label}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Labor Rates */}
        <div style={S.sec}>
          <button style={{...S.toolBtn(false),fontWeight:600}} onClick={()=>setRatesOpen(o=>!o)}>
            <span>💰</span>Labor Rates {ratesOpen?"▴":"▾"}
          </button>
          {ratesOpen&&(
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
              {([["Material $/sqft","material"],["Shape labor $/sqft","shapePerSqft"],["Edge labor $/lf","edgePerLf"],["Corner $/each","cornerEach"],["Sink cutout $/each","sinkEach"],["Backsplash $/lf","backPerLf"]] as [string,keyof Rates][]).map(([lbl,k])=>(
                <div key={k}>
                  <div style={{fontSize:10,color:"#475569",marginBottom:2}}>{lbl}</div>
                  <input style={S.inp} type="number" step="0.01" value={rates[k]} onChange={e=>setRates(r=>({...r,[k]:Number(e.target.value)}))}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shape list */}
        <div style={{...S.sec,flex:1}}>
          <div style={S.secTitle}>Shapes ({Object.keys(metas).length})</div>
          {Object.values(metas).map(m=>(
            <div key={m.id} onClick={()=>{setSelId(m.id);const obj=shapesRef.current[m.id];if(obj&&cRef.current){cRef.current.setActiveObject(obj);cRef.current.renderAll();}}}
              style={{padding:"5px 8px",borderRadius:5,marginBottom:3,cursor:"pointer",background:selId===m.id?"rgba(34,197,94,0.1)":"transparent",border:`1px solid ${selId===m.id?"#22c55e":"transparent"}`}}>
              <div style={{fontSize:12,color:"#e2e8f0",fontWeight:500}}>{m.label}</div>
              <div style={{fontSize:10,color:"#475569"}}>{(m.widthFt*12).toFixed(1)}" × {(m.heightFt*12).toFixed(1)}" · {m.sqft.toFixed(2)} sqft</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CENTER ── */}
      <div style={S.center}>
        <div style={{padding:"8px 12px",background:"#0d1424",borderBottom:"1px solid #1e293b",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:11,color:"#475569"}}>
            {mode==="draw"?"Click to add points • click near first point or press Close to finish":"Click a shape to select • drag to move • scroll to zoom"}
          </span>
          <div style={{flex:1}}/>
          <button style={S.btn("#ef4444")} onClick={deleteSelected} disabled={!selId}>Delete</button>
          <button style={S.btn("#0ea5e9")} onClick={handleSave} disabled={!ready}>Export JSON+PNG</button>
        </div>

        <div style={{flex:1,overflow:"auto",padding:8}}>
          <div style={{borderRadius:8,overflow:"hidden",border:"1px solid #1e293b",display:"inline-block"}}>
            <canvas ref={canvasRef} style={{cursor:mode==="draw"?"crosshair":"default"}}/>
          </div>
        </div>

        <div style={S.bottomBar}>
          <div><div style={S.statLbl}>Total Area</div><div style={S.statVal}>{totSqft.toFixed(2)} sqft</div></div>
          <div><div style={S.statLbl}>Shapes</div><div style={S.statVal}>{Object.keys(metas).length}</div></div>
          <div><div style={S.statLbl}>Est. Job Cost</div><div style={{...S.statVal,color:"#f59e0b"}}>${totCost.toFixed(2)}</div></div>
          <div style={{fontSize:10,color:"#334155",marginLeft:"auto"}}>Scale: {GRID}px = 3" · 12" = {PPF}px</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={S.right}>
        <div style={{...S.sec,borderBottom:"1px solid #1e293b"}}>
          <div style={{fontSize:12,fontWeight:700,color:"#94a3b8"}}>{selMeta?"Shape Properties":"Select a shape"}</div>
        </div>

        {selMeta ? (
          <>
            {/* Label & Type */}
            <div style={S.sec}>
              <div style={S.secTitle}>Label</div>
              <input style={S.inp} value={selMeta.label} onChange={e=>updMeta(selMeta.id,{label:e.target.value})}/>
              <div style={{marginTop:6}}>
                <div style={S.secTitle}>Type</div>
                <select style={S.inp} value={selMeta.kind} onChange={e=>updMeta(selMeta.id,{kind:e.target.value as ShapeKind})}>
                  <option value="countertop">Countertop</option>
                  <option value="island">Island</option>
                  <option value="backsplash">Backsplash</option>
                  <option value="cutout">Cutout</option>
                </select>
              </div>
            </div>

            {/* Dimensions — manually editable */}
            <div style={S.sec}>
              <div style={S.secTitle}>Dimensions</div>

              {/* W / H inputs */}
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Width (in)</div>
                  <input type="number" style={S.inp} step="0.125" min="0.125"
                    value={Number((selMeta.widthFt*12).toFixed(3))}
                    onChange={e=>{
                      const v=parseFloat(e.target.value);
                      if(!isNaN(v)&&v>0) handleDimChange(selMeta.id,"width",v/12);
                    }}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Height (in)</div>
                  <input type="number" style={S.inp} step="0.125" min="0.125"
                    value={Number((selMeta.heightFt*12).toFixed(3))}
                    onChange={e=>{
                      const v=parseFloat(e.target.value);
                      if(!isNaN(v)&&v>0) handleDimChange(selMeta.id,"height",v/12);
                    }}/>
                </div>
              </div>

              {/* Computed values */}
              <div style={S.propRow}><span style={S.propLbl}>Area</span><span style={{...S.propVal,color:"#22c55e"}}>{selMeta.sqft.toFixed(4)} sqft</span></div>
              <div style={S.propRow}><span style={S.propLbl}>Perimeter</span><span style={S.propVal}>{(selMeta.perimLf*12).toFixed(2)}"</span></div>
              <div style={S.propRow}><span style={S.propLbl}>W</span><span style={S.propVal}>{fmtInches(selMeta.widthFt*PPF)}</span></div>
              <div style={S.propRow}><span style={S.propLbl}>H</span><span style={S.propVal}>{fmtInches(selMeta.heightFt*PPF)}</span></div>
            </div>

            {/* Labor */}
            <div style={S.sec}>
              <div style={S.secTitle}>Labor Assignment</div>
              <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={selMeta.shapeLabor} onChange={e=>updMeta(selMeta.id,{shapeLabor:e.target.checked})}/>
                <span style={{fontSize:12,color:"#94a3b8"}}>Shape labor ($/sqft)</span>
              </label>
              <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={selMeta.edgeLabor} onChange={e=>updMeta(selMeta.id,{edgeLabor:e.target.checked})}/>
                <span style={{fontSize:12,color:"#94a3b8"}}>Edge labor ($/lf)</span>
              </label>
              {[["Corners","corners"],["Sink cutouts","cutouts"]].map(([lbl,k])=>(
                <div key={k} style={{...S.propRow,marginBottom:8}}>
                  <span style={{fontSize:12,color:"#94a3b8"}}>{lbl}</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button style={{...S.btn("#1e293b"),padding:"2px 8px",fontSize:13}} onClick={()=>numInc(selMeta.id,k as "corners"|"cutouts",-1)}>−</button>
                    <span style={{fontSize:13,color:"#e2e8f0",minWidth:20,textAlign:"center"}}>{(selMeta as any)[k]}</span>
                    <button style={{...S.btn("#1e293b"),padding:"2px 8px",fontSize:13}} onClick={()=>numInc(selMeta.id,k as "corners"|"cutouts",1)}>+</button>
                  </div>
                </div>
              ))}
              <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                <input type="checkbox" checked={selMeta.hasBack} onChange={e=>updMeta(selMeta.id,{hasBack:e.target.checked})}/>
                <span style={{fontSize:12,color:"#94a3b8"}}>Backsplash</span>
              </label>
              {selMeta.hasBack&&(
                <div style={{marginLeft:20,marginBottom:4}}>
                  <div style={{fontSize:10,color:"#475569",marginBottom:2}}>Backsplash (in)</div>
                  <input type="number" step="0.5" min="0" style={{...S.inp,width:90}} value={Number((selMeta.backLf*12).toFixed(2))} onChange={e=>updMeta(selMeta.id,{backLf:Number(e.target.value)/12})}/>
                </div>
              )}
            </div>

            {/* Cost breakdown */}
            {selCost&&(
              <div style={S.sec}>
                <div style={S.secTitle}>Cost Breakdown</div>
                {selMeta.kind!=="cutout"&&<div style={S.costRow()}><span>Material ({selMeta.sqft.toFixed(2)} sqft)</span><span>${selCost.mat.toFixed(2)}</span></div>}
                {selMeta.shapeLabor&&<div style={S.costRow()}><span>Shape labor</span><span>${selCost.sl.toFixed(2)}</span></div>}
                {selMeta.edgeLabor&&<div style={S.costRow()}><span>Edge labor ({(selMeta.perimLf*12).toFixed(1)}")</span><span>${selCost.el.toFixed(2)}</span></div>}
                {selMeta.corners>0&&<div style={S.costRow()}><span>Corners ({selMeta.corners}×${rates.cornerEach})</span><span>${selCost.cl.toFixed(2)}</span></div>}
                {selMeta.cutouts>0&&<div style={S.costRow()}><span>Sink cutouts ({selMeta.cutouts}×${rates.sinkEach})</span><span>${selCost.cut.toFixed(2)}</span></div>}
                {selMeta.hasBack&&<div style={S.costRow()}><span>Backsplash ({(selMeta.backLf*12).toFixed(1)}")</span><span>${selCost.bl.toFixed(2)}</span></div>}
                <div style={S.costRow(true)}><span>Shape Total</span><span style={{color:"#22c55e"}}>${selCost.total.toFixed(2)}</span></div>
              </div>
            )}
          </>
        ) : (
          <div style={{padding:16,color:"#334155",fontSize:12,lineHeight:1.7}}>
            <p>• Select a shape to view and edit properties.</p>
            <p>• Use <b style={{color:"#64748b"}}>Draw Shape</b> to click custom polygons.</p>
            <p>• Use templates to add standard shapes.</p>
            <p>• Edit <b style={{color:"#22c55e"}}>Width / Height</b> directly in decimal feet (e.g. 2.5, 1.75).</p>
            <p>• Assign labor types for cost estimation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
