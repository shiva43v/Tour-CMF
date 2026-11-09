import json,secrets
from pathlib import Path
from typing import Annotated
from fastapi import APIRouter,Depends,HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel,Field
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session
from app.api.deps import require_roles
from app.db.session import get_db
from app.models.quote import Quote
from app.models.user import User,UserRole
router=APIRouter(prefix="/quotes",tags=["quotes"]); Db=Annotated[Session,Depends(get_db)]; Consultant=Annotated[User,Depends(require_roles(UserRole.ADMIN,UserRole.CONSULTANT))]
class QuoteInput(BaseModel):
 package_id:int|None=None; enquiry_id:int|None=None; traveller_name:str=Field(min_length=2); title:str=Field(min_length=3); amount:float=Field(gt=0); inclusions:list[str]=[]; notes:str|None=None
def view(q): return {"id":q.id,"token":q.public_token,"traveller_name":q.traveller_name,"title":q.title,"amount":float(q.amount),"currency":q.currency,"inclusions":json.loads(q.inclusions),"notes":q.notes,"pdf_url":f"/api/v1/quotes/{q.public_token}/pdf"}
def make_pdf(q):
 d=Path("storage/quotes"); d.mkdir(parents=True,exist_ok=True); path=d/f"tour-cmf-quote-{q.public_token}.pdf"; c=canvas.Canvas(str(path),pagesize=A4); w,h=A4
 c.setFillColor(HexColor("#0b3d35")); c.rect(0,h-115,w,115,fill=1,stroke=0); c.setFillColor(HexColor("#ffffff")); c.setFont("Helvetica-Bold",25); c.drawString(48,h-62,"TOUR CMF"); c.setFont("Helvetica",11); c.drawString(48,h-84,"Private journey quotation")
 c.setFillColor(HexColor("#1f2937")); c.setFont("Helvetica-Bold",18); c.drawString(48,h-158,q.title); c.setFont("Helvetica",11); c.drawString(48,h-181,f"Prepared for: {q.traveller_name}"); c.drawString(48,h-201,f"Quote reference: {q.public_token[:8].upper()}")
 c.setFillColor(HexColor("#0b3d35")); c.setFont("Helvetica-Bold",22); c.drawRightString(w-48,h-158,f"INR {float(q.amount):,.0f}"); c.setFont("Helvetica",10); c.drawRightString(w-48,h-177,"Total for the proposed journey")
 y=h-250; c.setFillColor(HexColor("#1f2937")); c.setFont("Helvetica-Bold",13); c.drawString(48,y,"Your journey includes"); c.setFont("Helvetica",11); y-=25
 for item in json.loads(q.inclusions): c.drawString(58,y,"• "+item); y-=20
 if q.notes: y-=10; c.setFont("Helvetica-Bold",13); c.drawString(48,y,"Consultant note"); y-=22; c.setFont("Helvetica",11); [c.drawString(48,y-i*16,line) for i,line in enumerate(q.notes[:700].splitlines()[:8])]
 c.setFillColor(HexColor("#64748b")); c.setFont("Helvetica",9); c.drawString(48,45,"Tour CMF | Tailored South India journeys | Subject to availability and final confirmation."); c.save(); return str(path)
@router.post("")
def create(data:QuoteInput,user:Consultant,db:Db):
 q=Quote(**data.model_dump(exclude={"inclusions"}),inclusions=json.dumps(data.inclusions),consultant_id=user.id,public_token=secrets.token_urlsafe(20)); db.add(q); db.flush(); q.pdf_path=make_pdf(q); db.commit(); return view(q)
@router.get("/{token}")
def public_quote(token:str,db:Db):
 q=db.query(Quote).filter(Quote.public_token==token).first()
 if not q: raise HTTPException(404,"Quote not found")
 return view(q)
@router.get("/{token}/pdf")
def pdf(token:str,db:Db):
 q=db.query(Quote).filter(Quote.public_token==token).first()
 if not q or not q.pdf_path: raise HTTPException(404,"Quote PDF not found")
 return FileResponse(q.pdf_path,media_type="application/pdf",filename=f"Tour-CMF-{q.public_token[:8]}.pdf")
