"""Authentication + RBAC.

Passwords use stdlib PBKDF2-HMAC-SHA256 (no native crypto deps — the install can't break
on a fresh machine the night before a viva). Tokens are HS256 JWTs via PyJWT. In production
this maps to Amazon Cognito user pools + groups → JWT claims; here it's a self-contained
equivalent so RBAC is demonstrable without standing up Cognito.
"""
import base64
import hashlib
import hmac
import os
import time

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import settings

ROLES = ("admin", "manager", "ops")


# ── password hashing ─────────────────────────────────────────────────────────
def hash_password(password: str, iterations: int = 120_000) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, iterations)
    return f"pbkdf2_sha256${iterations}${base64.b64encode(salt).decode()}${base64.b64encode(dk).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        _algo, iters, salt_b64, hash_b64 = stored.split("$")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(hash_b64)
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, int(iters))
        return hmac.compare_digest(dk, expected)
    except Exception:
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────
def create_token(username: str, role: str, name: str) -> str:
    now = int(time.time())
    payload = {
        "sub": username,
        "role": role,
        "name": name,
        "iat": now,
        "exp": now + settings.jwt_ttl_hours * 3600,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


_bearer = HTTPBearer(auto_error=False)


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    if creds is None:
        raise HTTPException(status_code=401, detail="not authenticated")
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid or expired token")
    return {"username": payload["sub"], "role": payload["role"], "name": payload.get("name", "")}


def require_role(*roles: str):
    """Dependency factory: gate an endpoint to one or more roles."""
    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail=f"requires role: {', '.join(roles)}")
        return user
    return checker
