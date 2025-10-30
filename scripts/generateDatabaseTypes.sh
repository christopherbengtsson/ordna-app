#!/bin/bash
# Load environment variables from root .env file
SCRIPT_DIR="$(dirname "$0")"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$ROOT_DIR/.env"

# Check if SUPABASE_PROJECT_ID is set, otherwise use --local flag
if [ -z "$SUPABASE_PROJECT_ID" ]; then
  echo "SUPABASE_PROJECT_ID not found in .env file, using local Supabase instance..."
  supabase gen types typescript --local --schema public > frontend/src/common/model/generated/Database.ts
else
  echo "Using Supabase project ID: $SUPABASE_PROJECT_ID"
  supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > frontend/src/common/model/generated/Database.ts
fi

# Run prettier from the frontend directory where it's installed
(cd "$ROOT_DIR/frontend" && pnpm prettier --write src/common/model/generated/Database.ts)
