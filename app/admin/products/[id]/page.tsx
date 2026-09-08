import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminProductForm from "@/components/admin-product-form";

export default async function EditProductPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params; const db=supabaseAdmin();
  const {data:product,error}=await db.from("products").select("*, product_images(id,url,sort_order), drops(name,drop_number)").eq("id",id).single();
  if(error||!product)notFound();
  return <AdminProductForm mode="edit" product={{
    id:product.id,name:product.name,price:product.price,brand:product.brand||"",category:product.category,source:product.source || "vintage",size:product.size||"",colour:product.colour||"",condition:product.condition,material:product.material||"",description:product.description||"",measurements:product.measurements?JSON.stringify(product.measurements,null,2):"",tags:Array.isArray(product.tags)?product.tags.join(", "):"",status:product.status,quantity:product.quantity,costPrice:product.cost_price,soldPrice:product.sold_price,soldVia:product.sold_via,soldAt:product.sold_at,internalNotes:product.internal_notes,sku:product.sku,dropName:product.drops?`DROP ${String(product.drops.drop_number).padStart(2,"0")} — ${product.drops.name}`:null,images:product.product_images||[]
  }}/>;
}
