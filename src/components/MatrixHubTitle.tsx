import { MatrixHowToReadPopover } from "@/components/MatrixHowToReadPopover";

type MatrixHubTitleProps = {
  title: string;
  minGames: number;
};

export function MatrixHubTitle({ title, minGames }: MatrixHubTitleProps) {
  return (
    <div className="matrix-hub-title-row">
      <h1 className="page-title">{title}</h1>
      <MatrixHowToReadPopover minGames={minGames} />
    </div>
  );
}
