export type BlogPost = { id: number; title: string; slug: string; body: string; cover_image_url?: string | null; category?: string | null; seo_title?: string | null; seo_description?: string | null; related_package_slugs: string[]; published_at?: string | null };
const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export async function getPosts(): Promise<BlogPost[]> { try { const r=await fetch(`${apiUrl}/api/v1/blog`,{cache:"no-store"}); return r.ok?await r.json():[]; } catch { return []; } }
export async function getPost(slug:string): Promise<BlogPost|null> { try { const r=await fetch(`${apiUrl}/api/v1/blog/${slug}`,{cache:"no-store"}); return r.ok?await r.json():null; } catch { return null; } }
