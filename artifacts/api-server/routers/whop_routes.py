from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
from database import get_db, row_to_dict
from auth import require_user
from whop_client import (
    WHOP_COMPANY_ID, WHOP_PLAN_ID,
    create_checkout, get_payment, list_memberships
)

router = APIRouter()

FRONTEND_BASE = os.environ.get("REPLIT_DEV_DOMAIN", "")


class CheckoutRequest(BaseModel):
    plan_id: Optional[str] = None


@router.post("/whop/checkout")
def start_checkout(request: Request, clerk_user_id: str = Depends(require_user)):
    """Create a Whop checkout session and return the purchase URL."""
    plan_id = WHOP_PLAN_ID
    if not plan_id:
        raise HTTPException(status_code=503, detail="Premium plan not configured yet")

    # Build redirect URL
    scheme = "https"
    host = request.headers.get("host", FRONTEND_BASE)
    base = os.environ.get("BASE_PATH", "/")
    redirect_url = f"{scheme}://{host}{base}subscribe?checkout_done=1&uid={clerk_user_id}"

    try:
        result = create_checkout(plan_id, redirect_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Whop error: {e}")

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"].get("message", "Whop error"))

    # Save checkout_id on user record so we can verify later
    checkout_id = result.get("id")
    purchase_url = result.get("purchase_url") or result.get("url")
    if checkout_id:
        with get_db() as conn:
            cur = conn.cursor()
            cur.execute(
                "UPDATE app_users SET whop_checkout_id = %s WHERE clerk_user_id = %s",
                (checkout_id, clerk_user_id),
            )
    return {"purchase_url": purchase_url, "checkout_id": checkout_id}


@router.get("/whop/verify")
def verify_membership(clerk_user_id: str = Depends(require_user)):
    """Verify if the current user has an active premium membership."""
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT plan, whop_checkout_id, whop_membership_id FROM app_users WHERE clerk_user_id = %s",
            (clerk_user_id,),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan, checkout_id, membership_id = user

    if plan == "premium":
        return {"plan": "premium", "active": True}

    # Try to verify via checkout payment
    if checkout_id:
        try:
            result = get_payment(checkout_id)
            payments = result.get("data", [])
            active = any(p.get("status") in ("paid", "completed", "succeeded") for p in payments)
            if active:
                with get_db() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "UPDATE app_users SET plan = 'premium' WHERE clerk_user_id = %s",
                        (clerk_user_id,),
                    )
                return {"plan": "premium", "active": True}
        except Exception:
            pass

    return {"plan": plan or "free", "active": False}


@router.get("/whop/plans")
def get_plans():
    """Return available plan info for the frontend."""
    return {
        "company_id": WHOP_COMPANY_ID,
        "plan_id": WHOP_PLAN_ID,
        "plans": [
            {
                "id": "free",
                "name": "Miễn Phí",
                "price": 0,
                "features": [
                    "1 kỷ yếu lớp học",
                    "Tối đa 35 học sinh",
                    "2 khung ảnh miễn phí",
                    "50 ảnh album",
                    "Ký ức và sự kiện không giới hạn",
                ],
            },
            {
                "id": "premium",
                "name": "Premium",
                "price": 4.99,
                "period": "tháng",
                "features": [
                    "Không giới hạn kỷ yếu",
                    "Không giới hạn học sinh",
                    "Tất cả khung ảnh premium",
                    "Ảnh không giới hạn",
                    "Chủ đề giao diện tùy chỉnh",
                    "Xuất PDF kỷ yếu",
                    "Ưu tiên hỗ trợ",
                ],
            },
        ],
    }
