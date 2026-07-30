# Supabase migrations

Add forward-only, timestamped SQL migrations here. The v0.1 `schema.sql` file is
historical scaffolding and must not be edited to represent deployed v0.2 state.

The first v0.2 migration is reserved as:

`20260727_001_v02_core.sql`

Additional forward-only migrations:

- `20260729_002_workflow_graph_rpc.sql`: transactional workflow graph saves.
- `20260729_003_v1_snapshot_import.sql`: authenticated, idempotent v0.1 import.
- `20260730_004_prompts_knowledge.sql`: Prompt version publishing, immutable
  history, Prompt/Knowledge search indexes and hardened RLS.
- `20260730_005_skills_resources_activity.sql`: Skill hierarchy and experience
  transactions, Resource ownership checks and safe Activity Log triggers.
- `20260731_006_data_lifecycle.sql`: confirmation-gated transactional data
  deletion and recently reauthenticated account deletion.
