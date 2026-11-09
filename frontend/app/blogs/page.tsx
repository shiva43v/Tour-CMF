import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPosts } from "@/lib/blog";
export const dynamic="force-dynamic";
export default async function Blogs(){
 const posts=await getPosts();
 return <><div style={{background:"var(--ink)",color:"white",paddingBottom:"3rem"}}><SiteHeader/><div style={{maxWidth:1100,margin:"0 auto",padding:"3rem 2rem"}}><p className="eyebrow" style={{color:"#f4a261"}}>Journal</p><h1 style={{fontFamily:"var(--font-serif)",fontSize:"clamp(2.8rem,5vw,4.5rem)",fontWeight:500,margin:0}}>Travel stories, slowly told.</h1></div></div><main style={{maxWidth:1100,margin:"0 auto",padding:"3rem 2rem 6rem"}}>{posts.length===0?<p>No published stories yet. Please return soon.</p>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:"1.5rem"}}>{posts.map(p=><article key={p.id} style={{background:"white",border:"1px solid #ede8de",borderRadius:16,overflow:"hidden"}}>{p.cover_image_url&&<img src={p.cover_image_url} alt="" style={{width:"100%",height:190,objectFit:"cover"}}/>}<div style={{padding:"1.4rem"}}><small style={{color:"var(--coral)",fontWeight:700}}>{p.category??"Travel journal"}</small><h2 style={{fontFamily:"var(--font-serif)",fontSize:"1.7rem",margin:".45rem 0 1rem"}}>{p.title}</h2><p style={{color:"#64748b"}}>{p.seo_description??`${p.body.slice(0,140)}...`}</p><Link href={`/blogs/${p.slug}`} className="cta" style={{display:"inline-block",marginTop:".5rem"}}>Read story →</Link></div></article>)}</div>}</main><SiteFooter/></>;
}
