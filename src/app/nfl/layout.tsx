import { NflBettingHonestyBanner } from "@/components/NflBettingHonestyBanner";

export default function NflLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NflBettingHonestyBanner />
      {children}
    </>
  );
}
