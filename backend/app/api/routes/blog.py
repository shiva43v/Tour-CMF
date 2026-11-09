import json
from datetime import datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.db.session import get_db
from app.models.blog import BlogPost
from app.models.user import User, UserRole

router=APIRouter(prefix="/blog",tags=["blog"])
Db=Annotated[Session,Depends(get_db)]
Writer=Annotated[User,Depends(require_roles(UserRole.ADMIN,UserRole.EDITOR))]
class PostInput(BaseModel):
 title:str=Field(min_length=3,max_length=255); slug:str=Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
 body:str=Field(min_length=20); cover_image_url:str|None=None; category:str|None=None
 seo_title:str|None=None; seo_description:str|None=None; related_package_slugs:list[str]=[]; publish:bool=False
def present(p): return {"id":p.id,"title":p.title,"slug":p.slug,"body":p.body,"cover_image_url":p.cover_image_url,"category":p.category,"seo_title":p.seo_title,"seo_description":p.seo_description,"related_package_slugs":json.loads(p.related_package_slugs),"status":p.status,"published_at":p.published_at}
@router.get("")
def public_list(db:Db): return [present(p) for p in db.scalars(select(BlogPost).where(BlogPost.status=="published").order_by(BlogPost.published_at.desc())).all()]
@router.get("/admin")
def admin_list(_:Writer,db:Db): return [present(p) for p in db.scalars(select(BlogPost).order_by(BlogPost.updated_at.desc())).all()]
@router.get("/{slug}")
def public_post(slug:str,db:Db):
 p=db.scalar(select(BlogPost).where(BlogPost.slug==slug,BlogPost.status=="published"))
 if not p: raise HTTPException(404,"Post not found")
 return present(p)
@router.post("/admin")
def create(data:PostInput,user:Writer,db:Db):
 if db.scalar(select(BlogPost.id).where(BlogPost.slug==data.slug)): raise HTTPException(409,"Slug is already in use")
 p=BlogPost(**data.model_dump(exclude={"related_package_slugs","publish"}),related_package_slugs=json.dumps(data.related_package_slugs),author_id=user.id,status="published" if data.publish else "draft",published_at=datetime.now(timezone.utc) if data.publish else None); db.add(p); db.commit(); db.refresh(p); return present(p)
@router.put("/admin/{post_id}")
def update(post_id:int,data:PostInput,user:Writer,db:Db):
 p=db.get(BlogPost,post_id)
 if not p: raise HTTPException(404,"Post not found")
 for k,v in data.model_dump(exclude={"related_package_slugs","publish"}).items(): setattr(p,k,v)
 p.related_package_slugs=json.dumps(data.related_package_slugs); p.status="published" if data.publish else "draft"; p.published_at=p.published_at or (datetime.now(timezone.utc) if data.publish else None); db.commit(); return present(p)
