"""
- Imports all model classes so alembic/scripts/imports can see them.
- create_db.py also imports this to load metadata.
- Adds Notification model for PMS goal update alerts.
"""

from .account import Account
from .auth_identity import AuthIdentity
from .auth_session import AuthSession
from .chat_session import ChatSession
from .chat_message import ChatMessage
from .chat_tool_invocation import ChatToolInvocation
from .rag_document import RagDocument, RagDocumentChunk
from .notification import Notification, NotificationGoalType  # NEW
