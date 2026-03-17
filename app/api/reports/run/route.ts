import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  try {
    switch (code) {

      /* ── CUSTOMER REPORTS ─────────────────────────────── */
      case "cust_top": {
        const { data } = await supabaseAdmin
          .from("customers")
          .select("customer_id, name, phone, email, customer_type, status, credit_limit, overdue_balance, created_at")
          .order("name").limit(200);
        return NextResponse.json({ columns: ["Customer ID","Name","Type","Phone","Email","Status","Credit Limit","Overdue"], rows: (data??[]).map(r=>[r.customer_id,r.name,r.customer_type??"-",r.phone??"-",r.email??"-",r.status,`$${(r.credit_limit??0).toFixed(2)}`,`$${(r.overdue_balance??0).toFixed(2)}`]) });
      }

      case "cust_profitability": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("customers(name, customer_id), total_amount, status")
          .not("customer_id","is",null).order("total_amount",{ascending:false}).limit(200);
        const map: Record<string,{name:string,id:string,total:number,count:number}> = {};
        (data??[]).forEach((q:any) => {
          const k = q.customers?.name ?? "Unknown";
          if (!map[k]) map[k] = { name:k, id:q.customers?.customer_id??"-", total:0, count:0 };
          map[k].total += q.total_amount ?? 0;
          map[k].count += 1;
        });
        const rows = Object.values(map).sort((a,b)=>b.total-a.total).map(r=>[r.id, r.name, r.count.toString(), `$${r.total.toFixed(2)}`]);
        return NextResponse.json({ columns:["Customer ID","Name","# Quotes","Total Value"], rows });
      }

      case "cust_sales_summary": {
        const { data } = await supabaseAdmin
          .from("sales_orders")
          .select("order_number, status, deposit_amount, created_at, customers(name)")
          .order("created_at",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["Order #","Customer","Status","Deposit","Date"], rows:(data??[]).map((r:any)=>[r.order_number,(r.customers as any)?.name??"-",r.status,`$${(r.deposit_amount??0).toFixed(2)}`,new Date(r.created_at).toLocaleDateString()]) });
      }

      case "cust_statements": {
        const { data } = await supabaseAdmin
          .from("customers")
          .select("customer_id, name, credit_limit, overdue_balance, status, is_locked")
          .order("name").limit(200);
        return NextResponse.json({ columns:["Customer ID","Name","Credit Limit","Overdue Balance","Status","Locked"], rows:(data??[]).map(r=>[r.customer_id,r.name,`$${(r.credit_limit??0).toFixed(2)}`,`$${(r.overdue_balance??0).toFixed(2)}`,r.status,r.is_locked?"Yes":"No"]) });
      }

      /* ── INVENTORY REPORTS ────────────────────────────── */
      case "inv_valuation": {
        const { data } = await supabaseAdmin
          .from("inventory")
          .select("inventory_id, lot_number, bundle_number, quantity, sqft, status, products(product_name, base_cost, color)")
          .order("inventory_id").limit(500);
        return NextResponse.json({ columns:["Inv ID","Product","Color","Lot","Bundle","Qty","Sqft","Status","Est. Value"], rows:(data??[]).map((r:any)=>[r.inventory_id,(r.products as any)?.product_name??"-",(r.products as any)?.color??"-",r.lot_number??"-",r.bundle_number??"-",r.quantity??0,(r.sqft??0).toFixed(1),r.status,`$${((r.sqft??0)*((r.products as any)?.base_cost??0)).toFixed(2)}`]) });
      }

      case "inv_aging": {
        const { data } = await supabaseAdmin
          .from("inventory")
          .select("inventory_id, status, sqft, created_at, products(product_name)")
          .order("created_at").limit(500);
        const now = Date.now();
        return NextResponse.json({ columns:["Inv ID","Product","Sqft","Status","Days in Stock"], rows:(data??[]).map((r:any)=>[r.inventory_id,(r.products as any)?.product_name??"-",(r.sqft??0).toFixed(1),r.status,Math.floor((now-new Date(r.created_at).getTime())/86400000).toString()]) });
      }

      case "inv_fast_moving": {
        const { data } = await supabaseAdmin
          .from("products")
          .select("product_id, product_name, color, sku, unit_type, base_cost, reorder_level, safety_stock")
          .order("product_name").limit(200);
        return NextResponse.json({ columns:["Product ID","Name","Color","SKU","Unit","Base Cost","Reorder Level","Safety Stock"], rows:(data??[]).map(r=>[r.product_id,r.product_name,r.color??"-",r.sku??"-",r.unit_type??"-",`$${(r.base_cost??0).toFixed(2)}`,r.reorder_level??"-",r.safety_stock??"-"]) });
      }

      case "inv_reorder": {
        const { data } = await supabaseAdmin
          .from("inventory")
          .select("inventory_id, quantity, sqft, status, products(product_name, reorder_level, safety_stock)")
          .eq("status","available").order("quantity").limit(200);
        return NextResponse.json({ columns:["Inv ID","Product","Qty","Sqft","Reorder Level","Action"], rows:(data??[]).map((r:any)=>{const rl=(r.products as any)?.reorder_level??0; return [r.inventory_id,(r.products as any)?.product_name??"-",r.quantity??0,(r.sqft??0).toFixed(1),rl,(r.quantity??0)<=rl?"⚠ Reorder Now":"OK"]}) });
      }

      /* ── ACCOUNTING REPORTS ───────────────────────────── */
      case "acc_receivable": {
        const { data } = await supabaseAdmin
          .from("customers")
          .select("customer_id, name, overdue_balance, credit_limit, is_locked, status")
          .gt("overdue_balance",0).order("overdue_balance",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["Customer ID","Name","Overdue Balance","Credit Limit","Locked"], rows:(data??[]).map(r=>[r.customer_id,r.name,`$${(r.overdue_balance??0).toFixed(2)}`,`$${(r.credit_limit??0).toFixed(2)}`,r.is_locked?"Yes":"No"]) });
      }

      case "acc_payable": {
        const { data } = await supabaseAdmin
          .from("purchase_orders")
          .select("po_number, supplier_name, status, order_type, expected_date, created_at")
          .in("status",["draft","sent","confirmed"]).order("created_at",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["PO #","Supplier","Status","Type","Expected","Created"], rows:(data??[]).map(r=>[r.po_number,r.supplier_name,r.status,r.order_type??"-",r.expected_date??"-",new Date(r.created_at).toLocaleDateString()]) });
      }

      case "acc_trial_balance": {
        const [qRes, soRes, custRes] = await Promise.all([
          supabaseAdmin.from("quotes").select("total_amount,status"),
          supabaseAdmin.from("sales_orders").select("deposit_amount,status"),
          supabaseAdmin.from("customers").select("overdue_balance"),
        ]);
        const quoteTotal = (qRes.data??[]).reduce((s:number,r:any)=>s+(r.total_amount??0),0);
        const depositTotal = (soRes.data??[]).reduce((s:number,r:any)=>s+(r.deposit_amount??0),0);
        const arTotal = (custRes.data??[]).reduce((s:number,r:any)=>s+(r.overdue_balance??0),0);
        return NextResponse.json({ columns:["Account","Debit","Credit"], rows:[["Quote Revenue","",`$${quoteTotal.toFixed(2)}`],["Deposits Received","",`$${depositTotal.toFixed(2)}`],["Accounts Receivable",`$${arTotal.toFixed(2)}`,""],["Net Position","",`$${(quoteTotal+depositTotal-arTotal).toFixed(2)}`]] });
      }

      case "acc_sales_tax": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("quote_id, total_amount, quote_date, status, customers(name)")
          .eq("status","approved").order("quote_date",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["Quote #","Customer","Date","Amount","Tax (8.5%)"], rows:(data??[]).map((r:any)=>[r.quote_id,(r.customers as any)?.name??"-",r.quote_date,`$${(r.total_amount??0).toFixed(2)}`,`$${((r.total_amount??0)*0.085).toFixed(2)}`]) });
      }

      /* ── FINANCIAL REPORTS ────────────────────────────── */
      case "fin_balance_sheet": {
        const [invRes, custRes, soRes] = await Promise.all([
          supabaseAdmin.from("inventory").select("sqft, products(base_cost)"),
          supabaseAdmin.from("customers").select("overdue_balance"),
          supabaseAdmin.from("sales_orders").select("deposit_amount"),
        ]);
        const invValue = (invRes.data??[]).reduce((s:number,r:any)=>s+((r.sqft??0)*((r.products as any)?.base_cost??0)),0);
        const ar = (custRes.data??[]).reduce((s:number,r:any)=>s+(r.overdue_balance??0),0);
        const deposits = (soRes.data??[]).reduce((s:number,r:any)=>s+(r.deposit_amount??0),0);
        return NextResponse.json({ columns:["Item","Amount"], rows:[["ASSETS",""],["  Inventory Value",`$${invValue.toFixed(2)}`],["  Accounts Receivable",`$${ar.toFixed(2)}`],["  Total Assets",`$${(invValue+ar).toFixed(2)}`],["",""],["LIABILITIES",""],["  Customer Deposits",`$${deposits.toFixed(2)}`],["  Total Liabilities",`$${deposits.toFixed(2)}`],["",""],["NET EQUITY",`$${(invValue+ar-deposits).toFixed(2)}`]] });
      }

      case "fin_income_stmt": {
        const [qRes, jobRes] = await Promise.all([
          supabaseAdmin.from("quotes").select("total_amount,status").eq("status","approved"),
          supabaseAdmin.from("jobs").select("deposit_amount"),
        ]);
        const revenue = (qRes.data??[]).reduce((s:number,r:any)=>s+(r.total_amount??0),0);
        const deposits = (jobRes.data??[]).reduce((s:number,r:any)=>s+(r.deposit_amount??0),0);
        return NextResponse.json({ columns:["Item","Amount"], rows:[["REVENUE",""],["  Approved Quotes",`$${revenue.toFixed(2)}`],["  Job Deposits",`$${deposits.toFixed(2)}`],["  Gross Revenue",`$${(revenue+deposits).toFixed(2)}`],["",""],["  Est. COGS (60%)",`$${((revenue+deposits)*0.6).toFixed(2)}`],["  Gross Profit",`$${((revenue+deposits)*0.4).toFixed(2)}`]] });
      }

      case "fin_cash_flow": {
        const [soRes, jobRes] = await Promise.all([
          supabaseAdmin.from("sales_orders").select("deposit_amount, created_at").order("created_at",{ascending:false}).limit(50),
          supabaseAdmin.from("jobs").select("deposit_amount, created_at").order("created_at",{ascending:false}).limit(50),
        ]);
        const rows: string[][] = [];
        (soRes.data??[]).forEach((r:any) => rows.push([new Date(r.created_at).toLocaleDateString(),"Sales Order Deposit",`+$${(r.deposit_amount??0).toFixed(2)}`]));
        (jobRes.data??[]).forEach((r:any) => rows.push([new Date(r.created_at).toLocaleDateString(),"Job Deposit",`+$${(r.deposit_amount??0).toFixed(2)}`]));
        rows.sort((a,b)=>new Date(b[0]).getTime()-new Date(a[0]).getTime());
        return NextResponse.json({ columns:["Date","Description","Amount"], rows });
      }

      /* ── SALES REPORTS ────────────────────────────────── */
      case "sales_by_rep": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("total_amount, status, users(full_name, email)")
          .not("sales_rep","is",null).limit(500);
        const map: Record<string,{name:string,total:number,count:number}> = {};
        (data??[]).forEach((q:any) => {
          const k = (q.users as any)?.full_name ?? (q.users as any)?.email ?? "Unassigned";
          if (!map[k]) map[k]={name:k,total:0,count:0};
          map[k].total+=q.total_amount??0; map[k].count+=1;
        });
        const rows = Object.values(map).sort((a,b)=>b.total-a.total).map(r=>[r.name,r.count.toString(),`$${r.total.toFixed(2)}`]);
        return NextResponse.json({ columns:["Sales Rep","# Quotes","Total Value"], rows });
      }

      case "sales_summary": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("quote_id, quote_date, status, total_amount, customers(name)")
          .order("quote_date",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["Quote #","Customer","Date","Status","Amount"], rows:(data??[]).map((r:any)=>[r.quote_id,(r.customers as any)?.name??"-",r.quote_date,r.status,`$${(r.total_amount??0).toFixed(2)}`]) });
      }

      case "sales_profitability": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("quote_id, total_amount, status, customers(name)")
          .order("total_amount",{ascending:false}).limit(200);
        return NextResponse.json({ columns:["Quote #","Customer","Revenue","Est. Cost (60%)","Est. Profit (40%)"], rows:(data??[]).map((r:any)=>[r.quote_id,(r.customers as any)?.name??"-",`$${(r.total_amount??0).toFixed(2)}`,`$${((r.total_amount??0)*0.6).toFixed(2)}`,`$${((r.total_amount??0)*0.4).toFixed(2)}`]) });
      }

      case "sales_commission": {
        const { data } = await supabaseAdmin
          .from("quotes")
          .select("total_amount, status, users(full_name, email)")
          .eq("status","approved").limit(500);
        const map: Record<string,{name:string,total:number}> = {};
        (data??[]).forEach((q:any) => {
          const k=(q.users as any)?.full_name??(q.users as any)?.email??"Unassigned";
          if(!map[k]) map[k]={name:k,total:0};
          map[k].total+=q.total_amount??0;
        });
        const rows=Object.values(map).sort((a,b)=>b.total-a.total).map(r=>[r.name,`$${r.total.toFixed(2)}`,`$${(r.total*0.05).toFixed(2)}`]);
        return NextResponse.json({ columns:["Sales Rep","Approved Revenue","Commission (5%)"], rows });
      }

      default:
        return NextResponse.json({ columns:["Info"], rows:[["Report not implemented yet"]] });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
