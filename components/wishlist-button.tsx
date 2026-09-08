"use client";
import { Heart } from "lucide-react";
import { useEffect,useState } from "react";
export function WishlistButton({productId}:{productId:string}) {
  const [active,setActive]=useState(false);
  useEffect(()=>{setActive(JSON.parse(localStorage.getItem("thritemist-wishlist")||"[]").includes(productId))},[productId]);
  const toggle=()=>{const old=JSON.parse(localStorage.getItem("thritemist-wishlist")||"[]");const next=old.includes(productId)?old.filter((x:string)=>x!==productId):[...old,productId];localStorage.setItem("thritemist-wishlist",JSON.stringify(next));setActive(!active)};
  return <button onClick={toggle} className="flex h-12 w-12 items-center justify-center border border-black/15" aria-label="Wishlist"><Heart size={19} fill={active?"currentColor":"none"}/></button>
}