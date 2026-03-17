"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GRID = 20;
const PPF  = GRID * 4;

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

type ShapeKind = "countertop"|"island"|"backsplash"|"cutout";
interface ShapeMeta {
  id: string; label: string; kind: ShapeKind;
  sqft: number; perimLf: number;
  corners: number; cutouts: number; backLf: number;
  shapeLabor: boolean; edgeLabor: boolean; hasBack: boolean;
  shapeCost?: number;
}
interface Rates { material:number; shapePerSqft:number; edgePerLf:number; cornerEach:number; sinkEach:number; backPerLf:number; }

const DEF_RATES: Rates = { material:65, shapePerSqft:22, edgePerLf:9, cornerEach:45, sinkEach:160, backPerLf:12 };

function calcCost(m: ShapeMeta, r: Rates) {
  const mat = m.kind!=="cutout" ? m.sqft*r.material : 0;
  const sl  = m.shapeLabor ? m.sqft*r.shapePerSqft : 0;
  const el  = m.edgeLabor  ? m.perimLf*r.edgePerLf : 0;
  const cl  = m.corners*r.cornerEach;
  const cut = m.cutouts*r.sinkEach;
  const bl  = m.hasBack ? m.backLf*r.backPerLf : 0;
  return mat+sl+el+cl+cut+bl;
}

interface Props {
  quoteId: string;
  initialLayout?: { canvas_json: string; layout_data: any } | null;
  onApplied?: (totalCost: number, totalSqft: number) => void;
}

export function QuoteDrawingCanvas({ quoteId, initialLayout, onApplied }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fRef      = useRef<any>(null);
  const cRef      = useRef<any>(null);
  const modeRef   = useRef<"select"|"draw">("select");
  const ptsRef    = useRef<{x:number,y:number}[]>([]);
  const tmpRef    = useRef<any[]>([]);
  const shapesRef = useRef<Record<string,any>>({});

  const [ready, setReady]     = useState(false);
  const [mode, setMode]       = useState<"select"|"draw">("select");
  const [drawing, setDrawing] = useState(false);
  const [ptCount, setPtCount] = useState(0);
  const [metas, setMetas]     = useState<Record<string,ShapeMeta>>({});
  const [selId, setSelId]     = useState<string|null>(null);
  const [rates, setRates]     = useState<Rates>(DEF_RATES);
  const [saving, setSaving]   = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [popup, setPopup]     = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => { modeRef.current = mode; }, [mode]);

  function drawGrid(c: any, fabric: any) {
    const W=c.width, H=c.height;
    for (let x=0;x<=W;x+=GRID) { const l=new fabric.Line([x,0,x,H],{stroke:"#1a2540",strokeWidth:1,selectable:false,evented:false}); l.isGrid=true; c.add(l); c.sendObjectToBack(l); }
    for (let y=0;y<=H;y+=GRID) { const l=new fabric.Line([0,y,W,y],{stroke:"#1a2540",strokeWidth:1,selectable:false,evented:false}); l.isGrid=true; c.add(l); c.sendObjectToBack(l); }
  }

  function addPt(c:any, fabric:any, pt:{x:number,y:number}) {
    const pts=ptsRef.current;
    if (pts.length>0) { const prev=pts[pts.length-1]; const seg=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#D4AF37",strokeWidth:2,selectable:false,evented:false}); c.add(seg); tmpRef.current.push(seg); }
    const dot=new fabric.Circle({left:pt.x-4,top:pt.y-4,radius:4,fill:"#D4AF37",selectable:false,evented:false});
    c.add(dot); tmpRef.current.push(dot); ptsRef.current=[...pts,pt]; setPtCount(ptsRef.current.length); c.renderAll();
  }

  function updatePreview(c:any, fabric:any, pt:{x:number,y:number}) {
    const tmp=tmpRef.current;
    if (tmp.length&&tmp[tmp.length-1]._isPreview) c.remove(tmp.pop());
    const pts=ptsRef.current; if (!pts.length) return;
    const prev=pts[pts.length-1];
    const l=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#D4AF37",strokeWidth:1,strokeDashArray:[4,3],selectable:false,evented:false,opacity:0.5});
    l._isPreview=true; c.add(l); tmp.push(l); c.renderAll();
  }

  const finishPoly = useCallback((c:any, fabric:any) => {
    const pts=ptsRef.current; if (pts.length<3) { cancelDraw(); return; }
    tmpRef.current.forEach(o=>c.remove(o)); tmpRef.current=[];
    const poly=new fabric.Polygon([...pts],{fill:"rgba(212,175,55,0.1)",stroke:"#D4AF37",strokeWidth:2,objectCaching:false});
    const sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2));
    const lf=parseFloat((polyPerim(pts)/PPF).toFixed(2));
    const id=`p_${Date.now()}`;
    const meta:ShapeMeta={id,label:`Top ${Object.keys(metas).length+1}`,kind:"countertop",sqft,perimLf:lf,corners:pts.length,cutouts:0,backLf:0,shapeLabor:true,edgeLabor:true,hasBack:false};
    poly._shapeId=id; c.add(poly); shapesRef.current[id]=poly;
    setMetas(p=>({...p,[id]:meta})); setSelId(id); c.setActiveObject(poly);
    ptsRef.current=[]; tmpRef.current=[]; setDrawing(false); setPtCount(0); c.renderAll();
  }, [metas]);

  function cancelDraw() {
    const c=cRef.current; if (!c) return;
    tmpRef.current.forEach(o=>c.remove(o)); tmpRef.current=[]; ptsRef.current=[];
    setDrawing(false); setPtCount(0); c.renderAll();
  }

  useEffect(() => {
    if (!canvasRef.current) return;
    let gone=false;
    (async () => {
      const mod=await import("fabric");
      const fabric=(mod as any).fabric??mod;
      fRef.current=fabric;
      if (gone||!canvasRef.current) return;
      const c=new fabric.Canvas(canvasRef.current,{backgroundColor:"#0a1221",width:820,height:480});
      cRef.current=c; drawGrid(c,fabric);

      // Load saved layout if present
      if (initialLayout?.canvas_json) {
        try {
          c.loadFromJSON(initialLayout.canvas_json, () => {
            c.getObjects().forEach((obj:any) => { if (obj._shapeId) shapesRef.current[obj._shapeId]=obj; });
            c.renderAll();
          });
        } catch {}
      }
      if (initialLayout?.layout_data?.shapes) {
        const shapes: Record<string,ShapeMeta> = {};
        initialLayout.layout_data.shapes.forEach((s:ShapeMeta) => { shapes[s.id]=s; });
        setMetas(shapes);
      }
      if (initialLayout?.layout_data?.rates) setRates(initialLayout.layout_data.rates);

      c.on("mouse:down",(opt:any)=>{
        if (modeRef.current!=="draw") return;
        const p=c.getPointer(opt.e); const pt={x:snap(p.x),y:snap(p.y)};
        const pts=ptsRef.current;
        if (pts.length>=3&&Math.hypot(pt.x-pts[0].x,pt.y-pts[0].y)<=GRID*1.5) { finishPoly(c,fabric); return; }
        setDrawing(true); addPt(c,fabric,pt);
      });
      c.on("mouse:move",(opt:any)=>{ if (modeRef.current!=="draw"||!ptsRef.current.length) return; const p=c.getPointer(opt.e); updatePreview(c,fabric,{x:snap(p.x),y:snap(p.y)}); });
      c.on("mouse:dblclick",()=>{ if (modeRef.current==="draw"&&ptsRef.current.length>=3) { ptsRef.current.pop(); const tmp=tmpRef.current; [tmp.pop(),tmp.pop()].forEach(o=>o&&c.remove(o)); setPtCount(ptsRef.current.length); finishPoly(c,fabric); } });
      c.on("selection:created",(opt:any)=>setSelId(opt.selected?.[0]?._shapeId??null));
      c.on("selection:updated",(opt:any)=>setSelId(opt.selected?.[0]?._shapeId??null));
      c.on("selection:cleared",()=>setSelId(null));

      function recalc(obj:any) {
        const id=obj._shapeId; if (!id) return;
        let sqft=0,perimLf=0;
        if (obj.type==="rect") { const W=obj.getScaledWidth(),H=obj.getScaledHeight(); sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2)); perimLf=parseFloat((2*(W+H)/PPF).toFixed(2)); }
        else if (obj.type==="polygon"||obj.type==="polyline") { const sX=obj.scaleX??1,sY=obj.scaleY??1; const pts=(obj.points??[]).map((p:any)=>({x:p.x*sX,y:p.y*sY})); sqft=parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2)); perimLf=parseFloat((polyPerim(pts)/PPF).toFixed(2)); }
        else { const W=obj.getScaledWidth(),H=obj.getScaledHeight(); sqft=parseFloat(((W/PPF)*(H/PPF)).toFixed(2)); perimLf=parseFloat((Math.PI*(W+H)/2/PPF).toFixed(2)); }
        setMetas(prev=>{ if (!prev[id]) return prev; return {...prev,[id]:{...prev[id],sqft,perimLf}}; });
      }
      c.on("object:scaling",(opt:any)=>recalc(opt.target));
      c.on("object:modified",(opt:any)=>recalc(opt.target));
      setReady(true);
    })();
    return ()=>{ gone=true; cRef.current?.dispose(); cRef.current=null; };
  }, []);

  /* Template helpers */
  function mkMeta(label:string,kind:ShapeKind,sqft:number,lf:number,corners:number):ShapeMeta {
    return {id:"",label,kind,sqft,perimLf:lf,corners,cutouts:0,backLf:0,shapeLabor:true,edgeLabor:true,hasBack:false};
  }
  function addFabricObj(obj:any,meta:ShapeMeta) {
    const c=cRef.current; if (!c) return;
    const id=`s_${Date.now()}`; meta.id=id; obj._shapeId=id;
    c.add(obj); c.setActiveObject(obj); shapesRef.current[id]=obj;
    setMetas(p=>({...p,[id]:meta})); setSelId(id); c.renderAll();
  }
  function addRect() {
    const f=fRef.current; if (!f) return;
    const W=200,H=60;
    addFabricObj(new f.Rect({left:80,top:80,width:W,height:H,fill:"rgba(212,175,55,0.1)",stroke:"#D4AF37",strokeWidth:2}),
      mkMeta(`Top ${Object.keys(metas).length+1}`,"countertop",parseFloat(((W/PPF)*(H/PPF)).toFixed(2)),parseFloat((2*(W+H)/PPF).toFixed(2)),4));
  }
  function addIsland() {
    const f=fRef.current; if (!f) return;
    const W=180,H=90;
    addFabricObj(new f.Rect({left:200,top:200,width:W,height:H,fill:"rgba(96,165,250,0.1)",stroke:"#60a5fa",strokeWidth:2,rx:6,ry:6}),
      mkMeta(`Island ${Object.keys(metas).length+1}`,"island",parseFloat(((W/PPF)*(H/PPF)).toFixed(2)),parseFloat((2*(W+H)/PPF).toFixed(2)),4));
  }
  function addLShape() {
    const f=fRef.current; if (!f) return;
    const pts=[{x:0,y:0},{x:240,y:0},{x:240,y:60},{x:100,y:60},{x:100,y:180},{x:0,y:180}];
    addFabricObj(new f.Polygon(pts,{left:80,top:80,fill:"rgba(168,85,247,0.1)",stroke:"#a855f7",strokeWidth:2}),
      mkMeta(`L-Shape ${Object.keys(metas).length+1}`,"countertop",parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2)),parseFloat((polyPerim(pts)/PPF).toFixed(2)),6));
  }
  function addUShape() {
    const f=fRef.current; if (!f) return;
    const pts=[{x:0,y:0},{x:60,y:0},{x:60,y:140},{x:120,y:140},{x:120,y:0},{x:240,y:0},{x:240,y:60},{x:180,y:60},{x:180,y:200},{x:0,y:200}];
    addFabricObj(new f.Polygon(pts,{left:80,top:60,fill:"rgba(251,191,36,0.1)",stroke:"#fbbf24",strokeWidth:2}),
      mkMeta(`U-Shape ${Object.keys(metas).length+1}`,"countertop",parseFloat((polyArea(pts)/(PPF*PPF)).toFixed(2)),parseFloat((polyPerim(pts)/PPF).toFixed(2)),10));
  }
  function addSink() {
    const f=fRef.current; if (!f) return;
    const id=`cut_${Date.now()}`;
    const obj=new f.Ellipse({left:240,top:120,rx:52,ry:34,fill:"rgba(15,23,42,0.85)",stroke:"#f97316",strokeDashArray:[6,4],strokeWidth:2});
    obj._shapeId=id;
    const meta:ShapeMeta={id,label:"Sink Cutout",kind:"cutout",sqft:0,perimLf:0,corners:0,cutouts:1,backLf:0,shapeLabor:false,edgeLabor:false,hasBack:false};
    cRef.current.add(obj); cRef.current.setActiveObject(obj); shapesRef.current[id]=obj;
    setMetas(p=>({...p,[id]:meta})); setSelId(id); cRef.current.renderAll();
  }
  function addSeam() {
    const f=fRef.current; if (!f) return;
    cRef.current.add(new f.Line([100,200,400,200],{stroke:"#eab308",strokeWidth:2,strokeDashArray:[8,5]}));
    cRef.current.renderAll();
  }
  function deleteSelected() {
    const c=cRef.current; if (!c) return;
    const obj=c.getActiveObject(); if (!obj) return;
    const id=obj._shapeId;
    if (id) { delete shapesRef.current[id]; setMetas(p=>{const n={...p};delete n[id];return n;}); if (selId===id) setSelId(null); }
    c.remove(obj); c.renderAll();
  }
  function updMeta(id:string,u:Partial<ShapeMeta>) { setMetas(p=>({...p,[id]:{...p[id],...u}})); }
  function numInc(id:string,field:"corners"|"cutouts",delta:number) { const m=metas[id]; if (!m) return; updMeta(id,{[field]:Math.max(0,(m[field]??0)+delta)}); }

  /* Derived */
  const selMeta = selId ? metas[selId] : null;
  const totSqft = Object.values(metas).reduce((s,m)=>s+(m.kind!=="cutout"?m.sqft:0),0);
  const totCost = Object.values(metas).reduce((s,m)=>s+calcCost(m,rates),0);

  function showPopup(ok: boolean, msg: string) {
    setPopup({ ok, msg });
    setTimeout(() => setPopup(null), 4000);
  }

  async function handleApplyToQuote() {
    const c = cRef.current; if (!c) return;
    if (Object.keys(metas).length === 0) {
      showPopup(false, "No shapes drawn yet. Add at least one shape before saving.");
      return;
    }
    setSaving(true);
    try {
      const shapesWithCost = Object.values(metas).map(m => ({ ...m, shapeCost: calcCost(m, rates) }));
      const body = {
        canvas_json: JSON.stringify(c.toJSON(["_shapeId", "isGrid"])),
        layout_data: { shapes: shapesWithCost, rates },
        shapes: shapesWithCost,
        totalCost: totCost,
        totalSqft: totSqft,
      };
      const res = await fetch(`/api/quotes/${quoteId}/drawing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Server error ${res.status}`);
      }
      showPopup(true, `Drawing saved! ${totSqft.toFixed(2)} sqft · $${totCost.toFixed(2)} applied to quote.`);
      onApplied?.(totCost, totSqft);
    } catch (err: any) {
      showPopup(false, err.message ?? "Save failed — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const S = {
    panel: { background:"#0d1421", borderRight:"1px solid #1a2438", overflowY:"auto" as const, padding:"0" },
    sec: { padding:"10px 12px", borderBottom:"1px solid #1a2438" },
    title: { fontSize:10, fontWeight:700, color:"#4b6080", letterSpacing:"0.07em", textTransform:"uppercase" as const, marginBottom:6 },
    tBtn: (active:boolean) => ({ display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:active?600:400, background:active?"rgba(212,175,55,0.1)":"transparent", color:active?"#D4AF37":"#6b7280" } as React.CSSProperties),
    shapeBtn: (col:string) => ({ width:"100%",padding:"5px 9px",marginBottom:3,borderRadius:5,border:`1px solid ${col}30`,background:"transparent",color:col,cursor:"pointer",fontSize:11,textAlign:"left" as const }),
    inp: { width:"100%",background:"#060d18",border:"1px solid #1a2438",borderRadius:5,padding:"4px 8px",color:"#e2e8f0",fontSize:12 } as React.CSSProperties,
    row: { display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 } as React.CSSProperties,
    lbl: { fontSize:11,color:"#4b6080" } as React.CSSProperties,
    val: { fontSize:11,color:"#e2e8f0",fontWeight:500 } as React.CSSProperties,
  };

  return (
    <div style={{position:"relative"}}>

    {/* ── SAVE POPUP ── */}
    {popup && (
      <div style={{
        position:"fixed", inset:0, zIndex:2000,
        display:"flex", alignItems:"center", justifyContent:"center",
        pointerEvents:"none",
      }}>
        <div style={{
          pointerEvents:"auto",
          background: popup.ok ? "#0d2818" : "#2a0d0d",
          border: `2px solid ${popup.ok ? "#22c55e" : "#ef4444"}`,
          borderRadius: 16,
          padding: "28px 36px",
          minWidth: 320,
          maxWidth: 480,
          boxShadow: `0 0 60px ${popup.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          textAlign: "center",
          animation: "fadeInScale 0.2s ease",
        }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 14 }}>
            {popup.ok ? "✅" : "❌"}
          </div>
          <div style={{
            fontSize: 17, fontWeight: 700,
            color: popup.ok ? "#22c55e" : "#ef4444",
            marginBottom: 8,
          }}>
            {popup.ok ? "Drawing Saved Successfully" : "Save Failed"}
          </div>
          <div style={{ fontSize: 13, color: popup.ok ? "#86efac" : "#fca5a5", lineHeight: 1.5 }}>
            {popup.msg}
          </div>
          <button onClick={() => setPopup(null)} style={{
            marginTop: 18, padding: "6px 20px", borderRadius: 8,
            border: `1px solid ${popup.ok ? "#22c55e" : "#ef4444"}`,
            background: "transparent",
            color: popup.ok ? "#22c55e" : "#ef4444",
            fontSize: 12, cursor: "pointer", fontWeight: 600,
          }}>
            Dismiss
          </button>
        </div>
      </div>
    )}

    <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>

    <div style={{display:"flex",height:580,borderRadius:10,overflow:"hidden",border:"1px solid #1a2438"}}>

      {/* LEFT: tools */}
      <div style={{...S.panel, width:200,minWidth:200}}>
        <div style={{...S.sec,paddingTop:10}}>
          <div style={S.title}>Tool</div>
          <button style={S.tBtn(mode==="select")} onClick={()=>setMode("select")}>↖ Select / Move</button>
          <button style={S.tBtn(mode==="draw")} onClick={()=>setMode("draw")}>✏ Draw Shape</button>
          {drawing && (
            <div style={{marginTop:6,padding:"5px 8px",background:"rgba(212,175,55,0.07)",borderRadius:5}}>
              <div style={{fontSize:10,color:"#D4AF37",marginBottom:4}}>{ptCount} pts — click start to close</div>
              <div style={{display:"flex",gap:4}}>
                <button style={{padding:"3px 8px",borderRadius:4,border:"none",background:"#D4AF37",color:"#000",fontSize:10,cursor:"pointer",fontWeight:600}}
                  onClick={()=>{const c=cRef.current,f=fRef.current;if(c&&f)finishPoly(c,f);}}>Close</button>
                <button style={{padding:"3px 8px",borderRadius:4,border:"none",background:"#374151",color:"#9ca3af",fontSize:10,cursor:"pointer"}} onClick={cancelDraw}>×</button>
              </div>
            </div>
          )}
        </div>

        <div style={S.sec}>
          <div style={S.title}>Add Shape</div>
          {([["Straight Top",addRect,"#D4AF37"],["Island",addIsland,"#60a5fa"],["L-Shape",addLShape,"#a855f7"],["U-Shape",addUShape,"#fbbf24"],["Sink Cutout",addSink,"#f97316"],["Seam Line",addSeam,"#eab308"]] as [string,(()=>void),string][]).map(([lbl,fn,col])=>(
            <button key={lbl} style={S.shapeBtn(col)} disabled={!ready} onClick={fn}>+ {lbl}</button>
          ))}
        </div>

        <div style={S.sec}>
          <button style={{...S.tBtn(false),fontWeight:600}} onClick={()=>setRatesOpen(o=>!o)}>
            💰 Rates {ratesOpen?"▴":"▾"}
          </button>
          {ratesOpen && (
            <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
              {([["$/sqft material","material"],["$/sqft shape labor","shapePerSqft"],["$/lf edge labor","edgePerLf"],["$/ea corner","cornerEach"],["$/ea sink","sinkEach"],["$/lf backsplash","backPerLf"]] as [string,keyof Rates][]).map(([lbl,k])=>(
                <div key={k}><div style={{fontSize:9,color:"#4b6080",marginBottom:1}}>{lbl}</div>
                  <input style={S.inp} type="number" value={rates[k]} onChange={e=>setRates(r=>({...r,[k]:Number(e.target.value)}))} /></div>
              ))}
            </div>
          )}
        </div>

        <div style={{...S.sec,flex:1}}>
          <div style={S.title}>Shapes ({Object.keys(metas).length})</div>
          {Object.values(metas).map(m=>(
            <div key={m.id} onClick={()=>{ setSelId(m.id); const obj=shapesRef.current[m.id]; if(obj&&cRef.current){cRef.current.setActiveObject(obj);cRef.current.renderAll();}}}
              style={{padding:"4px 7px",borderRadius:4,marginBottom:2,cursor:"pointer",background:selId===m.id?"rgba(212,175,55,0.08)":"transparent",border:`1px solid ${selId===m.id?"#D4AF37":"transparent"}`}}>
              <div style={{fontSize:11,color:"#e2e8f0"}}>{m.label}</div>
              <div style={{fontSize:9,color:"#4b6080"}}>{m.sqft.toFixed(1)} sqft · ${calcCost(m,rates).toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CENTER: canvas */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#060d18",overflow:"hidden"}}>
        <div style={{padding:"6px 10px",background:"#0d1421",borderBottom:"1px solid #1a2438",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#374151",flex:1}}>
            {mode==="draw"?"Click to add points • click near first point (or Close) to finish":"Click shape to select • drag to move • scroll to zoom"}
          </span>
          <button style={{padding:"4px 9px",borderRadius:5,border:"none",background:"#1f2937",color:"#f87171",fontSize:11,cursor:"pointer"}} onClick={deleteSelected} disabled={!selId}>Delete</button>
          <button
            onClick={handleApplyToQuote}
            disabled={!ready || saving}
            style={{padding:"5px 14px",borderRadius:6,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",
              background: saving ? "#374151" : "linear-gradient(135deg,#D4AF37,#A88B20)",
              color: saving ? "#fff" : "#000",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Saving…" : `💾 Save to Quote ($${totCost.toFixed(2)})`}
          </button>
        </div>
        <div style={{flex:1,overflow:"auto",padding:6,display:"flex",alignItems:"flex-start"}}>
          <canvas ref={canvasRef} style={{cursor:mode==="draw"?"crosshair":"default",borderRadius:6}} />
        </div>
        <div style={{padding:"6px 12px",background:"#0d1421",borderTop:"1px solid #1a2438",display:"flex",gap:20}}>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Total Area: </span><span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>{totSqft.toFixed(2)} sqft</span></div>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Shapes: </span><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{Object.keys(metas).length}</span></div>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Est. Cost: </span><span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>${totCost.toFixed(2)}</span></div>
        </div>
      </div>

      {/* RIGHT: properties */}
      <div style={{...S.panel,width:220,minWidth:220,borderLeft:"1px solid #1a2438",borderRight:"none"}}>
        <div style={{...S.sec,padding:"8px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:selMeta?"#e2e8f0":"#374151"}}>
            {selMeta?"Shape Properties":"Select a shape"}
          </div>
        </div>
        {selMeta ? (
          <>
            <div style={S.sec}>
              <div style={S.title}>Label & Type</div>
              <input style={{...S.inp,marginBottom:6}} value={selMeta.label} onChange={e=>updMeta(selMeta.id,{label:e.target.value})} />
              <select style={S.inp} value={selMeta.kind} onChange={e=>updMeta(selMeta.id,{kind:e.target.value as ShapeKind})}>
                <option value="countertop">Countertop</option>
                <option value="island">Island</option>
                <option value="backsplash">Backsplash</option>
                <option value="cutout">Cutout</option>
              </select>
            </div>
            <div style={S.sec}>
              <div style={S.title}>Dimensions</div>
              <div style={S.row}><span style={S.lbl}>Area</span><span style={{...S.val,color:"#D4AF37"}}>{selMeta.sqft.toFixed(2)} sqft</span></div>
              <div style={S.row}><span style={S.lbl}>Perimeter</span><span style={S.val}>{selMeta.perimLf.toFixed(2)} lf</span></div>
            </div>
            <div style={S.sec}>
              <div style={S.title}>Labor</div>
              {[["Shape labor","shapeLabor"],["Edge labor","edgeLabor"],["Backsplash","hasBack"]].map(([lbl,k])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,cursor:"pointer"}}>
                  <input type="checkbox" checked={(selMeta as any)[k]} onChange={e=>updMeta(selMeta.id,{[k]:e.target.checked})} />
                  <span style={{fontSize:11,color:"#6b7280"}}>{lbl}</span>
                </label>
              ))}
              {selMeta.hasBack&&<div style={{marginLeft:16,marginBottom:4}}>
                <div style={{fontSize:9,color:"#4b6080",marginBottom:2}}>Back LF</div>
                <input type="number" style={{...S.inp,width:70}} value={selMeta.backLf} onChange={e=>updMeta(selMeta.id,{backLf:Number(e.target.value)})} />
              </div>}
              {[["Corners","corners"],["Sink cutouts","cutouts"]].map(([lbl,k])=>(
                <div key={k} style={{...S.row,marginBottom:6}}>
                  <span style={S.lbl}>{lbl}</span>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <button style={{padding:"1px 7px",borderRadius:3,border:"none",background:"#1f2937",color:"#9ca3af",cursor:"pointer",fontSize:13}} onClick={()=>numInc(selMeta.id,k as "corners"|"cutouts",-1)}>−</button>
                    <span style={{fontSize:12,color:"#e2e8f0",minWidth:18,textAlign:"center"}}>{(selMeta as any)[k]}</span>
                    <button style={{padding:"1px 7px",borderRadius:3,border:"none",background:"#1f2937",color:"#9ca3af",cursor:"pointer",fontSize:13}} onClick={()=>numInc(selMeta.id,k as "corners"|"cutouts",1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={S.sec}>
              <div style={S.title}>Cost Breakdown</div>
              {(() => {
                const mat=selMeta.kind!=="cutout"?selMeta.sqft*rates.material:0;
                const sl=selMeta.shapeLabor?selMeta.sqft*rates.shapePerSqft:0;
                const el=selMeta.edgeLabor?selMeta.perimLf*rates.edgePerLf:0;
                const cl=selMeta.corners*rates.cornerEach;
                const cut=selMeta.cutouts*rates.sinkEach;
                const bl=selMeta.hasBack?selMeta.backLf*rates.backPerLf:0;
                const total=mat+sl+el+cl+cut+bl;
                return (<>
                  {mat>0&&<div style={S.row}><span style={S.lbl}>Material</span><span style={S.val}>${mat.toFixed(2)}</span></div>}
                  {sl>0&&<div style={S.row}><span style={S.lbl}>Shape labor</span><span style={S.val}>${sl.toFixed(2)}</span></div>}
                  {el>0&&<div style={S.row}><span style={S.lbl}>Edge labor</span><span style={S.val}>${el.toFixed(2)}</span></div>}
                  {cl>0&&<div style={S.row}><span style={S.lbl}>Corners</span><span style={S.val}>${cl.toFixed(2)}</span></div>}
                  {cut>0&&<div style={S.row}><span style={S.lbl}>Sink cutouts</span><span style={S.val}>${cut.toFixed(2)}</span></div>}
                  {bl>0&&<div style={S.row}><span style={S.lbl}>Backsplash</span><span style={S.val}>${bl.toFixed(2)}</span></div>}
                  <div style={{...S.row,borderTop:"1px solid #1a2438",paddingTop:6,marginTop:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Shape Total</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>${total.toFixed(2)}</span>
                  </div>
                </>);
              })()}
            </div>
          </>
        ) : (
          <div style={{padding:12,color:"#374151",fontSize:11,lineHeight:1.8}}>
            <p>• Add a shape from the left panel</p>
            <p>• Use Draw Shape to sketch a custom countertop</p>
            <p>• Select a shape to assign labor and see cost</p>
            <p>• Click <b style={{color:"#D4AF37"}}>Apply to Quote</b> to save</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
