# S5 Prompt Library and Knowledge Base

Status: In progress.

## Database prerequisite

Apply `supabase/migrations/20260730_004_prompts_knowledge.sql` before using the
new pages. The migration is forward-only and keeps the tables created by 001.

## Prompt Library acceptance

1. Create a Prompt with title, description, project, tags, content, model and
   notes.
2. Verify `{{variable}}` placeholders are detected and stored.
3. Edit metadata without increasing the current version number.
4. Change content, model or notes and verify a new version is published.
5. Copy the current content and search by title, content or tag.
6. Verify another account cannot read or mutate the Prompt or its versions.

## Knowledge Base acceptance

1. Create and edit note, decision, lesson and reference entries.
2. Search title, content and tags.
3. Associate an item with a Project and optionally store a source URL.
4. Archive an item without permanently deleting it.
5. Verify empty, loading and operation-error states.
