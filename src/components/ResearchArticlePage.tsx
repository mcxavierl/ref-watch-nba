import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import type { ResearchArticle } from "@/lib/research-articles/leverage-spike-anomaly";
import { techArticleJsonLd } from "@/lib/seo";
import "@/components/research-article.css";

type ResearchArticlePageProps = {
  article: ResearchArticle;
};

export function ResearchArticlePage({ article }: ResearchArticlePageProps) {
  return (
    <div className="page-shell research-article-shell overview-shell--clinical">
      <JsonLd
        data={techArticleJsonLd({
          headline: article.title,
          description: article.description,
          path: article.canonicalPath,
        })}
      />
      <Link href="/" className="back-link">
        ← Home
      </Link>

      <article className="research-article">
        <header className="research-article-hero">
          <p className="research-article-kicker">Ref Watch Research</p>
          <h1 className="research-article-title">{article.title}</h1>
          <p className="research-article-subtitle">{article.subtitle}</p>
          <p className="research-article-meta">
            <span>{article.publishedLabel}</span>
            <span aria-hidden> · </span>
            <span>{article.readMinutes} min read</span>
          </p>
        </header>

        <section className="research-article-tldr" aria-labelledby="research-tldr-heading">
          <h2 className="research-article-tldr-title" id="research-tldr-heading">
            TL;DR
          </h2>
          <ul className="research-article-tldr-list">
            {article.tldr.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <div className="research-article-body">
          {article.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="research-article-section"
              aria-labelledby={`research-section-${section.id}`}
            >
              <h2 className="research-article-section-title" id={`research-section-${section.id}`}>
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="research-article-paragraph">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="research-article-list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <nav className="research-article-related" aria-label="Related pages">
          {article.relatedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="research-article-related-link">
              {link.label}
            </Link>
          ))}
        </nav>
      </article>
    </div>
  );
}
