from sqlalchemy import (
    Column, Integer, ForeignKey, Numeric,
    String, Boolean, DateTime, Text
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    amount = Column(Numeric(12, 2), nullable=False)
    type = Column(String(10), nullable=False)

    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=True)

    currency = Column(String(3), default="TRY", nullable=False)

    original_amount = Column(Numeric(12, 2), nullable=True)
    original_currency = Column(String(3), nullable=True)

    is_ocr = Column(Boolean, default=False, nullable=False)

    spent_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="transactions")