from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.deps import get_current_admin
from backend.app.models.agency import Agency
from backend.app.schemas.agency import AgencyCreate, AgencyOut, AgencyUpdate
from backend.app.schemas.common import MessageResponse
from backend.app.services.audit import AuditService

router = APIRouter()


@router.get('', response_model=list[AgencyOut])
def list_agencies(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(Agency).order_by(Agency.region_name.asc()).all()


@router.post('', response_model=AgencyOut)
def create_agency(payload: AgencyCreate, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    agency = Agency(**payload.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    AuditService.log(db, admin.id, 'create', 'agency', str(agency.id), new_value=payload.model_dump(), ip_address=request.client.host if request.client else None)
    return agency


@router.put('/{agency_id}', response_model=AgencyOut)
def update_agency(agency_id: int, payload: AgencyUpdate, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail='Agency not found')
    old = {field: getattr(agency, field) for field in payload.model_fields}
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(agency, field, value)
    db.commit()
    db.refresh(agency)
    AuditService.log(db, admin.id, 'update', 'agency', str(agency.id), new_value=payload.model_dump(exclude_unset=True), old_value=old, ip_address=request.client.host if request.client else None)
    return agency


@router.delete('/{agency_id}', response_model=MessageResponse)
def delete_agency(agency_id: int, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    agency = db.query(Agency).filter(Agency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail='Agency not found')
    db.delete(agency)
    db.commit()
    AuditService.log(db, admin.id, 'delete', 'agency', str(agency_id), old_value={'agency_name': agency.agency_name}, ip_address=request.client.host if request.client else None)
    return MessageResponse(message='Agency deleted')
