"""Clerk JWT verification for FastAPI."""
import os
import json
import requests
import jwt
from fastapi import HTTPException, Cookie, Header, Depends
from typing import Optional

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
JWKS_URL = "https://prime-pup-5449.clerk.accounts.dev/.well-known/jwks.json"

_jwks_keys: dict = {}


def _refresh_jwks() -> dict:
    global _jwks_keys
    try:
        resp = requests.get(
            JWKS_URL,
            headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"},
            timeout=10,
        )
        data = resp.json()
        new_keys = {}
        for key in data.get("keys", []):
            kid = key.get("kid")
            if kid:
                new_keys[kid] = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
        _jwks_keys = new_keys
    except Exception as e:
        print(f"[auth] Failed to refresh JWKS: {e}")
    return _jwks_keys


def _verify_token(token: str) -> dict:
    global _jwks_keys
    if not _jwks_keys:
        _refresh_jwks()
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        public_key = _jwks_keys.get(kid)
        if not public_key:
            _refresh_jwks()
            public_key = _jwks_keys.get(kid)
        if not public_key:
            raise HTTPException(status_code=401, detail="Token key not found")
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={"verify_exp": True, "verify_nbf": True},
            leeway=60,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def get_optional_user(
    __session: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None),
) -> Optional[str]:
    """Return Clerk user ID if authenticated, else None."""
    token = None
    if __session:
        token = __session
    elif authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        return None
    try:
        payload = _verify_token(token)
        return payload.get("sub")
    except Exception:
        return None


def require_user(
    user_id: Optional[str] = Depends(get_optional_user),
) -> str:
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
