import { recalibrateProfiles } from "@/lib/cron/recalibrateProfiles";
import type { AutopsyRecord } from "@/lib/cron/recalibrate-profiles-types";
import {
  getAutopsyRecordStore,
  type AutopsyInsertSubscriber,
} from "@/lib/services/autopsyRecordStore";

let registered = false;

const onAutopsyCompleted: AutopsyInsertSubscriber = async (record) => {
  if (record.status !== "COMPLETED") return;
  await recalibrateProfiles({ autopsy: record });
};

/** Register the post-autopsy profile recalibration subscriber once per process. */
export async function registerAutopsyRecalibrationSubscriber(): Promise<void> {
  if (registered) return;
  const store = await getAutopsyRecordStore();
  store.subscribe(onAutopsyCompleted);
  registered = true;
}

export async function handleAutopsyRecordInserted(record: AutopsyRecord): Promise<void> {
  await onAutopsyCompleted(record);
}
