#!/bin/bash
# Pre-push hook: automatically run supabase db push if migration files changed

MIGRATIONS=$(git diff --name-only @{push}.. -- 'supabase/migrations/')

if [ -n "$MIGRATIONS" ]; then
  echo "New migrations detected, running supabase db push..."
  npx supabase db push
  if [ $? -ne 0 ]; then
    echo "Migration push failed! Push aborted."
    exit 1
  fi
  echo "Migrations applied successfully."
fi
