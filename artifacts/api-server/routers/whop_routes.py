from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import os
from database import get_db, row_to_dict
from auth import require_user
from whop_client import (
    WHOP_COMPANY_ID, WHOP_PLAN_ID,
    create_checkout, get_payment, list_memberships,
    create_product, create_plan, _whop_request
)

router = APIRouter()

FRONTEND_BASE = os.environ.get("REPLIT_DEV_DOMAIN", "")


def _get_or_create_plan_id() -> Optional[str]:
    """Try to get an existing plan_id from DB settings, or discover/create one from Whop."""
    # 1. Check DB cache
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute("SELECT value FROM app_settings WHERE key = 'whop_plan_id'")
        row = cur.fetchone()
        if row and row[0]:
            return row[0]

    # 2. Try to list existing products/plans from Whop
    try:
        products = _whop_request("GET", f"/api/v1/products?company_id={WHOP_COMPANY_ID}")
        product_list = products.get("data", [])
        if product_list:
            product_id = product_list[0]["id"]
            # Get plans for this product
            plans = _whop_request("GET", f"/api/v1/plans?company_id={WHOP_COMPANY_ID}&product_id={product_id}")
            plan_list = plans.get("data", [])
            if plan_list:
                plan_id = plan_list[0]["id"]
                # Cache it
                with get_db() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO app_settings (key, value) VALUES ('whop_plan_id', %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                        (plan_id,)
                    )
                return plan_id
    except Exception:
        pass

    # 3. Try to create product + plan
    try:
        product = create_product("Kỷ Yếu Premium", "Gói Premium cho trang kỷ yếu lớp học")
        product_id = product.get("id")
        if product_id:
            plan = create_plan(product_id, 4.99, 30)
            plan_id = plan.get("id")
            if plan_id:
                with get_db() as conn:
                    cur = conn.cursor()
                    cur.execute(
                        "INSERT INTO app_settings (key, value) VALUES ('whop_plan_id', %s) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                        (plan_id,)
                    )
                return plan_id
    except Exception:
        pass

    return None


class CheckoutRequest(BaseModel):
    plan_id: Optional[str] = None


@router.post("/whop/checkout")
def start_checkout(request: Request, clerk_user_id: str = Depends(require_user)):
    """Create a Whop checkout session and return the purchase URL."""
    # Try env var first, then auto-discover/create
    plan_id = WHOP_PLAN_ID or _get_or_create_plan_id()

    if not plan_id:
        raise HTTPException(
            status_code=503,
            detail="Hệ thống thanh toán đang được cài đặt. Vui lòng liên hệ quản trị viên để nâng cấp."
        )

    scheme = "https"
    host = request.headers.get("host", FRONTEND_BASE)
    base = os.environ.get("BASE_PATH", "/")
    redirect_url = f"{scheme}://{host}{base}subscribe?checkout_done=1&uid={clerk_user_id}"

    try:
        result = create_checkout(plan_id, redirect_url)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Lỗi Whop: {e}")

    if "error" in result:
        raise HTTPException(status_code=502, detail=result["error"].get("message", "Lỗi Whop"))

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
    return {
        "company_id": WHOP_COMPANY_ID,
        "plan_id": WHOP_PLAN_ID,
        "plans": [
            {"id": "free", "name": "Miễn Phí", "price": 0},
            {"id": "premium", "name": "Premium", "price": 4.99, "period": "tháng"},
        ],
    }
