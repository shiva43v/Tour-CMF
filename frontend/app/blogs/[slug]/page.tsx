import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getPost } from "@/lib/blog";
export const dynamic="force-dynamic";
export default async function BlogPostPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const post=await getPost(slug); if(!post)notFound();
 return <><div style={{background:"var(--ink)",color:"white"}}><SiteHeader/><main style={{maxWidth:850,margin:"0 auto",padding:"4rem 2rem"}}><p className="eyebrow" style={{color:"#f4a261"}}>{post.category??"Travel journal"}</p><h1 style={{fontFamily:"var(--font-serif)",fontSize:"clamp(2.5rem,5vw,4.5rem)",fontWeight:500}}>{post.title}</h1></main></div><main style={{maxWidth:850,margin:"0 auto",padding:"3rem 2rem 6rem"}}>{post.cover_image_url&&<img src={post.cover_image_url} alt="" style={{width:"100%",maxHeight:450,objectFit:"cover",borderRadius:18,marginBottom:"2rem"}}/>}<div style={{fontSize:"1.1rem",lineHeight:1.9,color:"#334155",whiteSpace:"pre-line"}}>{post.body}</div>{post.related_package_slugs.length>0&&<section style={{marginTop:"3rem",paddingTop:"2rem",borderTop:"1px solid #ede8de"}}><p className="eyebrow">Related journeys</p>{post.related_package_slugs.map(x=><Link key={x} href={`/packages/${x}`} className="cta" style={{display:"inline-block",marginRight:".75rem"}}>Explore this journey →</Link>)}</section>}</main><SiteFooter/></>;
}
