# S6 Skills, Resources and Activity

Status: Complete in code; hosted acceptance pending.

## Database prerequisite

Apply `supabase/migrations/20260730_005_skills_resources_activity.sql` before
opening the S6 pages. This migration preserves the S1 tables and adds hierarchy
validation, transactional skill-experience events, safe activity triggers and
project-ownership checks for resources.

## Skill Tree acceptance

1. Create a root skill and a child skill.
2. Edit the skill name, description, parent and level.
3. Record positive experience with a reason and optional Project.
4. Record a negative correction that does not make total experience negative.
5. Verify the total changes and the immutable event appears in recent history.
6. Verify a skill cannot parent itself or form a cycle.

## Resource Center acceptance

1. Create each supported type: link, document, API, tool, account and other.
2. Associate a resource with a Project and add `key=value` metadata.
3. Open a stored URL in a new tab.
4. Store only an environment-variable name or provider location in Secret Ref.
5. Verify a pasted API key or token is rejected.
6. Search, filter, edit and delete a resource.

## Activity and Dashboard acceptance

1. Complete a Project and process an Inbox item after applying migration 005.
2. Refresh cloud state and verify both actions appear in Activity Log.
3. Verify Dashboard “本周完成” uses those activity rows instead of a hard-coded
   percentage.
4. Verify priority order is priority, status and then updated time.
5. Verify the Agent relay shows no more than six entries.
6. Verify activity metadata never includes Prompt content, Knowledge content,
   resource notes, tokens or secrets.
