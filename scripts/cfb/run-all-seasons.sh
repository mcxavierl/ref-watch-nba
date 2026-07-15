#!/usr/bin/env bash
# Run the CFB generational pipeline for each season until all jobs complete.
# Usage: ./scripts/cfb/run-all-seasons.sh [start] [end]
# Example: ./scripts/cfb/run-all-seasons.sh 2016 2026
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

START="${1:-2016}"
END="${2:-2026}"

echo "CFB generational ingest: seasons ${START}-${END}"

for YEAR in $(seq "$START" "$END"); do
  echo ""
  echo "========== Season ${YEAR} =========="
  npm run cfb:pipeline -- --season="${YEAR}" --init-only

  ITER=0
  while true; do
    ITER=$((ITER + 1))
    npm run cfb:pipeline -- --season="${YEAR}"

    OPEN=$(node -e "
      const s = require('./data/cfb/pipeline-state.json');
      const open = s.jobs.filter(j =>
        j.season === ${YEAR} &&
        (j.status === 'pending' || j.status === 'processing')
      ).length;
      const failed = s.jobs.filter(j =>
        j.season === ${YEAR} && j.status === 'failed'
      ).length;
      console.log(open + ' ' + failed);
    ")

    PENDING=$(echo "$OPEN" | awk '{print $1}')
    FAILED=$(echo "$OPEN" | awk '{print $2}')

    if [ "$FAILED" != "0" ]; then
      echo "Season ${YEAR}: ${FAILED} job(s) failed. Fix and re-run this script."
      exit 1
    fi

    if [ "$PENDING" = "0" ]; then
      echo "Season ${YEAR} complete after ${ITER} iteration(s)."
      break
    fi

    if [ "$ITER" -ge 500 ]; then
      echo "Season ${YEAR}: exceeded 500 iterations. Resume manually."
      exit 1
    fi
  done
done

echo ""
echo "All seasons ${START}-${END} finished."
