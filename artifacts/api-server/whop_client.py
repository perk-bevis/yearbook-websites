"""Whop API client. Uses WHOP_API_KEY directly, or the Replit connector as fallback."""
import os
import json
import requests

_CONNECTOR_HOSTNAME = os.environ.get("REPLIT_CONNECTORS_HOSTNAME", "")
_REPL_IDENTITY = os.environ.get("REPL_IDENTITY") or os.environ.get("WEB_REPL_RENEWAL", "")
_TOKEN_PREFIX = "repl " if os.environ.get("REPL_IDENTITY") else "depl "

WHOP_API_KEY = os.environ.get("WHOP_API_KEY", "")
WHOP_COMPANY_ID = os.environ.get("WHOP_COMPANY_ID", "biz_mq2nWbR4AjIBlZ")
WHOP_PLAN_ID = os.environ.get("WHOP_PLAN_ID", "")


def _whop_request(method: str, path: str, body: dict = None) -> dict:
    if WHOP_API_KEY:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {WHOP_API_KEY}",
        }
        url = f"https://api.whop.com{path}"
    elif _CONNECTOR_HOSTNAME and _REPL_IDENTITY:
        headers = {
            "Content-Type": "application/json",
            "X-Replit-Token": f"{_TOKEN_PREFIX}{_REPL_IDENTITY}",
            "Connector-Name": "whop",
        }
        url = f"https://{_CONNECTOR_HOSTNAME}/api/v2/proxy{path}"
    else:
        raise RuntimeError("Whop is not configured: set WHOP_API_KEY")
    resp = requests.request(
        method, url, headers=headers,
        data=json.dumps(body) if body else None,
        timeout=15,
    )
    return resp.json()

def create_checkout(plan_id: str, redirect_url: str) -> dict:
    return _whop_request("POST", "/api/v1/checkout_configurations", {
        "plan_id": plan_id,
        "redirect_url": redirect_url,
    })


def get_membership(membership_id: str) -> dict:
    return _whop_request("GET", f"/api/v1/memberships/{membership_id}")


def list_memberships(user_email: str = None) -> dict:
    qs = f"?company_id={WHOP_COMPANY_ID}"
    if user_email:
        qs += f"&email={user_email}"
    return _whop_request("GET", f"/api/v1/memberships{qs}")


def get_payment(checkout_id: str) -> dict:
    return _whop_request("GET", f"/api/v1/payments?company_id={WHOP_COMPANY_ID}&checkout_configuration_ids[]={checkout_id}")


def create_product(title: str, description: str = None) -> dict:
    body = {"title": title, "company_id": WHOP_COMPANY_ID}
    if description:
        body["description"] = description
    return _whop_request("POST", "/api/v1/products", body)


def create_plan(product_id: str, price: float, billing_period: int = 30) -> dict:
    return _whop_request("POST", "/api/v1/plans", {
        "company_id": WHOP_COMPANY_ID,
        "product_id": product_id,
        "initial_price": price,
        "currency": "usd",
        "billing_period": billing_period,
        "plan_type": "renewal",
    })
