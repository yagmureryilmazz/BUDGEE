from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.auth_deps import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_reset_token,
    hash_password,
    verify_email_verification_token,
    verify_password,
    verify_reset_token,
)
from app.db.deps import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserPublic
from app.services.email_service import send_email
from app.services.users import create_user, get_user_by_email
from app.services.token_blacklist import blacklist_jti, is_blacklisted

router = APIRouter(prefix="/auth", tags=["auth"])


def send_verification_email(email: str):
    token = create_email_verification_token(subject=email)
    verify_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"

    send_email(
        to_email=email,
        subject="Verify your Budgee account",
        body=f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f17;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f17;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo & Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="font-size:36px;margin-bottom:8px;">💸</div>
              <div style="font-size:26px;font-weight:900;color:#f8fafc;letter-spacing:2px;">BUDGEE</div>
              <div style="font-size:12px;color:#60a5fa;font-weight:700;letter-spacing:1.5px;margin-top:4px;">PERSONAL FINANCE</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111827;border:1px solid #1f2937;border-radius:20px;padding:36px 32px;">

              <!-- Icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <div style="width:64px;height:64px;background-color:rgba(37,99,235,0.15);border:1px solid rgba(37,99,235,0.4);border-radius:50%;text-align:center;line-height:64px;font-size:28px;display:inline-block;">✉️</div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <div style="font-size:22px;font-weight:900;color:#f8fafc;">Verify Your Email</div>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <div style="font-size:14px;color:#94a3b8;line-height:1.6;">
                      Welcome to Budgee! Click the button below<br>to confirm your email address and get started.
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="height:1px;background-color:#1f2937;"></div>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="{verify_link}"
                       style="display:inline-block;background-color:#2563eb;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                      ✓ &nbsp; Verify Email Address
                    </a>
                  </td>
                </tr>

                <!-- Expiry note -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="font-size:12px;color:#64748b;">This link expires in <span style="color:#f59e0b;font-weight:700;">60 minutes</span>.</div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="height:1px;background-color:#1f2937;"></div>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding-bottom:4px;">
                    <div style="font-size:11px;color:#64748b;">If the button doesn't work, copy and paste this link:</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:11px;color:#60a5fa;word-break:break-all;">{verify_link}</div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <div style="font-size:11px;color:#374151;">You received this email because you registered at Budgee.</div>
              <div style="font-size:11px;color:#374151;margin-top:4px;">If you didn't create an account, you can safely ignore this email.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """,
    )


@router.post("/register", response_model=UserPublic, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, payload.email)

    if existing:
        if not existing.is_verified:
            send_verification_email(existing.email)
            raise HTTPException(
                status_code=400,
                detail="Email already registered but not verified. Verification email resent.",
            )

        raise HTTPException(status_code=400, detail="Email already registered")

    user = create_user(db, payload.email, hash_password(payload.password))

    user.is_verified = False
    user.first_name = payload.first_name.strip()
    user.last_name = payload.last_name.strip()
    user.birth_date = payload.birth_date
    db.add(user)
    db.commit()
    db.refresh(user)

    send_verification_email(user.email)

    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Email is not verified. Please check your inbox.",
        )

    token, _jti = create_access_token(subject=user.email)
    return TokenResponse(access_token=token)


@router.post("/verify-email")
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)):
    email = verify_email_verification_token(payload.token)

    if not email:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification token",
        )

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_verified = True
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, payload.email)

    if not user:
        return {
            "message": "If an account with that email exists, a verification email has been sent."
        }

    if user.is_verified:
        return {"message": "Email is already verified"}

    send_verification_email(user.email)

    return {
        "message": "If an account with that email exists, a verification email has been sent."
    }


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)

    if not user:
        return {
            "message": "If an account with that email exists, a reset email has been sent."
        }

    token = create_reset_token(subject=user.email)
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"

    send_email(
        to_email=user.email,
        subject="Reset your Budgee password",
        body=f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0b0f17;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0b0f17;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo & Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="font-size:36px;margin-bottom:8px;">💸</div>
              <div style="font-size:26px;font-weight:900;color:#f8fafc;letter-spacing:2px;">BUDGEE</div>
              <div style="font-size:12px;color:#60a5fa;font-weight:700;letter-spacing:1.5px;margin-top:4px;">PERSONAL FINANCE</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#111827;border:1px solid #1f2937;border-radius:20px;padding:36px 32px;">

              <table width="100%" cellpadding="0" cellspacing="0">

                <!-- Icon -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <div style="width:64px;height:64px;background-color:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:50%;text-align:center;line-height:64px;font-size:28px;display:inline-block;">🔐</div>
                  </td>
                </tr>

                <!-- Title -->
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <div style="font-size:22px;font-weight:900;color:#f8fafc;">Reset Your Password</div>
                  </td>
                </tr>

                <!-- Subtitle -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <div style="font-size:14px;color:#94a3b8;line-height:1.6;">
                      We received a request to reset your Budgee password.<br>Click the button below to choose a new one.
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:28px;">
                    <div style="height:1px;background-color:#1f2937;"></div>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="{reset_link}"
                       style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:15px;font-weight:900;text-decoration:none;padding:14px 40px;border-radius:12px;letter-spacing:0.5px;">
                      🔑 &nbsp; Reset Password
                    </a>
                  </td>
                </tr>

                <!-- Expiry note -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <div style="font-size:12px;color:#64748b;">This link expires in <span style="color:#f59e0b;font-weight:700;">15 minutes</span>.</div>
                  </td>
                </tr>

                <!-- Warning box -->
                <tr>
                  <td style="padding-bottom:24px;">
                    <div style="background-color:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:14px 16px;">
                      <div style="font-size:12px;color:#fcd34d;font-weight:700;">⚠️ &nbsp; Didn't request this?</div>
                      <div style="font-size:12px;color:#94a3b8;margin-top:4px;">If you didn't request a password reset, ignore this email. Your account is safe.</div>
                    </div>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td style="padding-bottom:20px;">
                    <div style="height:1px;background-color:#1f2937;"></div>
                  </td>
                </tr>

                <!-- Fallback link -->
                <tr>
                  <td style="padding-bottom:4px;">
                    <div style="font-size:11px;color:#64748b;">If the button doesn't work, copy and paste this link:</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:11px;color:#60a5fa;word-break:break-all;">{reset_link}</div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <div style="font-size:11px;color:#374151;">You received this email because a password reset was requested for your Budgee account.</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        """,
    )

    return {
        "message": "If an account with that email exists, a reset email has been sent."
    }


@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    email = verify_reset_token(payload.token)

    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Password updated successfully"}


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization.split(" ", 1)[1].strip()


@router.get("/me", response_model=UserPublic)
def me(user=Depends(get_current_user)):
    return user


@router.post("/logout")
def logout(
    user=Depends(get_current_user),
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    token = _get_bearer_token(authorization)
    payload = _decode_token(token)

    jti = payload.get("jti")
    sub = payload.get("sub")
    exp = payload.get("exp")

    if not jti or not sub or exp is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        if is_blacklisted(jti):
            return {"status": "already_logged_out"}
    except TypeError:
        if is_blacklisted(db, jti):
            return {"status": "already_logged_out"}

    if isinstance(exp, int):
        exp_ts = exp
    elif isinstance(exp, datetime):
        exp_ts = int(exp.replace(tzinfo=timezone.utc).timestamp())
    else:
        exp_ts = int(exp)

    now_ts = int(datetime.now(timezone.utc).timestamp())
    ttl = max(1, exp_ts - now_ts)

    blacklist_jti(jti, ttl_seconds=ttl)
    return {"status": "logged_out"}