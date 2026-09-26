"""Initial schema for doc_service

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-26 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'categories',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('slug', sa.String(length=120), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_id'), 'categories', ['id'], unique=False)
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=True)
    op.create_index(op.f('ix_categories_is_active'), 'categories', ['is_active'], unique=False)

    op.create_table(
        'tags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('slug', sa.String(length=60), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tags_id'), 'tags', ['id'], unique=False)
    op.create_index(op.f('ix_tags_name'), 'tags', ['name'], unique=True)
    op.create_index(op.f('ix_tags_slug'), 'tags', ['slug'], unique=True)

    op.create_table(
        'documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('slug', sa.String(length=250), nullable=False),
        sa.Column('summary', sa.String(length=500), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='draft'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('helpful_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('not_helpful_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['categories.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_documents_id'), 'documents', ['id'], unique=False)
    op.create_index(op.f('ix_documents_slug'), 'documents', ['slug'], unique=True)
    op.create_index(op.f('ix_documents_category_id'), 'documents', ['category_id'], unique=False)
    op.create_index(op.f('ix_documents_author_id'), 'documents', ['author_id'], unique=False)
    op.create_index(op.f('ix_documents_status'), 'documents', ['status'], unique=False)
    op.create_index(op.f('ix_documents_is_featured'), 'documents', ['is_featured'], unique=False)
    op.create_index(op.f('ix_documents_created_at'), 'documents', ['created_at'], unique=False)

    op.create_table(
        'document_tags',
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('document_id', 'tag_id')
    )

    op.create_table(
        'document_feedback',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('document_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('user_ip_hash', sa.String(length=64), nullable=True),
        sa.Column('is_helpful', sa.Boolean(), nullable=False),
        sa.Column('comment', sa.String(length=1000), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_document_feedback_id'), 'document_feedback', ['id'], unique=False)
    op.create_index(op.f('ix_document_feedback_document_id'), 'document_feedback', ['document_id'], unique=False)
    op.create_index(op.f('ix_document_feedback_user_id'), 'document_feedback', ['user_id'], unique=False)
    op.create_index(op.f('ix_document_feedback_user_ip_hash'), 'document_feedback', ['user_ip_hash'], unique=False)


def downgrade() -> None:
    op.drop_table('document_feedback')
    op.drop_table('document_tags')
    op.drop_table('documents')
    op.drop_table('tags')
    op.drop_table('categories')
