# RefWatch Weekly Recap: Week 12

**Coverage window:** July 14-20, 2026  
**Generated:** 2026-07-23  
**Data sources:** RefWatch committed datasets (`data/overview-snapshot.json`, `data/overview-insights.json`, league `ref-stats-core.json`, `baselines.json`)  
**Cloudflare bindings:** `API_KEYS_DB` (D1) stores API keys, autopsies, citations, and anomaly evidence only. Ref performance catalog lives in version-controlled JSON, not D1.

> **Methodology note:** RefWatch does not ingest NBA Last Two Minute (L2M) reports or play-level correct/incorrect call classifications. Whistle metrics below come from official box scores and crew samples. Sections labeled "Calls under scrutiny" use statistical friction patterns (whistle volume deltas, ref×team matrix edges, close-game proxies), not L2M verdicts.

---

## 1. Markdown Summary

### Ref performance highlights

| League | League avg fouls/game | Standout whistle profile | Games in catalog |
|--------|----------------------:|--------------------------|-----------------:|
| WNBA | 34.7 | Tim Greene: 31.6 fouls/game (**-3.1** vs league) across 64 games | 528 game logs |
| NBA | 40.8 | Crew sample tightly clustered near baseline (±0.5 fouls for top-volume refs) | 12,301 game logs |
| NHL | 8.3 | Scott Driscoll: **-33.4pp** win-rate delta vs Colorado baseline (17 games) | 12,282 game logs |
| EPL | 3.6 | Anthony Taylor: **-29.2pp** win-rate delta vs Manchester City baseline (35 games) | 3,800 game logs |

**WNBA whistle environment (Week 12 lens):** The summer slate continues to run below league foul pace. Tim Greene (-3.1 fouls/game vs 34.7 league average) and Gina Cross (-2.4) profile as low-whistle crews, while Toni Patillo (+2.2) sits on the high side. RefWatch tracks **volume and leverage-weighted impact**, not subjective accuracy percentages.

**Cross-league catalog (RefWatch snapshot, 2026-07-23):** 1,022 officials · 43,099 logged games · 1,033,196 whistle events indexed.

---

### Top 3 calls under scrutiny (statistical friction, not L2M)

#### 1. WNBA: Low-whistle crew compression (Tim Greene)

- **Pattern:** 31.6 fouls/game vs 34.7 league average (-3.1) over 64 games.
- **Rulebook context:** WNBA foul definitions (illegal contact, shooting fouls, away-from-play) still apply, but reduced whistle volume often shifts late-game foul-trouble leverage and transition freedom.
- **RefWatch read:** Defensive whistle environment. Not a missed-call count. Monitor close-margin games for leverage-sensitive sequences.

#### 2. NHL: Scott Driscoll × Colorado Avalanche matrix edge

- **Pattern:** 4-13 (23.5%) across 17 COL games vs 56.9% Avalanche baseline without this ref (-33.4pp).
- **Rulebook context:** NHL officiating emphasizes flow vs interference/holding tradeoffs. Persistent ref×team win-rate drift can correlate with penalty differential and special-teams volume, not a single overturned review.
- **RefWatch read:** Structural friction signal. See `/nhl/refs/scott-driscoll-0` and COL matrix cell.

#### 3. EPL: Anthony Taylor × Manchester City matrix edge

- **Pattern:** 19-16 (54.3%) across 35 MCI games vs 83.5% City baseline without this ref (-29.2pp).
- **Rulebook context:** IFAB Law 12 (direct/indirect free kicks, DOGSO, tactical fouls) frames how card and foul counts affect possession-dominant sides.
- **RefWatch read:** Long-sample ref×team split. Useful for pre-match briefing, not a single VAR decision grade.

---

### Stat anomaly of the week

**Scott Twardowski × New York Knicks (NBA matrix edge): +45.2pp win-rate delta**

- Ref×team record: **17-2 (89.5%)** across 19 games  
- Knicks baseline without this ref: **44.3%** (363-457 across 820 gp)  
- RefWatch significance gate: material split with large baseline contrast  

This is the largest positive matrix edge in the current overview insights bundle. It is a **historical association**, not proof of intentional bias. Full drilldown: `/nba/refs/scott-twardoski-52` · matrix cell NYK.

---

## 2. Podcast / Audio Overview Script (~3 minutes)

**Format:** 2 hosts · RefWatch Weekly · Week 12  
**Tone:** High energy, debate-forward, data-grounded

---

**HOST A (Data/Stat Analyst):** Welcome back to RefWatch Weekly, Week 12. I'm your stat line. This week we're pulling from more than forty-three thousand logged games across seven live leagues, and the number that jumped off the dashboard wasn't a single play. It was Scott Twardowski and the Knicks: seventeen and two, eighty-nine point five percent, plus forty-five point two percentage points against New York's baseline.

**HOST B (Former Ref / Rulebook Expert):** And before anyone tweets "rigged," that's nineteen games in a multi-year sample, not one night in July. But it *is* exactly the kind of split our crew chiefs are trained to notice internally. You don't game plan for one ref, but you do know which pairings historically play tight or loose.

**HOST A:** Fair. Let's talk about the summer slate. WNBA Week twelve energy is real. Tim Greene is running minus three point one fouls per game against league average. Gina Cross minus two point four. That's a materially quiet whistle environment.

**HOST B:** Low foul rate doesn't mean "missed calls." It usually means fewer borderline touch fouls and more play-through in transition. The rulebook didn't change. The threshold moved. That's where late-game foul-trouble leverage gets spicy.

**HOST A:** Speaking of spicy friction, not controversy in the L2M sense. We don't ingest Last Two Minute reports here. Scott Driscoll with Colorado: four and thirteen. Minus thirty-three point four points of win-rate delta vs baseline. Anthony Taylor with Manchester City: minus twenty-nine point two. Those are structural patterns.

**HOST B:** Right. In hockey, if penalties aren't getting called in certain matchups, the bench feels it on the kill. In soccer, City built on rhythm. If the game stays physical without cards, that's a tactical story. Neither is "the ref blew one call at 1:47."

**HOST A:** Biggest debate of the week: do we lead with Twardowski-Knicks anomaly or Greene's low-whistle WNBA slate?

**HOST B:** Lead with transparency. Twardowski-Knicks is the headline split, but Greene's environment affects *every* possession this week. I'd open with: "Two stories, one theme: officiating context shapes game state before the final minute."

**HOST A:** Locked. Pull the full matrix on RefWatch.ca. Week twelve recap, links in show notes. See you next Monday.

---

## 3. Social Carousel (5-Slide Deck)

### Slide 1: Hook / Headline

**Headline:** Week 12 Whistle Report  
**Subhead:** 43,099 games indexed · 7 live leagues · No hot takes without sample size  
**Visual note:** Dark terminal background, emerald accent stat line  

---

### Slide 2: WNBA whistle environment

**Headline:** Quiet crews run the summer slate  
**Data bullet 1:** League avg: **34.7 fouls/game**  
**Data bullet 2:** Tim Greene: **31.6 fouls/game (-3.1 vs avg)** · 64 games  
**Takeaway:** Low volume ≠ missed calls. It shifts late-game leverage.  

---

### Slide 3: NBA matrix shock

**Headline:** Knicks × Twardowski split pops the matrix  
**Data bullet 1:** **17-2 (89.5%)** in 19 ref×team games  
**Data bullet 2:** **+45.2pp** vs NYK baseline (44.3%)  
**Takeaway:** Material historical edge. Not a one-game narrative.  

---

### Slide 4: Cross-sport friction

**Headline:** Long samples, real friction  
**Data bullet 1:** NHL: Driscoll × COL **-33.4pp** win-rate delta (17 gp)  
**Data bullet 2:** EPL: Taylor × Man City **-29.2pp** (35 gp)  
**Takeaway:** Ref×team context beats clip-chasing. Box scores, not L2M.  

---

### Slide 5: CTA

**Headline:** See the full Week 12 board  
**Body:** Matrix edges · crew pace · pre-game intelligence  
**CTA:** **RefWatch.ca** · Multi-league officiating intelligence  
**Footer:** Methodology → refwatch.ca/methodology  

---

## Production checklist

- [ ] Replace placeholder week dates if publishing against a different calendar week
- [ ] Attach league-specific social crops (WNBA + NBA matrix screenshots)
- [ ] Legal review: all claims cite RefWatch sample sizes; no L2M accuracy claims
- [ ] Run `npm run check:no-em-dashes` before shipping copy to product surfaces

## Source links (internal)

- Overview insights: `data/overview-insights.json` (generated 2026-07-19)
- Snapshot: `data/overview-snapshot.json` (generated 2026-07-23)
- WNBA core stats: `data/wnba/ref-stats-core.json`
- NBA core stats: `data/ref-stats-core.json`
