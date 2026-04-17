"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const GRID = 20;
const PPF  = GRID * 4; // 80 pixels = 1 foot

// ─────────────────────────────────────────────────────────────────────────────
//  SHAPE TEMPLATE LIBRARY  ←  ADD YOUR CUSTOM SHAPES HERE
// ─────────────────────────────────────────────────────────────────────────────
//
//  Steps to add a new shape:
//  1. Copy your image (PNG / JPG / SVG) into  /public/shapes/
//  2. Add an entry to CUSTOM_SHAPE_TEMPLATES below.
//
//  Field reference:
//   id             – unique slug (no spaces)
//   label          – display name in the panel
//   kind           – "countertop" | "island" | "backsplash" | "cutout"
//   stroke         – border colour on canvas  (hex)
//   image          – path from /public/  e.g. "/shapes/peninsula.png"
//   defaultWidthFt – starting width in FEET when dropped on the canvas
//   defaultHeightFt– starting height in FEET
//   normalizedPoints (optional)
//     • Polygon outline as 0–1 coordinates where (0,0) = top-left of the
//       bounding box and (1,1) = bottom-right.  Trace clockwise.
//     • Used for EXACT sqft calculation.  If omitted, width×height is used.
//   defaultCorners – pre-filled corner count (affects add-on cost)
//
//  Example for a Peninsula shape:
//    {
//      id: "peninsula",
//      label: "Peninsula",
//      kind: "countertop",
//      stroke: "#D4AF37",
//      image: "/shapes/peninsula.png",
//      defaultWidthFt: 5,
//      defaultHeightFt: 2.5,
//      normalizedPoints: [
//        { x:0, y:0 }, { x:1, y:0 }, { x:1, y:0.6 },
//        { x:0.5, y:0.6 }, { x:0.5, y:1 }, { x:0, y:1 },
//      ],
//      defaultCorners: 6,
//    },
//
// ─────────────────────────────────────────────────────────────────────────────
interface ShapeTemplate {
  id: string;
  label: string;
  kind: "countertop" | "island" | "backsplash" | "cutout";
  stroke: string;
  image?: string;                           // path under /public/
  normalizedPoints?: { x: number; y: number }[]; // 0–1 outline coords
  defaultWidthFt: number;
  defaultHeightFt: number;
  defaultCorners?: number;
}

// This array is now populated from the database via /api/shape-templates
// Add shapes through the Shape Library page in the app (sidebar → Shape Library)
const CUSTOM_SHAPE_TEMPLATES: ShapeTemplate[] = [];

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

function fmtInches(px: number): string {
  const inches = Math.abs(px) / PPF * 12;
  return `${Number(inches.toFixed(1))}"`;
}

function productColorStyle(colorName?: string | null): { fill: string; stroke: string } {
  if (!colorName) return { fill: "rgba(212,175,55,0.12)", stroke: "#D4AF37" };
  const c = colorName.toLowerCase();
  if (c.includes("white")||c.includes("snow")||c.includes("ivory")||c.includes("cream"))
    return { fill: "rgba(240,240,230,0.22)", stroke: "#d1d5db" };
  if (c.includes("black")||c.includes("nero")||c.includes("absolute"))
    return { fill: "rgba(20,20,30,0.65)", stroke: "#6b7280" };
  if (c.includes("gray")||c.includes("grey")||c.includes("silver"))
    return { fill: "rgba(107,114,128,0.28)", stroke: "#9ca3af" };
  if (c.includes("brown")||c.includes("coffee")||c.includes("walnut")||c.includes("mocha"))
    return { fill: "rgba(139,90,43,0.28)", stroke: "#a16207" };
  if (c.includes("beige")||c.includes("sand")||c.includes("tan")||c.includes("wheat"))
    return { fill: "rgba(210,180,140,0.28)", stroke: "#d97706" };
  if (c.includes("blue")||c.includes("navy")||c.includes("ocean"))
    return { fill: "rgba(96,165,250,0.2)", stroke: "#60a5fa" };
  if (c.includes("green")||c.includes("emerald")||c.includes("forest"))
    return { fill: "rgba(74,222,128,0.2)", stroke: "#4ade80" };
  if (c.includes("red")||c.includes("rouge")||c.includes("cherry")||c.includes("burgundy"))
    return { fill: "rgba(248,113,113,0.22)", stroke: "#f87171" };
  if (c.includes("gold")||c.includes("yellow")||c.includes("amber")||c.includes("honey"))
    return { fill: "rgba(212,175,55,0.2)", stroke: "#D4AF37" };
  if (c.includes("pink")||c.includes("rose")||c.includes("blush"))
    return { fill: "rgba(244,114,182,0.2)", stroke: "#f472b6" };
  if (c.includes("purple")||c.includes("violet")||c.includes("lavender"))
    return { fill: "rgba(168,85,247,0.2)", stroke: "#a855f7" };
  return { fill: "rgba(212,175,55,0.12)", stroke: "#D4AF37" };
}

type ShapeKind = "countertop"|"island"|"backsplash"|"cutout";

interface Product {
  id: string;
  product_name: string;
  color: string | null;
  base_cost: number | null;
}

interface ShapeMeta {
  id: string; label: string; kind: ShapeKind;
  sqft: number; perimLf: number;
  widthFt: number; heightFt: number;
  corners: number; cutouts: number; backLf: number; hasBack: boolean;
  productId?: string; productName?: string; productColor?: string; productCostPerSqft?: number;
  shapeCost?: number;
}

interface Rates { cornerEach: number; sinkEach: number; backPerLf: number; }

const DEF_RATES: Rates = { cornerEach: 0, sinkEach: 0, backPerLf: 0 };

function calcCost(m: ShapeMeta, r: Rates): number {
  const mat = m.kind !== "cutout" ? m.sqft * (m.productCostPerSqft ?? 0) : 0;
  return mat + m.corners * r.cornerEach + m.cutouts * r.sinkEach + (m.hasBack ? m.backLf * r.backPerLf : 0);
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
  const dimLabelsRef = useRef<Record<string,{wObj:any;hObj:any}>>({});
  const metasRef  = useRef<Record<string,ShapeMeta>>({});

  const [ready, setReady]     = useState(false);
  const [mode, setMode]       = useState<"select"|"draw">("select");
  const [drawing, setDrawing] = useState(false);
  const [ptCount, setPtCount] = useState(0);
  const [metas, setMetas]     = useState<Record<string,ShapeMeta>>({});
  const [selId, setSelId]     = useState<string|null>(null);
  const [rates, setRates]     = useState<Rates>(DEF_RATES);
  const [saving, setSaving]   = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [popup, setPopup]     = useState<{ok:boolean;msg:string}|null>(null);
  const [products, setProducts]   = useState<Product[]>([]);
  const [dbShapes, setDbShapes]   = useState<ShapeTemplate[]>([]);
  const [shapeSearch, setShapeSearch] = useState("");

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { metasRef.current = metas; }, [metas]);

  // Fetch products + shape templates from DB
  useEffect(() => {
    fetch("/api/products")
      .then(r => r.json()).then(j => setProducts(j.products ?? [])).catch(() => {});
    fetch("/api/shape-templates")
      .then(r => r.json())
      .then(j => {
        const rows = j.templates ?? [];
        // Map DB rows → ShapeTemplate interface used by the canvas
        setDbShapes(rows.map((t: any) => ({
          id:                t.id,
          label:             t.name,
          kind:              t.kind,
          stroke:            t.stroke_color,
          image:             t.image_data ?? undefined,
          normalizedPoints:  t.normalized_points ?? undefined,
          defaultWidthFt:    Number(t.default_width_ft),
          defaultHeightFt:   Number(t.default_height_ft),
          defaultCorners:    t.default_corners ?? 4,
        })));
      }).catch(() => {});
  }, []);

  // ── Dimension label helpers ──────────────────────────────────────
  function makeDimText(fabric: any, text: string, left: number, top: number) {
    const obj = new (fabric.Text || fabric.FabricText)(text, {
      left, top,
      originX: "center", originY: "center",
      fontSize: 11, fill: "#1e40af",
      fontFamily: "monospace",
      backgroundColor: "rgba(219,234,254,0.9)",
      padding: 3,
      selectable: false, evented: false,
    });
    obj._isDimLabel = true;
    return obj;
  }

  function getShapeBounds(obj: any) {
    try { return obj.getBoundingRect(false, true); } catch { return obj.getBoundingRect(); }
  }

  function createDimLabels(id: string, obj: any) {
    const c = cRef.current; const fabric = fRef.current;
    if (!c || !fabric) return;
    const old = dimLabelsRef.current[id];
    if (old) { try { c.remove(old.wObj); c.remove(old.hObj); } catch {} }
    const br = getShapeBounds(obj);
    const wObj = makeDimText(fabric, `W: ${fmtInches(br.width)}`, br.left + br.width / 2, Math.max(br.top - 16, 12));
    const hObj = makeDimText(fabric, `H: ${fmtInches(br.height)}`, br.left + br.width / 2, br.top + br.height + 16);
    c.add(wObj); c.add(hObj);
    try { (c.bringToFront || c.bringObjectToFront).call(c, wObj); (c.bringToFront || c.bringObjectToFront).call(c, hObj); } catch {}
    dimLabelsRef.current[id] = { wObj, hObj };
  }

  function updateDimLabels(obj: any) {
    const c = cRef.current;
    const id = obj?._shapeId;
    if (!c || !id) return;
    const labels = dimLabelsRef.current[id];
    if (!labels) { createDimLabels(id, obj); return; }
    const br = getShapeBounds(obj);
    const W = `W: ${fmtInches(br.width)}`;
    const H = `H: ${fmtInches(br.height)}`;
    try {
      labels.wObj.set({ text: W, left: br.left + br.width / 2, top: Math.max(br.top - 16, 12) });
      labels.hObj.set({ text: H, left: br.left + br.width / 2, top: br.top + br.height + 16 });
    } catch {}
    c.renderAll();
  }

  function removeDimLabels(id: string) {
    const c = cRef.current;
    const labels = dimLabelsRef.current[id];
    if (c && labels) { try { c.remove(labels.wObj); c.remove(labels.hObj); } catch {} }
    delete dimLabelsRef.current[id];
  }

  // ── Grid ──────────────────────────────────────────────────────────
  function drawGrid(c: any, fabric: any) {
    const W=c.width, H=c.height;
    for (let x=0;x<=W;x+=GRID){const l=new fabric.Line([x,0,x,H],{stroke:"#d1d5db",strokeWidth:1,selectable:false,evented:false});l.isGrid=true;c.add(l);c.sendObjectToBack(l);}
    for (let y=0;y<=H;y+=GRID){const l=new fabric.Line([0,y,W,y],{stroke:"#d1d5db",strokeWidth:1,selectable:false,evented:false});l.isGrid=true;c.add(l);c.sendObjectToBack(l);}
  }

  // ── Draw mode helpers ─────────────────────────────────────────────
  function addPt(c:any,fabric:any,pt:{x:number,y:number}) {
    const pts=ptsRef.current;
    if(pts.length>0){const prev=pts[pts.length-1];const seg=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#D4AF37",strokeWidth:2,selectable:false,evented:false});c.add(seg);tmpRef.current.push(seg);}
    const dot=new fabric.Circle({left:pt.x-4,top:pt.y-4,radius:4,fill:"#D4AF37",selectable:false,evented:false});
    c.add(dot);tmpRef.current.push(dot);ptsRef.current=[...pts,pt];setPtCount(ptsRef.current.length);c.renderAll();
  }

  function updatePreview(c:any,fabric:any,pt:{x:number,y:number}) {
    const tmp=tmpRef.current;
    if(tmp.length&&tmp[tmp.length-1]._isPreview)c.remove(tmp.pop());
    const pts=ptsRef.current;if(!pts.length)return;
    const prev=pts[pts.length-1];
    const l=new fabric.Line([prev.x,prev.y,pt.x,pt.y],{stroke:"#D4AF37",strokeWidth:1,strokeDashArray:[4,3],selectable:false,evented:false,opacity:0.5});
    l._isPreview=true;c.add(l);tmp.push(l);c.renderAll();
  }

  const finishPoly = useCallback((c:any,fabric:any) => {
    const pts=ptsRef.current; if(pts.length<3){cancelDraw();return;}
    tmpRef.current.forEach(o=>c.remove(o));tmpRef.current=[];
    const poly=new fabric.Polygon([...pts],{fill:"rgba(212,175,55,0.12)",stroke:"#D4AF37",strokeWidth:2,objectCaching:false});
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
    const meta:ShapeMeta={id,label:`Top ${count+1}`,kind:"countertop",sqft,perimLf:lf,widthFt,heightFt,corners:pts.length,cutouts:0,backLf:0,hasBack:false};
    createDimLabels(id,poly);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);c.setActiveObject(poly);
    ptsRef.current=[];tmpRef.current=[];setDrawing(false);setPtCount(0);c.renderAll();
  }, []);

  function cancelDraw() {
    const c=cRef.current;if(!c)return;
    tmpRef.current.forEach(o=>c.remove(o));tmpRef.current=[];ptsRef.current=[];
    setDrawing(false);setPtCount(0);c.renderAll();
  }

  // ── Canvas init ───────────────────────────────────────────────────
  useEffect(() => {
    if(!canvasRef.current) return;
    let gone=false;
    (async()=>{
      const mod=await import("fabric");
      const fabric=(mod as any).fabric??mod;
      fRef.current=fabric;
      if(gone||!canvasRef.current) return;
      const c=new fabric.Canvas(canvasRef.current,{backgroundColor:"#ffffff",width:820,height:480});
      cRef.current=c;drawGrid(c,fabric);

      function recalc(obj:any) {
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

      // Load saved layout
      if(initialLayout?.canvas_json){
        try{
          c.loadFromJSON(initialLayout.canvas_json,()=>{
            c.getObjects().forEach((obj:any)=>{
              if(obj._shapeId && !obj._isDimLabel){shapesRef.current[obj._shapeId]=obj;}
            });
            // Recreate dim labels after short delay to let canvas settle
            setTimeout(()=>{
              Object.keys(shapesRef.current).forEach(id=>{
                const obj=shapesRef.current[id];
                if(obj) createDimLabels(id,obj);
              });
              c.renderAll();
            },100);
          });
        }catch{}
      }
      if(initialLayout?.layout_data?.shapes){
        const shapes:Record<string,ShapeMeta>={};
        initialLayout.layout_data.shapes.forEach((s:ShapeMeta)=>{shapes[s.id]=s;});
        setMetas(shapes);
      }
      if(initialLayout?.layout_data?.rates) setRates(initialLayout.layout_data.rates);

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
    return()=>{gone=true;cRef.current?.dispose();cRef.current=null;};
  },[]);

  // ── Shape factories ───────────────────────────────────────────────
  function mkMeta(label:string,kind:ShapeKind,sqft:number,lf:number,corners:number,widthFt:number,heightFt:number):ShapeMeta {
    return {id:"",label,kind,sqft,perimLf:lf,widthFt,heightFt,corners,cutouts:0,backLf:0,hasBack:false};
  }

  function addFabricObj(obj:any,meta:ShapeMeta) {
    const c=cRef.current;if(!c)return;
    const id=`s_${Date.now()}`;meta.id=id;obj._shapeId=id;
    c.add(obj);c.setActiveObject(obj);shapesRef.current[id]=obj;
    createDimLabels(id,obj);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);c.renderAll();
  }

  function addRect() {
    const f=fRef.current;if(!f)return;
    const W=200,H=60;
    addFabricObj(new f.Rect({left:80,top:80,width:W,height:H,fill:"rgba(212,175,55,0.12)",stroke:"#D4AF37",strokeWidth:2}),
      mkMeta(`Top ${Object.keys(metas).length+1}`,"countertop",parseFloat(((W/PPF)*(H/PPF)).toFixed(2)),parseFloat((2*(W+H)/PPF).toFixed(2)),4,parseFloat((W/PPF).toFixed(2)),parseFloat((H/PPF).toFixed(2))));
  }
  function addIsland() {
    const f=fRef.current;if(!f)return;
    const W=180,H=90;
    addFabricObj(new f.Rect({left:200,top:200,width:W,height:H,fill:"rgba(96,165,250,0.1)",stroke:"#60a5fa",strokeWidth:2,rx:6,ry:6}),
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
    const meta:ShapeMeta={id,label:"Sink Cutout",kind:"cutout",sqft:0,perimLf:0,widthFt:parseFloat(((52*2)/PPF).toFixed(2)),heightFt:parseFloat(((34*2)/PPF).toFixed(2)),corners:0,cutouts:1,backLf:0,hasBack:false};
    cRef.current.add(obj);cRef.current.setActiveObject(obj);shapesRef.current[id]=obj;
    createDimLabels(id,obj);
    setMetas(p=>({...p,[id]:meta}));setSelId(id);cRef.current.renderAll();
  }
  function addSeam() {
    const f=fRef.current;if(!f)return;
    cRef.current.add(new f.Line([100,200,400,200],{stroke:"#eab308",strokeWidth:2,strokeDashArray:[8,5]}));
    cRef.current.renderAll();
  }

  // ── Custom template shapes ────────────────────────────────────────
  function addTemplateShape(tpl: ShapeTemplate) {
    const f=fRef.current; const c=cRef.current; if(!f||!c) return;
    const widthPx  = tpl.defaultWidthFt  * PPF;
    const heightPx = tpl.defaultHeightFt * PPF;
    const left = 60 + (Object.keys(metas).length % 3) * 30;
    const top  = 60 + (Object.keys(metas).length % 3) * 20;

    if (tpl.normalizedPoints && tpl.normalizedPoints.length >= 3) {
      // Polygon with normalized coordinates scaled to the requested dimensions
      const pts = tpl.normalizedPoints.map(p => ({
        x: Math.round(p.x * widthPx),
        y: Math.round(p.y * heightPx),
      }));
      const fill = `${tpl.stroke}18`;
      const obj = new f.Polygon(pts, { left, top, fill, stroke: tpl.stroke, strokeWidth: 2, objectCaching: false });
      const sqft = parseFloat((polyArea(pts) / (PPF * PPF)).toFixed(2));
      const lf   = parseFloat((polyPerim(pts) / PPF).toFixed(2));
      addFabricObj(obj, mkMeta(tpl.label, tpl.kind, sqft, lf, tpl.defaultCorners ?? pts.length,
        tpl.defaultWidthFt, tpl.defaultHeightFt));

    } else if (tpl.image) {
      // Image-based shape — load the image onto the canvas
      // Fabric v6 uses Promise-based fromURL; v5 used a callback as the second arg.
      const ImageClass = f.Image || f.FabricImage;
      if (ImageClass?.fromURL) {
        const crossOriginOpt = tpl.image.startsWith("data:") ? {} : { crossOrigin: "anonymous" };
        const applyImg = (img: any) => {
          img.scaleToWidth(widthPx);
          img.set({ left, top });
          const sqft = parseFloat((tpl.defaultWidthFt * tpl.defaultHeightFt).toFixed(2));
          const lf   = parseFloat((2 * (tpl.defaultWidthFt + tpl.defaultHeightFt)).toFixed(2));
          addFabricObj(img, mkMeta(tpl.label, tpl.kind, sqft, lf, tpl.defaultCorners ?? 4,
            tpl.defaultWidthFt, tpl.defaultHeightFt));
        };
        const result = ImageClass.fromURL(tpl.image, crossOriginOpt);
        if (result && typeof result.then === "function") {
          result.then(applyImg).catch(() => {
            // Image failed to load — fall back to a coloured rectangle
            const fill = `${tpl.stroke}18`;
            const obj  = new f.Rect({ left, top, width: widthPx, height: heightPx, fill, stroke: tpl.stroke, strokeWidth: 2 });
            const sqft = parseFloat((tpl.defaultWidthFt * tpl.defaultHeightFt).toFixed(2));
            const lf   = parseFloat((2 * (tpl.defaultWidthFt + tpl.defaultHeightFt)).toFixed(2));
            addFabricObj(obj, mkMeta(tpl.label, tpl.kind, sqft, lf, tpl.defaultCorners ?? 4,
              tpl.defaultWidthFt, tpl.defaultHeightFt));
          });
        } else {
          // Fabric v5 callback style
          ImageClass.fromURL(tpl.image, applyImg, crossOriginOpt);
        }
      }
    } else {
      // Fallback — plain rectangle
      const fill = `${tpl.stroke}18`;
      const obj = new f.Rect({ left, top, width: widthPx, height: heightPx, fill, stroke: tpl.stroke, strokeWidth: 2 });
      const sqft = parseFloat((tpl.defaultWidthFt * tpl.defaultHeightFt).toFixed(2));
      const lf   = parseFloat((2 * (tpl.defaultWidthFt + tpl.defaultHeightFt)).toFixed(2));
      addFabricObj(obj, mkMeta(tpl.label, tpl.kind, sqft, lf, tpl.defaultCorners ?? 4,
        tpl.defaultWidthFt, tpl.defaultHeightFt));
    }
  }

  function deleteSelected() {
    const c=cRef.current;if(!c)return;
    const obj=c.getActiveObject();if(!obj)return;
    const id=obj._shapeId;
    if(id){removeDimLabels(id);delete shapesRef.current[id];setMetas(p=>{const n={...p};delete n[id];return n;});if(selId===id)setSelId(null);}
    c.remove(obj);c.renderAll();
  }

  function updMeta(id:string,u:Partial<ShapeMeta>){setMetas(p=>({...p,[id]:{...p[id],...u}}));}
  function numInc(id:string,field:"corners"|"cutouts",delta:number){const m=metas[id];if(!m)return;updMeta(id,{[field]:Math.max(0,(m[field]??0)+delta)});}

  // ── Product assignment ────────────────────────────────────────────
  function handleProductChange(shapeId:string, productId:string) {
    const prod=products.find(p=>p.id===productId);
    const c=cRef.current;const obj=shapesRef.current[shapeId];
    if(!c||!obj)return;
    if(prod){
      const cs=productColorStyle(prod.color);
      obj.set({fill:cs.fill,stroke:cs.stroke});
      c.renderAll();
      updMeta(shapeId,{productId:prod.id,productName:prod.product_name,productColor:prod.color??undefined,productCostPerSqft:prod.base_cost??0});
    } else {
      // "none" selected
      obj.set({fill:"rgba(212,175,55,0.12)",stroke:"#D4AF37"});
      c.renderAll();
      updMeta(shapeId,{productId:undefined,productName:undefined,productColor:undefined,productCostPerSqft:0});
    }
  }

  // ── Manual dimension editing ──────────────────────────────────────
  function handleDimChange(id:string, dim:"width"|"height", valFt:number) {
    const c=cRef.current;const obj=shapesRef.current[id];
    if(!c||!obj||valFt<=0)return;
    const br=getShapeBounds(obj);
    const newPx=valFt*PPF;
    if(dim==="width"){
      const factor=newPx/br.width;
      obj.set("scaleX",(obj.scaleX??1)*factor);
    } else {
      const factor=newPx/br.height;
      obj.set("scaleY",(obj.scaleY??1)*factor);
    }
    obj.setCoords();
    c.renderAll();
    // Recalc meta
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

  // ── Derived ───────────────────────────────────────────────────────
  const selMeta = selId ? metas[selId] : null;
  const totSqft = Object.values(metas).reduce((s,m)=>s+(m.kind!=="cutout"?m.sqft:0),0);
  const totCost = Object.values(metas).reduce((s,m)=>s+calcCost(m,rates),0);

  function showPopup(ok:boolean,msg:string){setPopup({ok,msg});setTimeout(()=>setPopup(null),4000);}

  // ── Save ──────────────────────────────────────────────────────────
  async function handleApplyToQuote() {
    const c=cRef.current;if(!c)return;
    if(Object.keys(metas).length===0){showPopup(false,"No shapes drawn yet. Add at least one shape before saving.");return;}
    setSaving(true);
    try{
      const shapesWithCost=Object.values(metas).map(m=>({...m,shapeCost:calcCost(m,rates)}));

      // Capture canvas image — temporarily hide dim labels and grid
      const dimObjs=Object.values(dimLabelsRef.current).flatMap(d=>[d.wObj,d.hObj]).filter(Boolean);
      dimObjs.forEach(o=>{try{o.set("visible",false);}catch{}});
      c.renderAll();
      let imageDataUrl="";
      try{ imageDataUrl=c.toDataURL({format:"png",multiplier:1}); }catch{}
      dimObjs.forEach(o=>{try{o.set("visible",true);}catch{}});
      c.renderAll();

      // Exclude dim labels from canvas JSON
      const json=JSON.stringify(c.toJSON(["_shapeId","isGrid","_isDimLabel"]));

      const body={
        canvas_json:json,
        layout_data:{shapes:shapesWithCost,rates,canvas_image:imageDataUrl},
        shapes:shapesWithCost,
        totalCost:totCost,
        totalSqft:totSqft,
      };
      const res=await fetch(`/api/quotes/${quoteId}/drawing`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      if(!res.ok){const j=await res.json().catch(()=>({}));throw new Error(j.error??`Server error ${res.status}`);}
      showPopup(true,`Drawing saved! ${totSqft.toFixed(2)} sqft · $${totCost.toFixed(2)} applied to quote.`);
      onApplied?.(totCost,totSqft);
    }catch(err:any){
      showPopup(false,err.message??"Save failed — please try again.");
    }finally{setSaving(false);}
  }

  // ── Styles ────────────────────────────────────────────────────────
  const S = {
    panel:{background:"#0d1421",borderRight:"1px solid #1a2438",overflowY:"auto" as const,padding:"0"},
    sec:{padding:"10px 12px",borderBottom:"1px solid #1a2438"},
    title:{fontSize:10,fontWeight:700,color:"#4b6080",letterSpacing:"0.07em",textTransform:"uppercase" as const,marginBottom:6},
    tBtn:(active:boolean)=>({display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:active?600:400,background:active?"rgba(212,175,55,0.1)":"transparent",color:active?"#D4AF37":"#6b7280"} as React.CSSProperties),
    shapeBtn:(col:string)=>({width:"100%",padding:"5px 9px",marginBottom:3,borderRadius:5,border:`1px solid ${col}30`,background:"transparent",color:col,cursor:"pointer",fontSize:11,textAlign:"left" as const}),
    inp:{width:"100%",background:"#060d18",border:"1px solid #1a2438",borderRadius:5,padding:"4px 8px",color:"#e2e8f0",fontSize:12} as React.CSSProperties,
    row:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5} as React.CSSProperties,
    lbl:{fontSize:11,color:"#4b6080"} as React.CSSProperties,
    val:{fontSize:11,color:"#e2e8f0",fontWeight:500} as React.CSSProperties,
  };

  return (
    <div style={{position:"relative"}}>

    {/* ── POPUP ── */}
    {popup&&(
      <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
        <div style={{pointerEvents:"auto",background:popup.ok?"#0d2818":"#2a0d0d",border:`2px solid ${popup.ok?"#22c55e":"#ef4444"}`,borderRadius:16,padding:"28px 36px",minWidth:320,maxWidth:480,boxShadow:`0 0 60px ${popup.ok?"rgba(34,197,94,0.3)":"rgba(239,68,68,0.3)"}`,textAlign:"center",animation:"fadeInScale 0.2s ease"}}>
          <div style={{fontSize:44,lineHeight:1,marginBottom:14}}>{popup.ok?"✅":"❌"}</div>
          <div style={{fontSize:17,fontWeight:700,color:popup.ok?"#22c55e":"#ef4444",marginBottom:8}}>{popup.ok?"Drawing Saved":"Save Failed"}</div>
          <div style={{fontSize:13,color:popup.ok?"#86efac":"#fca5a5",lineHeight:1.5}}>{popup.msg}</div>
          <button onClick={()=>setPopup(null)} style={{marginTop:18,padding:"6px 20px",borderRadius:8,border:`1px solid ${popup.ok?"#22c55e":"#ef4444"}`,background:"transparent",color:popup.ok?"#22c55e":"#ef4444",fontSize:12,cursor:"pointer",fontWeight:600}}>Dismiss</button>
        </div>
      </div>
    )}
    <style>{`@keyframes fadeInScale{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}`}</style>

    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
    <div style={{display:"flex",height:580,borderRadius:10,overflow:"hidden",border:"1px solid #1a2438",minWidth:680}}>

      {/* ── LEFT PANEL ── */}
      <div style={{...S.panel,width:200,minWidth:200}}>
        {/* Tool */}
        <div style={{...S.sec,paddingTop:10}}>
          <div style={S.title}>Tool</div>
          <button style={S.tBtn(mode==="select")} onClick={()=>setMode("select")}>↖ Select / Move</button>
          <button style={S.tBtn(mode==="draw")} onClick={()=>setMode("draw")}>✏ Draw Shape</button>
          {drawing&&(
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

        {/* Add Shape — built-ins */}
        <div style={S.sec}>
          <div style={S.title}>Add Shape</div>
          {([["Straight Top",addRect,"#D4AF37"],["Island",addIsland,"#60a5fa"],["L-Shape",addLShape,"#a855f7"],["U-Shape",addUShape,"#fbbf24"],["Sink Cutout",addSink,"#f97316"],["Seam Line",addSeam,"#eab308"]] as [string,(()=>void),string][]).map(([lbl,fn,col])=>(
            <button key={lbl} style={S.shapeBtn(col)} disabled={!ready} onClick={fn}>+ {lbl}</button>
          ))}
        </div>

        {/* Custom shape templates from DB */}
        {dbShapes.length > 0 && (
          <div style={S.sec}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={S.title}>My Shapes ({dbShapes.length})</div>
            </div>
            {/* Search */}
            <div style={{position:"relative",marginBottom:6}}>
              <span style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",fontSize:11,color:"#475569",pointerEvents:"none"}}>🔍</span>
              <input
                type="text"
                placeholder="Search shapes…"
                value={shapeSearch}
                onChange={e=>setShapeSearch(e.target.value)}
                style={{width:"100%",background:"#020617",border:"1px solid #1e293b",borderRadius:5,
                  padding:"5px 24px 5px 24px",color:"#e2e8f0",fontSize:11,boxSizing:"border-box" as const}}
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
                <div style={{fontSize:11,color:"#475569",textAlign:"center",padding:"10px 0"}}>No shapes match &ldquo;{shapeSearch}&rdquo;</div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                  {filtered.map(tpl=>(
                    <button key={tpl.id} disabled={!ready} onClick={()=>addTemplateShape(tpl)}
                      title={`Add ${tpl.label}`}
                      style={{
                        background:"#060d18",border:`1px solid ${tpl.stroke}40`,
                        borderRadius:6,padding:"4px 3px",cursor:"pointer",
                        display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                        transition:"border-color .15s",
                      }}
                      onMouseEnter={e=>(e.currentTarget.style.borderColor=tpl.stroke)}
                      onMouseLeave={e=>(e.currentTarget.style.borderColor=`${tpl.stroke}40`)}>
                      {tpl.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={tpl.image} alt={tpl.label}
                          style={{width:"100%",height:42,objectFit:"contain",filter:"brightness(0.85) saturate(0.7)"}}/>
                      ) : (
                        <div style={{width:"100%",height:42,background:`${tpl.stroke}18`,borderRadius:4,
                          display:"flex",alignItems:"center",justifyContent:"center",
                          fontSize:18,color:tpl.stroke}}>⬜</div>
                      )}
                      <span style={{fontSize:9,color:"#9ca3af",lineHeight:1.2,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",width:"100%"}}>
                        {tpl.label}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Add-on Rates */}
        <div style={S.sec}>
          <button style={{...S.tBtn(false),fontWeight:600}} onClick={()=>setRatesOpen(o=>!o)}>
            ⚙ Add-on Rates {ratesOpen?"▴":"▾"}
          </button>
          {ratesOpen&&(
            <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
              {([["$/ea corner","cornerEach"],["$/ea sink cutout","sinkEach"],["$/lf backsplash","backPerLf"]] as [string,keyof Rates][]).map(([lbl,k])=>(
                <div key={k}><div style={{fontSize:9,color:"#4b6080",marginBottom:1}}>{lbl}</div>
                  <input style={S.inp} type="number" value={rates[k]} onChange={e=>setRates(r=>({...r,[k]:Number(e.target.value)}))} /></div>
              ))}
            </div>
          )}
        </div>

        {/* Shapes List */}
        <div style={{...S.sec,flex:1}}>
          <div style={S.title}>Shapes ({Object.keys(metas).length})</div>
          {Object.values(metas).map(m=>{
            const cs = productColorStyle(m.productColor);
            return (
              <div key={m.id} onClick={()=>{setSelId(m.id);const obj=shapesRef.current[m.id];if(obj&&cRef.current){cRef.current.setActiveObject(obj);cRef.current.renderAll();}}}
                style={{padding:"5px 7px",borderRadius:4,marginBottom:3,cursor:"pointer",background:selId===m.id?"rgba(212,175,55,0.08)":"transparent",border:`1px solid ${selId===m.id?"#D4AF37":"transparent"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  {m.productColor&&<div style={{width:8,height:8,borderRadius:"50%",background:cs.stroke,flexShrink:0}}/>}
                  <div style={{fontSize:11,color:"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</div>
                </div>
                <div style={{fontSize:9,color:"#4b6080",marginTop:1}}>
                  {m.productName?<span style={{color:"#6b7280"}}>{m.productName} · </span>:null}
                  {(m.widthFt*12).toFixed(1)}" × {(m.heightFt*12).toFixed(1)}" · ${calcCost(m,rates).toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CANVAS ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:"#060d18",overflow:"hidden"}}>
        <div style={{padding:"6px 10px",background:"#0d1421",borderBottom:"1px solid #1a2438",display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:10,color:"#374151",flex:1}}>
            {mode==="draw"?"Click to add points • click near first point (or Close) to finish":"Click shape to select • drag to move • scroll to zoom"}
          </span>
          <button style={{padding:"4px 9px",borderRadius:5,border:"none",background:"#1f2937",color:"#f87171",fontSize:11,cursor:"pointer"}} onClick={deleteSelected} disabled={!selId}>Delete</button>
          <button onClick={handleApplyToQuote} disabled={!ready||saving} style={{padding:"5px 14px",borderRadius:6,border:"none",fontSize:12,fontWeight:700,cursor:"pointer",
            background:saving?"#374151":"linear-gradient(135deg,#D4AF37,#A88B20)",color:saving?"#fff":"#000",opacity:saving?0.7:1}}>
            {saving?"Saving…":`💾 Save to Quote ($${totCost.toFixed(2)})`}
          </button>
        </div>
        <div style={{flex:1,overflow:"auto",padding:6,display:"flex",alignItems:"flex-start"}}>
          <canvas ref={canvasRef} style={{cursor:mode==="draw"?"crosshair":"default",borderRadius:6}}/>
        </div>
        <div style={{padding:"6px 12px",background:"#0d1421",borderTop:"1px solid #1a2438",display:"flex",gap:20}}>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Total Area: </span><span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>{totSqft.toFixed(2)} sqft</span></div>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Shapes: </span><span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{Object.keys(metas).length}</span></div>
          <div><span style={{fontSize:10,color:"#4b6080"}}>Est. Total: </span><span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>${totCost.toFixed(2)}</span></div>
        </div>
      </div>

      {/* ── RIGHT PANEL: PROPERTIES ── */}
      <div style={{...S.panel,width:230,minWidth:230,borderLeft:"1px solid #1a2438",borderRight:"none"}}>
        <div style={{...S.sec,padding:"8px 12px"}}>
          <div style={{fontSize:11,fontWeight:700,color:selMeta?"#e2e8f0":"#374151"}}>
            {selMeta?"Shape Properties":"Select a shape"}
          </div>
        </div>

        {selMeta?(
          <>
            {/* Label & Type */}
            <div style={S.sec}>
              <div style={S.title}>Label & Type</div>
              <input style={{...S.inp,marginBottom:6}} value={selMeta.label} onChange={e=>updMeta(selMeta.id,{label:e.target.value})}/>
              <select style={S.inp} value={selMeta.kind} onChange={e=>updMeta(selMeta.id,{kind:e.target.value as ShapeKind})}>
                <option value="countertop">Countertop</option>
                <option value="island">Island</option>
                <option value="backsplash">Backsplash</option>
                <option value="cutout">Cutout</option>
              </select>
            </div>

            {/* Product / Colour */}
            <div style={S.sec}>
              <div style={S.title}>Product / Colour</div>
              <select style={S.inp} value={selMeta.productId??""} onChange={e=>handleProductChange(selMeta.id,e.target.value)}>
                <option value="">— Select product —</option>
                {products.map(p=>(
                  <option key={p.id} value={p.id}>
                    {p.product_name}{p.color?` (${p.color})`:""}
                  </option>
                ))}
              </select>
              {selMeta.productId&&(
                <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:productColorStyle(selMeta.productColor).stroke,flexShrink:0}}/>
                  <span style={{fontSize:10,color:"#9ca3af"}}>{selMeta.productColor||"—"}</span>
                  <span style={{fontSize:10,color:"#D4AF37",marginLeft:"auto"}}>${(selMeta.productCostPerSqft??0).toFixed(2)}/sqft</span>
                </div>
              )}
              {!selMeta.productId&&(
                <div style={{marginTop:4,fontSize:10,color:"#6b7280"}}>Assign a product to price this shape</div>
              )}
            </div>

            {/* Dimensions */}
            <div style={S.sec}>
              <div style={S.title}>Dimensions</div>
              <div style={{display:"flex",gap:6,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#4b6080",marginBottom:2}}>Width (in)</div>
                  <input type="number" style={S.inp} step="0.125" min="0.125"
                    value={Number((selMeta.widthFt*12).toFixed(3))}
                    onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)handleDimChange(selMeta.id,"width",v/12);}}/>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:9,color:"#4b6080",marginBottom:2}}>Height (in)</div>
                  <input type="number" style={S.inp} step="0.125" min="0.125"
                    value={Number((selMeta.heightFt*12).toFixed(3))}
                    onChange={e=>{const v=parseFloat(e.target.value);if(!isNaN(v)&&v>0)handleDimChange(selMeta.id,"height",v/12);}}/>
                </div>
              </div>
              <div style={S.row}><span style={S.lbl}>Area</span><span style={{...S.val,color:"#D4AF37"}}>{selMeta.sqft.toFixed(4)} sqft</span></div>
              <div style={S.row}><span style={S.lbl}>Perimeter</span><span style={S.val}>{(selMeta.perimLf*12).toFixed(2)}"</span></div>
              <div style={S.row}><span style={S.lbl}>W</span><span style={S.val}>{fmtInches(selMeta.widthFt*PPF)}</span></div>
              <div style={S.row}><span style={S.lbl}>H</span><span style={S.val}>{fmtInches(selMeta.heightFt*PPF)}</span></div>
            </div>

            {/* Add-ons */}
            <div style={S.sec}>
              <div style={S.title}>Add-ons</div>
              <label style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,cursor:"pointer"}}>
                <input type="checkbox" checked={selMeta.hasBack} onChange={e=>updMeta(selMeta.id,{hasBack:e.target.checked})}/>
                <span style={{fontSize:11,color:"#6b7280"}}>Backsplash</span>
              </label>
              {selMeta.hasBack&&(
                <div style={{marginLeft:16,marginBottom:4}}>
                  <div style={{fontSize:9,color:"#4b6080",marginBottom:2}}>Backsplash (in)</div>
                  <input type="number" step="0.5" min="0" style={{...S.inp,width:70}} value={Number((selMeta.backLf*12).toFixed(2))} onChange={e=>updMeta(selMeta.id,{backLf:Number(e.target.value)/12})}/>
                </div>
              )}
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

            {/* Cost Breakdown */}
            <div style={S.sec}>
              <div style={S.title}>Cost Breakdown</div>
              {(()=>{
                const mat=selMeta.kind!=="cutout"?selMeta.sqft*(selMeta.productCostPerSqft??0):0;
                const cl=selMeta.corners*rates.cornerEach;
                const cut=selMeta.cutouts*rates.sinkEach;
                const bl=selMeta.hasBack?selMeta.backLf*rates.backPerLf:0;
                const total=mat+cl+cut+bl;
                return(<>
                  {mat>0&&<div style={S.row}><span style={S.lbl}>Material ({selMeta.productName||"no product"})</span><span style={S.val}>${mat.toFixed(2)}</span></div>}
                  {mat===0&&selMeta.kind!=="cutout"&&<div style={{fontSize:10,color:"#6b7280",marginBottom:4}}>Select a product to calculate material cost</div>}
                  {cl>0&&<div style={S.row}><span style={S.lbl}>Corners ×{selMeta.corners}</span><span style={S.val}>${cl.toFixed(2)}</span></div>}
                  {cut>0&&<div style={S.row}><span style={S.lbl}>Sink cutouts ×{selMeta.cutouts}</span><span style={S.val}>${cut.toFixed(2)}</span></div>}
                  {bl>0&&<div style={S.row}><span style={S.lbl}>Backsplash {(selMeta.backLf*12).toFixed(1)}"</span><span style={S.val}>${bl.toFixed(2)}</span></div>}
                  <div style={{...S.row,borderTop:"1px solid #1a2438",paddingTop:6,marginTop:4}}>
                    <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>Shape Total</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#D4AF37"}}>${total.toFixed(2)}</span>
                  </div>
                </>);
              })()}
            </div>
          </>
        ):(
          <div style={{padding:12,color:"#374151",fontSize:11,lineHeight:1.8}}>
            <p>• Add a shape from the left panel</p>
            <p>• Use Draw Shape to sketch a custom countertop</p>
            <p>• Select a shape to assign a <b style={{color:"#D4AF37"}}>Product/Colour</b></p>
            <p>• Edit <b style={{color:"#D4AF37"}}>dimensions</b> directly (W × H)</p>
            <p>• Click <b style={{color:"#D4AF37"}}>Save to Quote</b> to apply</p>
          </div>
        )}
      </div>

    </div>
    </div>
    </div>
  );
}
