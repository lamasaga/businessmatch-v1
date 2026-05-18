from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.db.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, Token, UserLogin
from app.core.security import verify_password, get_password_hash, create_access_token, decode_token
from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
settings = get_settings()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise credentials_exception
    user_id: int = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.post("/register", response_model=dict)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    db_user = db.query(User).filter(User.username == user_data.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password,
        role=UserRole.student,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": db_user.id})
    refresh_token = create_access_token(data={"sub": db_user.id}, expires_delta=timedelta(days=30))
    
    return {
        "success": True,
        "data": {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": {
                "id": db_user.id,
                "email": db_user.email,
                "username": db_user.username,
                "role": db_user.role.value,
            },
        },
    }


@router.post("/login", response_model=dict)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_access_token(data={"sub": user.id}, expires_delta=timedelta(days=30))
    
    return {
        "success": True,
        "data": {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role.value,
            },
        },
    }


@router.get("/me", response_model=dict)
def get_me(current_user: User = Depends(get_current_active_user)):
    return {
        "success": True,
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "role": current_user.role.value,
            "avatar": current_user.avatar,
            "createdAt": current_user.created_at.isoformat() if current_user.created_at else None,
        },
    }


@router.post("/refresh", response_model=dict)
def refresh_token(refresh_token: str, db: Session = Depends(get_db)):
    payload = decode_token(refresh_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id: int = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    access_token = create_access_token(data={"sub": user.id})
    return {
        "success": True,
        "data": {"accessToken": access_token},
    }
