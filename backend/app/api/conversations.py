from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.models.paper import Paper
from app.services.rag_service import answer_question


router = APIRouter(
    prefix="/api/conversations",
    tags=["conversations"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
def get_or_create_user(db: Session, user_id: UUID):
    user = db.get(User, user_id)

    if user:
        return user

    user = User(
        id=user_id,
        name="Researcher",
        email=f"{user_id}@researchpilot.local",
        password_hash="local-demo-user",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

# ============================================================
# REQUEST MODELS
# ============================================================

class CreateConversationRequest(BaseModel):
    user_id: UUID
    paper_id: UUID | None = None
    title: str = "New Conversation"


class CreateMessageRequest(BaseModel):
    role: str
    content: str


# ============================================================
# CREATE CONVERSATION
# ============================================================
@router.post("")
def create_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db),
):
    user = get_or_create_user(db, request.user_id)

    if request.paper_id:
        paper = db.get(Paper, request.paper_id)

        if not paper:
            raise HTTPException(
                status_code=404,
                detail="Paper not found.",
            )
    conversation = Conversation(
        user_id=request.user_id,
        paper_id=request.paper_id,
        title=request.title,
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "paper_id": (
            str(conversation.paper_id)
            if conversation.paper_id
            else None
        ),
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
    }


# ============================================================
# LIST USER CONVERSATIONS
# ============================================================

@router.get("")
def list_conversations(
    user_id: UUID,
    db: Session = Depends(get_db),
):
user = get_or_create_user(db, user_id)

    conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    conversation_items = []

    for conversation in conversations:
        last_message = (
            db.query(Message)
            .filter(Message.conversation_id == conversation.id)
            .order_by(Message.created_at.desc())
            .first()
        )

        conversation_items.append(
            {
                "id": str(conversation.id),
                "user_id": str(conversation.user_id),
                "paper_id": (
                    str(conversation.paper_id)
                    if conversation.paper_id
                    else None
                ),
                "title": conversation.title,
                "created_at": conversation.created_at,
                "updated_at": conversation.updated_at,
                "last_message": (
                    {
                        "id": str(last_message.id),
                        "role": last_message.role,
                        "content": last_message.content,
                        "created_at": last_message.created_at,
                    }
                    if last_message
                    else None
                ),
            }
        )

    return conversation_items


# ============================================================
# GET SINGLE CONVERSATION
# ============================================================

@router.get("/{conversation_id}")
def get_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db),
):
    conversation = db.get(
        Conversation,
        conversation_id,
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    messages = (
        db.query(Message)
        .filter(
            Message.conversation_id == conversation_id
        )
        .order_by(Message.created_at.asc())
        .all()
    )

    return {
        "id": str(conversation.id),
        "user_id": str(conversation.user_id),
        "paper_id": (
            str(conversation.paper_id)
            if conversation.paper_id
            else None
        ),
        "title": conversation.title,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "messages": [
            {
                "id": str(message.id),
                "role": message.role,
                "content": message.content,
                "created_at": message.created_at,
                "sources": message.sources or [],
            }
            for message in messages
        ],
    }


# ============================================================
# CREATE MESSAGE
# ============================================================

@router.post("/{conversation_id}/messages")
def create_message(
    conversation_id: UUID,
    request: CreateMessageRequest,
    db: Session = Depends(get_db),
):
    conversation = db.get(
        Conversation,
        conversation_id,
    )

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Message content cannot be empty.",
        )

    message = Message(
        conversation_id=conversation_id,
        role=request.role,
        content=request.content,
    )

    db.add(message)

    conversation.updated_at = message.created_at

    db.commit()
    db.refresh(message)

    return {
        "id": str(message.id),
        "conversation_id": str(message.conversation_id),
        "role": message.role,
        "content": message.content,
        "created_at": message.created_at,
    }


# ============================================================
# AI CHAT
# ============================================================

@router.post("/{conversation_id}/chat")
def chat(
    conversation_id: UUID,
    request: CreateMessageRequest,
    db: Session = Depends(get_db),
):
    conversation = db.get(Conversation, conversation_id)

    if not conversation:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    if not conversation.paper_id:
        raise HTTPException(
            status_code=400,
            detail="Conversation is not linked to a paper.",
        )

    try:
        # 1. Save user message
        user_message = Message(
            conversation_id=conversation_id,
            role="user",
            content=request.content,
        )

        db.add(user_message)
        db.flush()

        # 2. Run RAG
        result = answer_question(
            db=db,
            paper_id=conversation.paper_id,
            question=request.content,
            top_k=5,
        )

        # 3. Save assistant message
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=result["answer"],
            sources=result["sources"],
        )

        db.add(assistant_message)

        # 4. Commit both messages
        db.commit()

        db.refresh(user_message)
        db.refresh(assistant_message)

        return {
            "conversation_id": str(conversation_id),
            "user_message": {
                "id": str(user_message.id),
                "role": user_message.role,
                "content": user_message.content,
            },
            "assistant_message": {
                "id": str(assistant_message.id),
                "role": assistant_message.role,
                "content": assistant_message.content,
                "sources": assistant_message.sources or [],
            },
            "sources": result["sources"],
        }

    except Exception as e:
        db.rollback()

        import traceback
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}",
        )
