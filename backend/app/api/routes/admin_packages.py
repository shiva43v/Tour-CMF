import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete as sa_delete, select, update
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.audit_log import ActivityLog
from app.models.enquiry import Enquiry
from app.models.package import Package, PackageVersion, SeasonalPrice
from app.models.user import User, UserRole
from app.schemas.packages import AdminPackageRead, DuplicatePackageInput, PackageVersionRead, PackageWrite, PriceRead

router = APIRouter(prefix="/admin/packages", tags=["admin packages"])
StaffUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR))]
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Database = Annotated[Session, Depends(get_db)]


def latest_version(package: Package) -> PackageVersion:
    if not package.versions:
        raise HTTPException(status_code=404, detail="Package has no content")
    return max(package.versions, key=lambda version: version.version_number)


def serialize(package: Package) -> AdminPackageRead:
    version = latest_version(package)
    content = json.loads(version.content)
    cms = content.pop("_cms", {})
    return AdminPackageRead(
        id=package.id,
        title=cms.get("title", package.title),
        slug=cms.get("slug", package.slug),
        status=package.status,
        version_number=version.version_number,
        content=content,
        prices=[PriceRead(
            season_name=price.season_name, start_date=price.start_date, end_date=price.end_date,
            price_per_person=price.price_per_person, price_basis=price.price_basis, gst_note=price.gst_note,
        ) for price in version.seasonal_prices],
        scheduled_publish_at=package.scheduled_publish_at,
    )


def package_query():
    return select(Package).options(selectinload(Package.versions).selectinload(PackageVersion.seasonal_prices))


def add_revision(db: Session, package: Package, payload: PackageWrite, user: User) -> PackageVersion:
    content = payload.content.model_dump()
    # Keep proposed URL and title with the revision, so editor drafts cannot
    # alter the currently public package until an admin publishes them.
    content["_cms"] = {"title": payload.title, "slug": payload.slug}
    version = PackageVersion(
        package=package,
        version_number=max((v.version_number for v in package.versions), default=0) + 1,
        content=json.dumps(content),
        created_by_id=user.id,
    )
    db.add(version)
    db.flush()
    for price in payload.prices:
        db.add(SeasonalPrice(package_version_id=version.id, **price.model_dump()))
    if payload.publish:
        package.title = payload.title
        package.slug = payload.slug
        package.status = "published"
        package.published_version_id = version.id
        package.scheduled_publish_at = None
    elif payload.scheduled_publish_at:
        package.status = "scheduled"
        package.scheduled_publish_at = payload.scheduled_publish_at
    db.add(ActivityLog(actor_id=user.id, entity_type="package", entity_id=str(package.id), action="package.revised", details={"version": version.version_number, "published": payload.publish}))
    return version


@router.get("", response_model=list[AdminPackageRead])
def list_admin_packages(_: StaffUser, db: Database) -> list[AdminPackageRead]:
    packages = db.scalars(package_query().order_by(Package.updated_at.desc())).unique().all()
    return [serialize(package) for package in packages if package.versions]


@router.get("/{package_id}", response_model=AdminPackageRead)
def get_admin_package(package_id: int, _: StaffUser, db: Database) -> AdminPackageRead:
    package = db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return serialize(package)


@router.get("/{package_id}/versions", response_model=list[PackageVersionRead])
def list_versions(package_id: int, _: StaffUser, db: Database) -> list[PackageVersionRead]:
    package = db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    return [PackageVersionRead(
        id=version.id,
        version_number=version.version_number,
        created_at=version.created_at,
        created_by_name=version.created_by.name if version.created_by else None,
        is_published=version.id == package.published_version_id,
    ) for version in sorted(package.versions, key=lambda v: v.version_number, reverse=True)]


@router.post("/{package_id}/versions/{version_id}/restore", response_model=AdminPackageRead)
def restore_version(package_id: int, version_id: int, user: AdminUser, db: Database) -> AdminPackageRead:
    package = db.scalar(package_query().where(Package.id == package_id))
    version = db.get(PackageVersion, version_id)
    if not package or not version or version.package_id != package.id:
        raise HTTPException(status_code=404, detail="Package version not found")
    content = json.loads(version.content)
    cms = content.pop("_cms", {})
    payload = PackageWrite(
        title=cms.get("title", package.title), slug=cms.get("slug", package.slug), content=content,
        prices=[PriceRead(season_name=p.season_name, start_date=p.start_date, end_date=p.end_date,
                          price_per_person=p.price_per_person, price_basis=p.price_basis, gst_note=p.gst_note).model_dump()
                for p in version.seasonal_prices], publish=True,
    )
    add_revision(db, package, payload, user)
    db.add(ActivityLog(actor_id=user.id, entity_type="package", entity_id=str(package.id), action="package.version_restored", details={"source_version": version.version_number}))
    db.commit()
    return get_admin_package(package.id, user, db)


@router.post("", response_model=AdminPackageRead, status_code=status.HTTP_201_CREATED)
def create_package(payload: PackageWrite, user: StaffUser, db: Database) -> AdminPackageRead:
    if payload.publish and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can approve and publish a package")
    if db.scalar(select(Package.id).where(Package.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="This URL slug is already in use")
    package = Package(slug=payload.slug, title=payload.title, status="draft")
    db.add(package)
    db.flush()
    add_revision(db, package, payload, user)
    db.commit()
    return get_admin_package(package.id, user, db)


@router.put("/{package_id}", response_model=AdminPackageRead)
def update_package(package_id: int, payload: PackageWrite, user: StaffUser, db: Database) -> AdminPackageRead:
    package = db.scalar(package_query().where(Package.id == package_id))
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    duplicate_slug = db.scalar(select(Package.id).where(Package.slug == payload.slug, Package.id != package_id))
    if duplicate_slug:
        raise HTTPException(status_code=409, detail="This URL slug is already in use")
    # Editors may create and revise drafts, but cannot send anything public.
    if payload.publish and user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an admin can approve and publish a package")
    add_revision(db, package, payload, user)
    db.commit()
    return get_admin_package(package_id, user, db)


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_package(package_id: int, user: AdminUser, db: Database) -> None:
    package = db.get(Package, package_id)
    if not package:
        raise HTTPException(status_code=404, detail="Package not found")
    # Keep traveller records while removing their optional link to this package.
    db.execute(update(Enquiry).where(Enquiry.package_id == package_id).values(package_id=None))
    db.add(ActivityLog(
        actor_id=user.id, entity_type="package", entity_id=str(package.id), action="package.deleted",
        details={"title": package.title, "slug": package.slug},
    ))
    # Clear the self-reference first, then let PostgreSQL cascade to versions and prices.
    db.execute(update(Package).where(Package.id == package_id).values(published_version_id=None))
    db.execute(sa_delete(Package).where(Package.id == package_id))
    db.commit()


@router.post("/{package_id}/duplicate", response_model=AdminPackageRead, status_code=status.HTTP_201_CREATED)
def duplicate_package(package_id: int, payload: DuplicatePackageInput, user: StaffUser, db: Database) -> AdminPackageRead:
    source = db.scalar(package_query().where(Package.id == package_id))
    if not source:
        raise HTTPException(status_code=404, detail="Package not found")
    if db.scalar(select(Package.id).where(Package.slug == payload.slug)):
        raise HTTPException(status_code=409, detail="This URL slug is already in use")
    current = latest_version(source)
    package = Package(slug=payload.slug, title=payload.title or f"Copy of {source.title}", status="draft")
    db.add(package)
    db.flush()
    source_content = json.loads(current.content)
    source_content.pop("_cms", None)
    write = PackageWrite(title=package.title, slug=package.slug, content=source_content, prices=[
        PriceRead(
            season_name=p.season_name, start_date=p.start_date, end_date=p.end_date,
            price_per_person=p.price_per_person, price_basis=p.price_basis, gst_note=p.gst_note,
        ).model_dump()
        for p in current.seasonal_prices
    ])
    add_revision(db, package, write, user)
    db.commit()
    return get_admin_package(package.id, user, db)
