"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteMaintenance } from "@/components/SiteMaintenance";
import { isPreviewQuery, isShowUnverifiedEnv } from "@/lib/show-unverified";

function SiteMaintenanceGateInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const preview =
    isShowUnverifiedEnv() ||
    isPreviewQuery({ preview: searchParams?.get("preview") });

  if (preview) return <>{children}</>;

  return <SiteMaintenance />;
}

export function SiteMaintenanceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<SiteMaintenance />}>
      <SiteMaintenanceGateInner>{children}</SiteMaintenanceGateInner>
    </Suspense>
  );
}
