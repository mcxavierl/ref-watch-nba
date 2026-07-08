#!/usr/bin/env python3
"""Atomic NFL Phase 1 integration."""
import glob, json, re, shutil, subprocess, sys
from pathlib import Path
R = Path("/Users/matthewlangford/Downloads/ref-watch-nba")
shutil.rmtree(R/'src/lib/nfl', ignore_errors=True)
shutil.rmtree(R/'src/app/nfl', ignore_errors=True)
shutil.copytree(R/'src/lib/nhl', R/'src/lib/nfl')
shutil.copytree(R/'src/app/nhl', R/'src/app/nfl')
for f in ['pp-premium.ts','ot-rate.ts','ref-photos.ts']:
    (R/f'src/lib/nfl/{f}').unlink(missing_ok=True)
# types
p=R/'src/lib/types.ts'; t=p.read_text()
if 'NflRefAnalytics' not in t:
 t=t.replace('| "linesman";','| "linesman"\n  | "side_judge"\n  | "field_judge"\n  | "back_judge"\n  | "line_judge"\n  | "down_judge";')
 t=t.replace('league: "NBA" | "WNBA" | "NHL";','league: "NBA" | "WNBA" | "NHL" | "NFL";')
 t=t.replace('source: "official.nba.com" | "api-web.nhle.com" | "seeded";','source: "official.nba.com" | "api-web.nhle.com" | "seeded" | "historical";')
 t=t.replace('homeMinors?: number;\n  awayMinors?: number;','homeMinors?: number;\n  awayMinors?: number;\n  homeFlags?: number;\n  awayFlags?: number;\n  homePenaltyYards?: number;\n  awayPenaltyYards?: number;\n  totalPenaltyYards?: number;')
 nfl='\nexport interface NflRefAnalytics { avgFlagsPerGame:number; flagsDelta:number; avgPenaltyYardsPerGame:number; penaltyYardsDelta:number; avgFlagImbalance:number; balancedGameRate:number; balanceKind:"balancer"|"asymmetric"|"neutral"; provenance?:{avgFlagsPerGame:MetricProvenance;penaltyYards:MetricProvenance;penaltyBalance:MetricProvenance;flagsBaseline:MetricProvenance;sampleGate:SampleGateStatus;};}\n'
 t=t.replace('export interface NhlTeamSpecialTeams {',nfl+'export interface NhlTeamSpecialTeams {')
 t=t.replace('nhlAnalytics?: NhlRefAnalytics;','nhlAnalytics?: NhlRefAnalytics;\n  nflAnalytics?: NflRefAnalytics;')
 t=t.replace('leagueOvertimeRate?: number;\n  minSampleSize:','leagueOvertimeRate?: number;\n  leagueAvgPenaltyYards?: number;\n  minSampleSize:')
 t=t.replace('source: "seeded" | "official" | "backfill";','source: "seeded" | "official" | "backfill" | "historical";')
 t=t.replace('source: "nba-stats-api" | "nhl-api" | "seeded";','source: "nba-stats-api" | "nhl-api" | "seeded" | "historical";')
 p.write_text(t)
# [include all other patches - condensed]
# global-stats
p=R/'src/lib/global-stats.ts'; t=p.read_text()
if '__REFWATCH_NFL' not in t:
 t=t.replace('var __REFWATCH_NHL_REF_STATS__','var __REFWATCH_NHL_REF_STATS__\n  var __REFWATCH_NFL_REF_STATS__')
 t=t.replace('export type NhlStatsGlobalKey','export type NflStatsGlobalKey = "__REFWATCH_NFL_REF_STATS__";\nexport type NhlStatsGlobalKey'); p.write_text(t)
# preload
p=R/'src/lib/ref-stats-preload.ts'; t=p.read_text().replace('type League = "nba" | "nhl";','type League = "nba" | "nhl" | "nfl";').replace('NbaStatsGlobalKey | NhlStatsGlobalKey','NbaStatsGlobalKey | NhlStatsGlobalKey | NflStatsGlobalKey').replace('NhlStatsGlobalKey,\n} from','NflStatsGlobalKey,\n  NhlStatsGlobalKey,\n} from').replace('nhl: "__REFWATCH_NHL_REF_STATS__",\n};','nhl: "__REFWATCH_NHL_REF_STATS__",\n  nfl: "__REFWATCH_NFL_REF_STATS__",\n};').replace('nhl: "/data/nhl",\n};','nhl: "/data/nhl",\n  nfl: "/data/nfl",\n};').replace('if (pathname.startsWith("/nhl")) return ["nhl"];','if (pathname.startsWith("/nfl")) return ["nfl"];\n  if (pathname.startsWith("/nhl")) return ["nhl"];'); p.write_text(t)
# scripts baselines + src baselines (same as before)
p=R/'scripts/lib/baselines.ts'; t=p.read_text()
if 'FALLBACK_NFL' not in t:
 t=t.replace('export const FALLBACK_NHL','export const FALLBACK_NFL={label:"NFL",leagueAvgTotal:45.8,leagueOverBaseline:46,leagueAvgFouls:13,leagueAvgPenaltyYards:95} as const;\nexport const FALLBACK_NHL')
 t=t.replace('NHL: LeagueBaselines;\n}','NHL: LeagueBaselines;\n  NFL: LeagueBaselines;\n}')
 t=t.replace('NHL: Omit<SeasonBaseline','NFL: Omit<SeasonBaseline,"season"|"gameCount">&{label:string};\n    NHL: Omit<SeasonBaseline')
 t=t.replace('nhlGames: GameLogEntry[],\n  note?: string,\n): BaselinesFile','nhlGames: GameLogEntry[],\n  note?: string,\n  nflGames: GameLogEntry[] = [],\n): BaselinesFile')
 t=t.replace('NHL: computeLeagueBaselines("NHL", nhlGames),\n  };','NHL: computeLeagueBaselines("NHL", nhlGames),\n    NFL: computeLeagueBaselines("NFL", nflGames),\n  };')
 t=t.replace('NHL: { ...FALLBACK_NHL },\n    },','NHL: { ...FALLBACK_NHL },\n      NFL: { ...FALLBACK_NFL },\n    },')
 if 'fallbackForLeague' not in t: t=t.replace('export function buildBaselinesFile','export function fallbackForLeague(l:"NBA"|"NHL"|"NFL"){return l=="NBA"?FALLBACK_NBA:l=="NFL"?FALLBACK_NFL:FALLBACK_NHL;}\nexport function buildBaselinesFile')
 t=t.replace('game.league === "NBA" ? FALLBACK_NBA : FALLBACK_NHL','fallbackForLeague(game.league)'); p.write_text(t)
p=R/'src/lib/baselines.ts'; t=p.read_text().replace('FALLBACK_NHL,\n} from','FALLBACK_NHL,\n  FALLBACK_NFL,\n} from')
if 'leagueAvgPenaltyYards?: number;' not in t: t=t.replace('leagueOvertimeRate?: number;\n  source:','leagueOvertimeRate?: number;\n  leagueAvgPenaltyYards?: number;\n  source:')
t=t.replace('NHL: { ...FALLBACK_NHL },\n  },','NFL: { ...FALLBACK_NFL },\n    NHL: { ...FALLBACK_NHL },\n  },')
if 'NFL:' not in t: t=t.replace('usingFallback: true,\n  },\n};','usingFallback: true,\n  },\n  NFL: { currentSeason: null, seasons: {}, aggregate: { season: "all", gameCount: 0, ...FALLBACK_NFL }, usingFallback: true },\n};')
t=t.replace('league: "NBA" | "NHL"','league: "NBA" | "NHL" | "NFL"',3)
t=t.replace('leagueOvertimeRate: baseline.leagueOvertimeRate,\n    source,','leagueOvertimeRate: baseline.leagueOvertimeRate,\n    leagueAvgPenaltyYards: baseline.leagueAvgPenaltyYards,\n    source,'); p.write_text(t)
# game-logs
p=R/'src/lib/game-logs.ts'; t=p.read_text().replace('"NBA" | "NHL"','"NBA" | "NHL" | "NFL"')
t=re.sub(r'function gameLogPath\(league: "NBA" \| "NHL" \| "NFL"\): string \{[^}]+\}', 'function gameLogPath(league: "NBA" | "NHL" | "NFL"): string {\n  const root = path.join(process.cwd(), "data");\n  if (league === "NBA") return path.join(root, "game-logs.json");\n  if (league === "NHL") return path.join(root, "nhl", "game-logs.json");\n  return path.join(root, "nfl", "game-logs.json");\n}', t, count=1)
p.write_text(t)
# close-game already patched? ensure NFL
cg=R/'src/lib/close-game.ts'; t=cg.read_text()
if 'nflWindows' not in t:
 t=t.replace('function nbaWindows(): CloseGameWindow[] {','\nfunction isNflCloseMargin(game: RuntimeGameLogEntry): boolean { return Math.abs(game.homeScore - game.awayScore) <= 7; }\nfunction isNflCloseSpread(game: RuntimeGameLogEntry): boolean { return Math.abs(game.homeSpread) <= 5.5; }\nfunction nflWindows(): CloseGameWindow[] { return [{id:"close-margin",label:"Close games (≤7 pt margin)",description:"7pt proxy",isProxy:true},{id:"close-spread",label:"Pregame toss-ups",description:"spread",isProxy:true}]; }\nfunction nbaWindows(): CloseGameWindow[] {')
 t=t.replace('league: "NBA" | "NHL"','league: "NBA" | "NHL" | "NFL"')
 if 'league === "NFL"' not in t:
  t=t.replace('  if (windowId === "overtime") return isNhlOvertime(game);','  if (league === "NFL") { if (windowId === "close-margin") return isNflCloseMargin(game); if (windowId === "close-spread") return isNflCloseSpread(game); return false; }\n  if (windowId === "overtime") return isNhlOvertime(game);')
 t=t.replace('league === "NBA" ? "pts" : "goals"','league === "NHL" ? "goals" : "pts"')
 t=t.replace('league === "NBA" ? "fouls" : "PIM"','league === "NBA" ? "fouls" : league === "NFL" ? "flags" : "PIM"')
 t=t.replace('league === "NBA" ? nbaWindows() : nhlWindows()','league === "NBA" ? nbaWindows() : league === "NFL" ? nflWindows() : nhlWindows()')
 cg.write_text(t)
# nfl teams/data/findings
None  # teams.ts written in post; const m=new Map(NFL_TEAMS.map(t=>[t.abbr,t])); export function getTeam(a:string){return m.get(a.toUpperCase())} export function getTeamOrThrow(a:string){const t=getTeam(a);if(!t)throw new Error(a);return t} export function teamFullName(t:NflTeam){return `${t.city} ${t.name}`} export function teamWithArticle(t:NflTeam){return `the ${t.name}`} export function teamLogoUrl(a:string){return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${a.toUpperCase()}`} export function teamsByConference(){return{AFC:NFL_TEAMS.filter(t=>t.conference==="AFC"),NFC:NFL_TEAMS.filter(t=>t.conference==="NFC")}} export function detectTeamsInGame(tx:string){return NFL_TEAM_ABBRS.filter(a=>tx.toUpperCase().includes(a))} export function matchTeamString(s:string){const n=s.trim().toLowerCase();return NFL_TEAMS.find(t=>t.abbr.toLowerCase()===n||t.name.toLowerCase()===n)}')
p=R/'src/lib/nfl/data.ts'; t=p.read_text().replace('@/lib/nhl/','@/lib/nfl/').replace('"nhl"','"nfl"').replace('NHL','NFL').replace('nhlCrewMetricsProvenance','nflCrewMetricsProvenance')
t=re.sub(r'leagueAvgMinors: bl\.leagueAvgMinors,\s*leagueOvertimeRate: bl\.leagueOvertimeRate,','leagueAvgPenaltyYards: bl.leagueAvgPenaltyYards,',t)
t=re.sub(r'leagueAvgMinors: baseline\.leagueAvgMinors \?\? stats\.meta\.leagueAvgMinors,\s*leagueOvertimeRate:\s*baseline\.leagueOvertimeRate \?\? stats\.meta\.leagueOvertimeRate,','leagueAvgPenaltyYards: baseline.leagueAvgPenaltyYards ?? stats.meta.leagueAvgPenaltyYards,',t)
t=re.sub(r'\nfunction mergeTeamSpecialTeams[\s\S]*?^}\n','\n',t,flags=re.M); t=t.replace('mergeTeamSpecialTeams(data)','data'); t=t.replace('return mergeTeamSpecialTeams(','return (')
p.write_text(t)
p=R/'src/lib/nfl/findings.ts'; t=p.read_text().replace('@/lib/nhl/','@/lib/nfl/').replace('NHL_TEAMS','NFL_TEAMS').replace('computeNhlFindings','computeNflFindings').replace('NHL_FINDING_CTX','NFL_FINDING_CTX').replace('"NHL"','"NFL"')
for bad in ['buildNhlMinorsOutlierFinding,','buildNhlOtOutlierFinding,','buildNhlOtOutlierFinding(ctx),','buildNhlMinorsOutlierFinding(ctx),']: t=t.replace(bad,'')
p.write_text(t)
for n in ['home-bias.ts','odds.ts','whistle-premium.ts']: p=R/f'src/lib/nfl/{n}'; p.write_text(p.read_text().replace('@/lib/nhl/','@/lib/nfl/').replace('NHL','NFL').replace('nhl','nfl'))
# provenance
pv=R/'src/lib/provenance.ts'; t=pv.read_text()
if 'nflCrewMetricsProvenance' not in t:
 t=t.replace('const NHL_ANALYTICS_MIN_GAMES = 10;','const NHL_ANALYTICS_MIN_GAMES = 10;\nconst NFL_ANALYTICS_MIN_GAMES = 10;')
 t=t.replace('import type {\n  MetricProvenance,','import type {\n  NflRefAnalytics,\n  MetricProvenance,')
 t=t.replace('league: "NBA" | "NHL",','league: "NBA" | "NHL" | "NFL",')
 t=t.replace('meta.leagueAvgMinors !== undefined ? "NHL" : "NBA",','meta.leagueAvgPenaltyYards !== undefined ? "NFL" : meta.leagueAvgMinors !== undefined ? "NHL" : "NBA",')
 t += '\nexport function nflCrewMetricsProvenance(stats:RefStatsFile,qualifiedCount:number,poolGames:number){return crewMetricsProvenance(stats,qualifiedCount,poolGames,stats.meta.minSampleSize);}\nexport function nflRefAnalyticsProvenance(profile:RefProfile,analytics:NflRefAnalytics,meta:RefStatsFile["meta"]):NflRefAnalytics["provenance"]{const dataTag=refStatsDataTag(meta);const flagsBaseline=baselineProvenance("NFL");const gate=sampleGateStatus(profile.games,NFL_ANALYTICS_MIN_GAMES);return{avgFlagsPerGame:metricFromTag(dataTag,{sampleSize:profile.games,gateThreshold:NFL_ANALYTICS_MIN_GAMES}),penaltyYards:metricFromTag(dataTag,{sampleSize:profile.games,gateThreshold:NFL_ANALYTICS_MIN_GAMES}),penaltyBalance:metricFromTag(dataTag,{sampleSize:profile.games,gateThreshold:NFL_ANALYTICS_MIN_GAMES}),flagsBaseline,sampleGate:gate};}\n'
 pv.write_text(t)
# shared
for rel in ['src/lib/site.ts','src/lib/trends.ts','src/lib/findings-builders.ts','src/lib/findings-shared.ts']:
 p=R/rel; t=p.read_text().replace('"NBA" | "NHL"','"NBA" | "NHL" | "NFL"'); p.write_text(t)
R.joinpath('src/lib/site.ts').write_text(R.joinpath('src/lib/site.ts').read_text().replace('NBA or NHL','NBA, NHL, or NFL'))
t = (R/'src/lib/findings-shared.ts').read_text()
if 'nfl-' not in t: t=t.replace('if (id.startsWith("nhl-"))','if (id.startsWith("nfl-")) return "NFL";\n  if (id.startsWith("nhl-"))')
t=t.replace('if (pathname.startsWith("/nhl")) return "/nhl/research";','if (pathname.startsWith("/nfl")) return "/nfl/research";\n  if (pathname.startsWith("/nhl")) return "/nhl/research";'); R.joinpath('src/lib/findings-shared.ts').write_text(t)
p=R/'src/lib/research.ts'; t=p.read_text()
if 'computeNflFindings' not in t:
 t=t.replace('from "@/lib/nhl/findings";','from "@/lib/nhl/findings";\nimport { computeAllFindings as computeNflFindings } from "@/lib/nfl/findings";')
 t=t.replace('return [...nba, ...nhl];','const nfl=tagResearchFindings(computeNflFindings(),"NFL"); return [...nba,...nhl,...nfl];')
 t=t.replace('league: "NBA" | "NHL"','league: "NBA" | "NHL" | "NFL"')
 if 'case "NFL"' not in t: t=t.replace('case "NHL":\n      return computeNhlFindings(stats);','case "NHL":\n      return computeNhlFindings(stats);\n    case "NFL":\n      return computeNflFindings(stats);')
 p.write_text(t)
# pages + components
for fp in glob.glob(str(R/'src/app/nfl/**/*.tsx'),recursive=True):
 t=Path(fp).read_text().replace('/nhl','/nfl').replace('@/lib/nhl/','@/lib/nfl/').replace('NhlRefAnalyticsSection','NflRefAnalyticsSection').replace('nhlAnalytics','nflAnalytics').replace('nhlRefAnalyticsProvenance','nflRefAnalyticsProvenance').replace('sport: "nhl"','sport: "nfl"').replace('(["East", "West"]','(["AFC", "NFC"]').replace('{ East, West }','{ AFC, NFC }').replace('NHL','NFL').replace('nhl','nfl')
 if 'matrix/page.tsx' in fp: t='export default function P(){return <div className="page-shell"><h1>NFL matrix stub</h1></div>}\n'
 if 'crews/page.tsx' in fp: t='export default function P(){return <div className="page-shell"><h1>NFL crews stub</h1></div>}\n'
 Path(fp).write_text(t)
R.joinpath('src/components/NflRefAnalyticsSection.tsx').write_text('import {RefDashboardStatCell,RefDashboardStatGrid} from "@/components/RefDashboardStatGrid";import {formatPct} from "@/lib/nfl/data";import {formatSigned} from "@/lib/stats-utils";import type{NflRefAnalytics} from "@/lib/types";export function NflRefAnalyticsSection({analytics,leagueAvgFouls,leagueAvgPenaltyYards,showMetrics=true}:{analytics:NflRefAnalytics;leagueAvgFouls?:number;leagueAvgPenaltyYards?:number;showMetrics?:boolean}){const lf=leagueAvgFouls??13;const ly=leagueAvgPenaltyYards??95;const p=analytics.provenance;return(<section className="data-card">{showMetrics?<RefDashboardStatGrid><RefDashboardStatCell label="Flags" value={String(analytics.avgFlagsPerGame)} detail={`${formatSigned(analytics.flagsDelta)} vs ${lf}`} provenance={p?.avgFlagsPerGame}/><RefDashboardStatCell label="Penalty yards" value={String(analytics.avgPenaltyYardsPerGame)} detail={`${formatSigned(analytics.penaltyYardsDelta)} vs ${ly}`} provenance={p?.penaltyYards}/><RefDashboardStatCell label="Balance" value={analytics.balanceKind} detail={formatPct(analytics.balancedGameRate)} provenance={p?.penaltyBalance}/></RefDashboardStatGrid>:<p>Sample gate</p>}</section>);}')
nav='''"use client";
import Link from "next/link";import {usePathname} from "next/navigation";
const NBA_LINKS=[{href:"/",label:"Slate"},{href:"/rankings",label:"Rankings"},{href:"/teams",label:"Teams"},{href:"/refs",label:"Refs"},{href:"/matrix",label:"Matrix"},{href:"/crews",label:"Crews"},{href:"/trends",label:"Trends"},{href:"/research",label:"Findings"}];
const NHL_LINKS=[{href:"/nhl",label:"Slate"},{href:"/nhl/rankings",label:"Rankings"},{href:"/nhl/teams",label:"Teams"},{href:"/nhl/refs",label:"Refs"},{href:"/nhl/matrix",label:"Matrix"},{href:"/nhl/crews",label:"Crews"},{href:"/nhl/trends",label:"Trends"},{href:"/nhl/research",label:"Findings"}];
const NFL_LINKS=[{href:"/nfl",label:"Slate"},{href:"/nfl/rankings",label:"Rankings"},{href:"/nfl/teams",label:"Teams"},{href:"/nfl/refs",label:"Refs"},{href:"/nfl/trends",label:"Trends"},{href:"/nfl/research",label:"Findings"}];
function activeLeague(p:string){if(p.startsWith("/nfl"))return "nfl";if(p.startsWith("/nhl"))return "nhl";return "nba";}
export function LeagueSwitch(){const p=usePathname();const l=activeLeague(p);return(<div className="league-switch" data-league={l}><span className="league-switch-thumb"/><Link href="/" className={l==="nba"?"league-switch-option league-switch-option--active":"league-switch-option"}>NBA</Link><Link href="/nhl" className={l==="nhl"?"league-switch-option league-switch-option--active":"league-switch-option"}>NHL</Link><Link href="/nfl" className={l==="nfl"?"league-switch-option league-switch-option--active":"league-switch-option"}>NFL</Link></div>);}
export function SiteNav({id="site-primary-nav"}:{id?:string}){const p=usePathname();const l=activeLeague(p);const links=l==="nfl"?NFL_LINKS:l==="nhl"?NHL_LINKS:NBA_LINKS;const home=l==="nba"?"/":"/"+l;return(<div className="site-subnav"><div id={id} className="site-nav-shell" data-league={l}><nav className="site-nav-rail">{links.map(link=>(<Link key={link.href} href={link.href}>{link.label}</Link>))}</nav></div></div>);}
'''
R.joinpath('src/components/SiteNav.tsx').write_text(nav)
for rel in glob.glob(str(R/'src/components/*.tsx'))+['src/lib/user-language.ts','src/lib/profile-signals.ts']:
 p=Path(rel)
 if p.exists(): p.write_text(p.read_text().replace('league: "NBA" | "NHL"','league: "NBA" | "NHL" | "NFL"').replace('sport: "nba" | "nhl"','sport: "nba" | "nhl" | "nfl"'))
# globals css
css=R/'src/app/globals.css'; t=css.read_text()
if 'data-league="nfl"' not in t:
 t=t.replace('grid-template-columns: 1fr 1fr;','grid-template-columns: 1fr 1fr 1fr;',1)
 t=t.replace('width: calc(50% - 0.18rem);','width: calc(33.333% - 0.18rem);',1)
 t=t.replace('translateX(100%);','translateX(100%);\n  }\n  .league-switch[data-league="nfl"] .league-switch-thumb { transform: translateX(200%);',1)
 css.write_text(t)
# scripts
(R/'scripts/nfl').mkdir(exist_ok=True)
R.joinpath('scripts/nfl/build-ref-data.ts').write_text('#!/usr/bin/env npx tsx\nconsole.log("nfl stub")\n')
R.joinpath('scripts/nfl/generate-seed.ts').write_text('#!/usr/bin/env npx tsx\nconsole.log("nfl seed stub")\n')
p=R/'package.json'; t=p.read_text()
if 'generate-nfl-seed' not in t:
 t=t.replace('"build-nhl-data": "tsx scripts/nhl/build-ref-data.ts",','"build-nhl-data": "tsx scripts/nhl/build-ref-data.ts",\n    "generate-nfl-seed": "tsx scripts/nfl/generate-seed.ts",\n    "build-nfl-data": "tsx scripts/nfl/build-ref-data.ts",')
 p.write_text(t)
p=R/'scripts/copy-data-to-public.ts'; t=p.read_text()
if 'data/nfl' not in t: p.write_text(t+'\ncopyPair(path.join(root,"data/nfl"),path.join(root,"public/data/nfl"),"ref-stats");\n')
print('bootstrap ok', len(glob.glob(str(R/'src/app/nfl/**/*.tsx'),recursive=True)))

def w(rel, text):
    p = R / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)

TEAMS = [
 ("ARI","Cardinals","Arizona","NFC","West"),("ATL","Falcons","Atlanta","NFC","South"),("BAL","Ravens","Baltimore","AFC","North"),
 ("BUF","Bills","Buffalo","AFC","East"),("CAR","Panthers","Carolina","NFC","South"),("CHI","Bears","Chicago","NFC","North"),
 ("CIN","Bengals","Cincinnati","AFC","North"),("CLE","Browns","Cleveland","AFC","North"),("DAL","Cowboys","Dallas","NFC","East"),
 ("DEN","Broncos","Denver","AFC","West"),("DET","Lions","Detroit","NFC","North"),("GB","Packers","Green Bay","NFC","North"),
 ("HOU","Texans","Houston","AFC","South"),("IND","Colts","Indianapolis","AFC","South"),("JAX","Jaguars","Jacksonville","AFC","South"),
 ("KC","Chiefs","Kansas City","AFC","West"),("LAC","Chargers","Los Angeles","AFC","West"),("LAR","Rams","Los Angeles","NFC","West"),
 ("LV","Raiders","Las Vegas","AFC","West"),("MIA","Dolphins","Miami","AFC","East"),("MIN","Vikings","Minnesota","NFC","North"),
 ("NE","Patriots","New England","AFC","East"),("NO","Saints","New Orleans","NFC","South"),("NYG","Giants","New York","NFC","East"),
 ("NYJ","Jets","New York","AFC","East"),("PHI","Eagles","Philadelphia","NFC","East"),("PIT","Steelers","Pittsburgh","AFC","North"),
 ("SEA","Seahawks","Seattle","NFC","West"),("SF","49ers","San Francisco","NFC","West"),("TB","Buccaneers","Tampa Bay","NFC","South"),
 ("TEN","Titans","Tennessee","AFC","South"),("WAS","Commanders","Washington","NFC","East"),
]
body = ['export interface NflTeam { abbr: string; name: string; city: string; conference: "AFC" | "NFC"; division: string; }',
        'export const NFL_TEAMS: NflTeam[] = [']
for row in TEAMS:
    body.append(f'  {{ abbr: "{row[0]}", name: "{row[1]}", city: "{row[2]}", conference: "{row[3]}", division: "{row[4]}" }},')
body += [
 '];', 'export const NFL_TEAM_ABBRS = NFL_TEAMS.map((t) => t.abbr);',
 'const teamByAbbr = new Map(NFL_TEAMS.map((t) => [t.abbr, t]));',
 'export function getTeam(abbr: string): NflTeam | undefined { return teamByAbbr.get(abbr.toUpperCase()); }',
 'export function getTeamOrThrow(abbr: string): NflTeam { const t = getTeam(abbr); if (!t) throw new Error(`Unknown team: ${abbr}`); return t; }',
 'export function teamFullName(team: NflTeam): string { return `${team.city} ${team.name}`; }',
 'export function teamWithArticle(team: NflTeam): string { return `the ${team.name}`; }',
 'export function teamLogoUrl(abbr: string): string { return `https://static.www.nfl.com/t_q-best/league/api/clubs/logos/${abbr.toUpperCase()}`; }',
 'export function matchTeamString(team: string): NflTeam | undefined { const n = team.trim().toLowerCase(); if (!n) return undefined; const d = teamByAbbr.get(n.toUpperCase()); if (d) return d; for (const t of NFL_TEAMS) { if (n.includes(t.name.lower()) if False else 0): pass } return undefined; }',
]
# fix broken line in matchTeamString
body[-1] = '''export function matchTeamString(team: string): NflTeam | undefined {
  const n = team.trim().toLowerCase(); if (!n) return undefined;
  const d = teamByAbbr.get(n.toUpperCase()); if (d) return d;
  for (const t of NFL_TEAMS) { const full = teamFullName(t).toLowerCase(); if (n === full || n.includes(t.name.toLowerCase()) || n.includes(t.city.toLowerCase())) return t; }
  return undefined;
}'''
body += [
 'export function detectTeamsInGame(awayTeam: string, homeTeam: string): NflTeam[] { const out: NflTeam[] = []; for (const raw of [awayTeam, homeTeam]) { const m = matchTeamString(raw); if (m && !out.some((t) => t.abbr === m.abbr)) out.push(m); } return out; }',
 'export function teamsByConference(): { AFC: NflTeam[]; NFC: NflTeam[] } { return { AFC: NFL_TEAMS.filter((t) => t.conference === "AFC"), NFC: NFL_TEAMS.filter((t) => t.conference === "NFC") }; }',
 '']
w('src/lib/nfl/teams.ts', '\n'.join(body))

w('src/lib/findings-significance.ts', 'export function isNflFlagsOutlier(avgFlags: number, leagueAvg: number, games: number, minGames = 30): boolean {\n  if (games < minGames) return false;\n  return Math.abs(avgFlags - leagueAvg) >= 1.2 || avgFlags >= leagueAvg + 1.5;\n}\n')

# types
p = R/'src/lib/types.ts'; t = p.read_text()
if 'NflRefAnalytics' not in t:
    block = 'export interface NflRefAnalytics { avgFlagsPerGame: number; flagsDelta: number; avgPenaltyYardsPerGame: number; penaltyYardsDelta: number; avgFlagImbalance: number; balancedGameRate: number; balanceKind: "balancer" | "asymmetric" | "neutral"; provenance?: { avgFlagsPerGame: MetricProvenance; penaltyYards: MetricProvenance; penaltyBalance: MetricProvenance; flagsBaseline: MetricProvenance; sampleGate: SampleGateStatus; }; }\n\n'
    t = t.replace('export interface NhlTeamSpecialTeams {', block + 'export interface NhlTeamSpecialTeams {')
if 'nflAnalytics?' not in t:
    t = t.replace('nhlAnalytics?: NhlRefAnalytics;', 'nhlAnalytics?: NhlRefAnalytics;\n  nflAnalytics?: NflRefAnalytics;')
if 'leagueAvgPenaltyYards?: number;' not in t:
    t = t.replace('leagueOvertimeRate?: number;\n    /** NHL: season PP/PK', 'leagueAvgPenaltyYards?: number;\n    leagueOvertimeRate?: number;\n    /** NHL: season PP/PK')
t = t.replace('league: "NBA" | "WNBA" | "NHL";', 'league: "NBA" | "WNBA" | "NHL" | "NFL";')
t = t.replace('source: "nba-stats-api" | "nhl-api" | "seeded";', 'source: "nba-stats-api" | "nhl-api" | "seeded" | "historical";')
t = t.replace('source: "official.nba.com" | "api-web.nhle.com" | "seeded";', 'source: "official.nba.com" | "api-web.nhle.com" | "seeded" | "historical";')
p.write_text(t)

sb = R/'scripts/lib/baselines.ts'; st = sb.read_text()
if 'leagueAvgPenaltyYards?: number;' not in st:
    st = st.replace('leagueOvertimeRate?: number;', 'leagueOvertimeRate?: number;\n  leagueAvgPenaltyYards?: number;', 1)
sb.write_text(st)

bl = R/'src/lib/baselines.ts'; bt = bl.read_text()
if 'FALLBACK_NFL' not in bt:
    bt = bt.replace('FALLBACK_NHL,\n} from', 'FALLBACK_NHL,\n  FALLBACK_NFL,\n} from')
if 'NFL: {' not in bt:
    bt = bt.replace('NHL: { ...FALLBACK_NHL },\n  },', 'NHL: { ...FALLBACK_NHL },\n    NFL: { ...FALLBACK_NFL },\n  },')
    bt = bt.replace('usingFallback: true,\n  },\n};', 'usingFallback: true,\n  },\n  NFL: { currentSeason: null, seasons: {}, aggregate: { season: "all", gameCount: 0, ...FALLBACK_NFL }, usingFallback: true },\n};', 1)
if 'leagueAvgPenaltyYards?: number;' not in bt.split('ResolvedBaseline')[0]:
    bt = bt.replace('leagueOvertimeRate?: number;\n  source:', 'leagueOvertimeRate?: number;\n  leagueAvgPenaltyYards?: number;\n  source:')
if 'leagueAvgPenaltyYards: baseline' not in bt:
    bt = bt.replace('leagueOvertimeRate: baseline.leagueOvertimeRate,\n    source,', 'leagueOvertimeRate: baseline.leagueOvertimeRate,\n    leagueAvgPenaltyYards: baseline.leagueAvgPenaltyYards,\n    source,')
bl.write_text(bt.replace('league: "NBA" | "NHL"', 'league: "NBA" | "NHL" | "NFL"', 3))

dt = (R/'src/lib/nfl/data.ts').read_text()
dt = dt.replace('NHL_TEAM_ABBRS', 'NFL_TEAM_ABBRS').replace('NhlTeam', 'NflTeam')
dt = re.sub(r'\nfunction mergeTeamSpecialTeams[\s\S]*?^}\n', '\n', dt, flags=re.M)
dt = dt.replace('mergeTeamSpecialTeams(normalizeRefStats(raw))', 'normalizeRefStats(raw)')
(R/'src/lib/nfl/data.ts').write_text(dt)

ft = (R/'src/lib/nfl/findings.ts').read_text().replace('NHL_TEAMS', 'NFL_TEAMS')
for bad in ['buildNhlOtOutlierFinding(stats, NFL_FINDING_CTX),\n', 'buildNhlMinorsOutlierFinding(stats, NFL_FINDING_CTX),\n']:
    ft = ft.replace(bad, '')
if 'buildNflFlagsOutlierFinding' not in ft:
    ft = ft.replace('from "@/lib/findings-builders";', 'from "@/lib/findings-builders";\nimport { isNflFlagsOutlier } from "@/lib/findings-significance";')
    ins = '\nfunction buildNflFlagsOutlierFinding(stats: RefStatsFile): ScoredFindingBase | null {\n  const leagueAvg = stats.meta.leagueAvgFouls;\n  let best: RefProfile | undefined;\n  for (const ref of stats.refs) {\n    const a = ref.nflAnalytics;\n    if (!a || !isNflFlagsOutlier(a.avgFlagsPerGame, leagueAvg, ref.games)) continue;\n    if (!best || a.avgFlagsPerGame > (best.nflAnalytics?.avgFlagsPerGame ?? 0)) best = ref;\n  }\n  if (!best?.nflAnalytics) return null;\n  const a = best.nflAnalytics;\n  return { id: "nfl-flags-outlier", category: "whistle-extreme", headline: `${best.name} flag pace outlier`, summary: `${best.name}: ${a.avgFlagsPerGame} flags/game.`, explainer: "NFL historical flags.", stats: [{ label: "Flags", value: String(a.avgFlagsPerGame), detail: `${formatSigned(a.flagsDelta)} vs ${leagueAvg}` }], sampleNote: `${best.games} games`, links: [{ label: best.name, href: `/nfl/refs/${best.slug}` }], score: rankScore(Math.abs(a.flagsDelta)/leagueAvg, best.games, MIN_REF_GAMES), sampleGames: best.games };\n}\n'
    ft = ft.replace('function collectCandidates', ins + 'function collectCandidates')
    ft = ft.replace('return [\n    buildLeagueSkewFinding', 'return [\n    buildNflFlagsOutlierFinding(stats),\n    buildLeagueSkewFinding', 1)
(R/'src/lib/nfl/findings.ts').write_text(ft)

for rel in ['src/lib/global-stats.ts', 'src/lib/ref-stats-preload.ts', 'src/lib/provenance.ts', 'src/lib/findings-shared.ts', 'src/lib/research.ts', 'src/components/FindingAccordion.tsx', 'src/components/FindingsSection.tsx', 'src/components/ResearchHubFindings.tsx', 'src/components/RefRankingsTable.tsx', 'src/components/RefTeamMatrix.tsx', 'src/components/TeamLogo.tsx', 'src/components/RefAvatar.tsx']:
    p = R/rel
    if not p.exists(): continue
    t = p.read_text().replace('"NBA" | "NHL"', '"NBA" | "NHL" | "NFL"').replace('"nba" | "nhl"', '"nba" | "nhl" | "nfl"')
    if rel.endswith('global-stats.ts'):
        if 'NflStatsGlobalKey' not in t:
            t = t.replace('export type NhlStatsGlobalKey', 'export type NflStatsGlobalKey = "__REFWATCH_NFL_REF_STATS__";\nexport type NhlStatsGlobalKey')
        if '__REFWATCH_NFL_REF_STATS__' not in t:
            t = t.replace('var __REFWATCH_NHL_REF_STATS__', 'var __REFWATCH_NHL_REF_STATS__: import("@/lib/types").RefStatsFile | undefined;\n  var __REFWATCH_NFL_REF_STATS__')
    if rel.endswith('ref-stats-preload.ts') and 'NflStatsGlobalKey' not in t:
        t = t.replace('NhlStatsGlobalKey,', 'NflStatsGlobalKey,\n  NhlStatsGlobalKey,').replace('NbaStatsGlobalKey | NhlStatsGlobalKey', 'NbaStatsGlobalKey | NhlStatsGlobalKey | NflStatsGlobalKey')
    if rel.endswith('provenance.ts') and 'NflRefAnalytics' not in t.split('import type')[1][:200]:
        t = t.replace('import type {\n  CrewHomeBias,', 'import type {\n  NflRefAnalytics,\n  CrewHomeBias,')
    if rel.endswith('findings-shared.ts'):
        t = t.replace('export type FindingLeague = "NBA" | "NHL";', 'export type FindingLeague = "NBA" | "NHL" | "NFL";')
    if rel.endswith('TeamLogo.tsx'):
        t = t.replace('sport?: "nba" | "nhl";', 'sport?: "nba" | "nhl" | "nfl";')
        if 'nflTeamLogoUrl' not in t:
            t = t.replace('from "@/lib/nhl/teams";', 'from "@/lib/nhl/teams";\nimport { teamLogoUrl as nflTeamLogoUrl } from "@/lib/nfl/teams";')
            t = t.replace('(sport === "nhl"', '(sport === "nfl" ? nflTeamLogoUrl(team.abbr) : sport === "nhl"')
    p.write_text(t)

tp = (R/'src/app/nfl/teams/page.tsx').read_text()
tp = tp.replace('{ East, West }', '{ AFC, NFC }').replace('(["East", "West"]', '(["AFC", "NFC"]')
tp = tp.replace('conference === "East" ? East : West', 'conference === "AFC" ? AFC : NFC').replace('East', 'AFC').replace('West', 'NFC')
tp = tp.replace('AFCern Conference', 'AFC Conference').replace('NFCern Conference', 'NFC Conference')
(R/'src/app/nfl/teams/page.tsx').write_text(tp)
tab = R/'src/app/nfl/teams/[abbr]/page.tsx'
if tab.exists():
    tab.write_text(tab.read_text().replace('NHL_TEAMS', 'NFL_TEAMS').replace('/nhl/', '/nfl/').replace('sport="nhl"', 'sport="nfl"'))

sy = R/'src/lib/syndication.ts'; st = sy.read_text()
if 'buildNflNightlyFeed' not in st:
    st = st.replace('league: "NBA" | "NHL";', 'league: "NBA" | "NHL" | "NFL";')
    st = st.replace('let nhlFeedCache', 'let nflFeedCache: NightlyFeed | undefined;\nlet nhlFeedCache')
    st = st.replace('} from "@/lib/nhl/data";', '} from "@/lib/nhl/data";\nimport { getAssignments as getNflAssignments, getRefStats as getNflRefStats } from "@/lib/nfl/data";')
    st = st.replace('export function buildNhlNightlyFeed(): NightlyFeed {', 'export function buildNflNightlyFeed(): NightlyFeed {\n  if (nflFeedCache) return nflFeedCache;\n  const assignments = getNflAssignments();\n  const stats = getNflRefStats();\n  const { isPreview } = resolveSlateGames(assignments);\n  return (nflFeedCache = { generatedAt: new Date().toISOString(), slateDate: assignments.date, league: "NFL", isPreview, assignmentsSource: assignments.source, statsSource: stats.meta.source, pageUrl: absoluteUrl("/nfl"), disclaimer: SYNDICATION_DISCLAIMER, signals: [] });\n}\nexport function buildNflSlateFeed(): NightlyFeed { return buildNflNightlyFeed(); }\nexport function buildNhlNightlyFeed(): NightlyFeed {')
    st = st.replace('league: "NBA" | "NHL",', 'league: "NBA" | "NHL" | "NFL",', 2)
    st = st.replace('const base = league === "NBA" ? "" : "/nhl";', 'const base = league === "NBA" ? "" : league === "NFL" ? "/nfl" : "/nhl";')
    sy.write_text(st)

og = R/'src/lib/og-slate.ts'; ot = og.read_text()
if 'nflOgContent' not in ot:
    ot = ot.replace('buildNhlNightlyFeed, topShareSignals', 'buildNflNightlyFeed, buildNhlNightlyFeed, topShareSignals')
    ot += '\nexport function nflOgContent() { return ogSlateContent(buildNflNightlyFeed()); }\n'
    og.write_text(ot)

(R/'data/nfl').mkdir(parents=True, exist_ok=True)
for n in ['ref-stats.json','ref-stats.seed.json']:
    s = R/'public/data/nfl'/n
    if s.exists(): shutil.copy2(s, R/'data/nfl'/n)

(R/'scripts/nfl').mkdir(exist_ok=True)
w('scripts/nfl/generate-seed.ts', "#!/usr/bin/env npx tsx\nimport * as fs from 'node:fs';\nimport * as path from 'node:path';\nconst d=path.join(process.cwd(),'data','nfl');\nfs.mkdirSync(d,{recursive:true});\nconst pub=path.join(process.cwd(),'public/data/nfl/ref-stats.seed.json');\nconst seed=path.join(d,'ref-stats.seed.json');\nif(fs.existsSync(pub))fs.copyFileSync(pub,seed);\nif(!fs.existsSync(seed)){console.error('missing seed');process.exit(1);}\nfs.copyFileSync(seed,path.join(d,'ref-stats.json'));\nconsole.log('NFL seed ready');\n")
w('scripts/nfl/build-ref-data.ts', "#!/usr/bin/env npx tsx\nimport * as fs from 'node:fs';\nimport * as path from 'node:path';\nconst d=path.join(process.cwd(),'data','nfl');\nfs.copyFileSync(path.join(d,'ref-stats.seed.json'),path.join(d,'ref-stats.json'));\nconsole.log('NFL build done');\n")

if not (R/'src/components/NflRefAnalyticsSection.tsx').exists():
    w('src/components/NflRefAnalyticsSection.tsx', (R/'src/components/NhlRefAnalyticsSection.tsx').read_text().replace('Nhl','Nfl').replace('nhl','nfl').replace('Minors','Flags').replace('minors','flags'))
w('src/components/icons/LeagueMarkNFL.tsx', 'import type { SVGProps } from "react";\nexport function LeagueMarkNFL(props: SVGProps<SVGSVGElement>) { return <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}><ellipse cx="12" cy="12" rx="9.5" ry="5.8" stroke="currentColor" strokeWidth="1.8"/></svg>; }\n')

w('src/app/nfl/matrix/page.tsx', 'export default function Page(){return <div className="page-shell"><h1>NFL matrix (stub)</h1></div>;}\n')
w('src/app/nfl/crews/page.tsx', 'export default function Page(){return <div className="page-shell"><h1>NFL crews (stub)</h1></div>;}\n')

rp = R/'src/app/nfl/refs/[slug]/page.tsx'
if rp.exists():
    rt = rp.read_text().replace('NhlRefAnalyticsSection','NflRefAnalyticsSection').replace('nhlAnalytics','nflAnalytics').replace('sport="nhl"','sport="nfl"')
    rp.write_text(rt)

print('fix_runner complete')


# --- round 2 fixes ---
gs = R / "src/lib/global-stats.ts"
gs.write_text("""import type { RefStatsFile } from "@/lib/types";

declare global {
  var __REFWATCH_NBA_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NHL_REF_STATS__: RefStatsFile | undefined;
  var __REFWATCH_NFL_REF_STATS__: RefStatsFile | undefined;
}

export type NbaStatsGlobalKey = "__REFWATCH_NBA_REF_STATS__";
export type NflStatsGlobalKey = "__REFWATCH_NFL_REF_STATS__";
export type NhlStatsGlobalKey = "__REFWATCH_NHL_REF_STATS__";
""")

rp = R / "src/lib/ref-stats-preload.ts"
rt = rp.read_text().replace('type League = "nba" | "nhl" | "nfl" | "nfl";', 'type League = "nba" | "nhl" | "nfl";')
rt = rt.replace('import type { NbaStatsGlobalKey, NhlStatsGlobalKey } from "@/lib/global-stats";', 'import type { NbaStatsGlobalKey, NflStatsGlobalKey, NhlStatsGlobalKey } from "@/lib/global-stats";')
rp.write_text(rt)

tl = R / "src/components/TeamLogo.tsx"
lines = []
seen = set()
for ln in tl.read_text().splitlines():
    k = ln.strip()
    if k in seen and "nflTeamLogoUrl" in k:
        continue
    seen.add(k)
    lines.append(ln)
tl.write_text("\n".join(lines) + "\n")

sb = R / "scripts/lib/baselines.ts"
sb.write_text(sb.read_text().replace('league: "NBA" | "NHL",', 'league: "NBA" | "NHL" | "NFL",', 1))

sy = R / "src/lib/syndication.ts"
sy.write_text(sy.read_text().replace('league: "NBA" | "NHL",\n  games: number,', 'league: "NBA" | "NHL" | "NFL",\n  games: number,'))

(R / "src/app/nfl").mkdir(parents=True, exist_ok=True)
(R / "src/app/nfl/page.tsx").write_text("""import type { Metadata } from "next";
import { BrowseActionCards } from "@/components/BrowseActionCards";
import { DataFreshnessMeta } from "@/components/DataFreshnessMeta";
import { FindingsSection } from "@/components/FindingsSection";
import { JsonLd } from "@/components/JsonLd";
import { OffseasonSlateNotice } from "@/components/OffseasonSlateNotice";
import { MethodologyAccordion } from "@/components/MethodologyAccordion";
import { computeFindings, getAssignments, getRefStats } from "@/lib/nfl/data";
import { buildNflNightlyFeed, slateDatasetJsonLd, slateMetadataDescription } from "@/lib/syndication";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const assignments = getAssignments();
  const feed = buildNflNightlyFeed();
  const isOffseason = assignments.games.length === 0;
  const title = isOffseason ? "NFL ref data (offseason)" : "Tonight's NFL slate";
  const description = isOffseason ? "NFL ref analytics offseason." : slateMetadataDescription(feed);
  return { title, description, alternates: { canonical: absoluteUrl("/nfl") } };
}

export default function NflHomePage() {
  const assignments = getAssignments();
  const refStats = getRefStats();
  const findings = computeFindings();
  const isOffseason = assignments.games.length === 0;
  const feed = buildNflNightlyFeed();
  return (
    <div className="page-shell page-shell-slate">
      <JsonLd data={[{ "@context": "https://schema.org", "@type": "WebPage", name: "NFL ref data", url: absoluteUrl("/nfl") }, slateDatasetJsonLd(feed)]} />
      <section className="page-hero page-hero-slate">
        <h1 className="page-title">{isOffseason ? "NFL ref data" : "Tonight's NFL slate"}</h1>
        <DataFreshnessMeta assignments={assignments} refStats={refStats} league="NFL" />
      </section>
      {isOffseason && <OffseasonSlateNotice league="NFL" />}
      <FindingsSection findings={findings} featured slateHero league="NFL" title="Dataset findings" />
      <BrowseActionCards league="NFL" compact />
      <MethodologyAccordion><p className="text-sm text-zinc-600">Phase 1 historical NFL dataset.</p></MethodologyAccordion>
    </div>
  );
}
""")

for rel in ["src/components/RefRankingsTable.tsx", "src/lib/edge-summary.ts", "src/components/DataFreshnessMeta.tsx", "src/components/BrowseActionCards.tsx", "src/components/OffseasonSlateNotice.tsx", "src/components/FindingsSection.tsx", "src/components/FindingAccordion.tsx"]:
    p = R / rel
    if p.exists():
        p.write_text(p.read_text().replace('"NBA" | "NHL"', '"NBA" | "NHL" | "NFL"').replace('Sport = "nba" | "nhl"', 'Sport = "nba" | "nhl" | "nfl"'))

rslug = R / "src/app/nfl/refs/[slug]/page.tsx"
if rslug.exists():
    rt = rslug.read_text().replace("leagueAvgMinors", "leagueAvgFouls").replace("leagueOvertimeRate", "leagueAvgPenaltyYards")
    rt = rt.replace('sport: "nba" | "nhl"', 'sport: "nba" | "nhl" | "nfl"')
    rslug.write_text(rt)

print("round2 complete")
# round 3
bl = R / "src/lib/baselines.ts"
bt = bl.read_text()
if "  NFL: {" not in bt:
    bt = bt.replace(
        "  NHL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: {\n      season: \"all\",\n      gameCount: 0,\n      ...FALLBACK_NHL,\n    },\n    usingFallback: true,\n  },\n};",
        "  NHL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: {\n      season: \"all\",\n      gameCount: 0,\n      ...FALLBACK_NHL,\n    },\n    usingFallback: true,\n  },\n  NFL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: { season: \"all\", gameCount: 0, ...FALLBACK_NFL },\n    usingFallback: true,\n  },\n};",
        1,
    )
    bl.write_text(bt)

pg = R / "src/app/nfl/page.tsx"
if pg.exists():
    pg.write_text(pg.read_text().replace(
        "import { computeFindings, getAssignments, getRefStats } from \"@/lib/nfl/data\";",
        "import { getAssignments, getRefStats } from \"@/lib/nfl/data\";\nimport { computeFindings } from \"@/lib/nfl/findings\";",
    ))

for rel in ["src/components/RefAvatar.tsx", "src/components/ProComingSoonTease.tsx", "src/components/TeamCrewPage.tsx"]:
    fp = R / rel
    if fp.exists():
        fp.write_text(fp.read_text().replace('"nba" | "nhl"', '"nba" | "nhl" | "nfl"').replace('"NBA" | "NHL"', '"NBA" | "NHL" | "NFL"'))

# ensure nfl lib exists assertion
assert (R / "src/lib/nfl/data.ts").exists(), "nfl lib missing after bootstrap"
print("round3 ok")
# round 4 - overwrite broken bootstrap components
nhl = (R / "src/components/NhlRefAnalyticsSection.tsx").read_text()
sec = nhl.replace("Nhl", "Nfl").replace("nhl", "nfl").replace("Minors per game", "Flags per game").replace("avgMinorsPerGame", "avgFlagsPerGame").replace("minorsDelta", "flagsDelta").replace("leagueAvgMinors", "leagueAvgFouls").replace("overtimeRate", "avgPenaltyYardsPerGame").replace("overtimeGames", "avgFlagImbalance").replace("OT rate", "Penalty yards").replace("leagueOvertimeRate", "leagueAvgPenaltyYards").replace("avgMinorImbalance", "avgFlagImbalance").replace("±1 minor", "±1 flag")
(R / "src/components/NflRefAnalyticsSection.tsx").write_text(sec)
ty = R / "src/lib/types.ts"
tt = ty.read_text()
if "NflRefAnalytics" not in tt:
    block = "export interface NflRefAnalytics { avgFlagsPerGame: number; flagsDelta: number; avgPenaltyYardsPerGame: number; penaltyYardsDelta: number; avgFlagImbalance: number; balancedGameRate: number; balanceKind: \"balancer\" | \"asymmetric\" | \"neutral\"; provenance?: { avgFlagsPerGame: MetricProvenance; penaltyYards: MetricProvenance; penaltyBalance: MetricProvenance; flagsBaseline: MetricProvenance; sampleGate: SampleGateStatus; }; }\n\n"
    tt = tt.replace("export interface NhlTeamSpecialTeams {", block + "export interface NhlTeamSpecialTeams {")
    tt = tt.replace("nhlAnalytics?: NhlRefAnalytics;", "nhlAnalytics?: NhlRefAnalytics;\n  nflAnalytics?: NflRefAnalytics;")
    ty.write_text(tt)
print("round4 ok")
# round 5 final type fixes
bl = R / "src/lib/baselines.ts"
bt = bl.read_text()
if "FALLBACK_NFL" not in bt:
    bt = bt.replace("FALLBACK_NHL,\n} from", "FALLBACK_NHL,\n  FALLBACK_NFL,\n} from")
if "NFL: { ...FALLBACK_NFL }" not in bt:
    bt = bt.replace(
        "fallback: {\n    NBA: { ...FALLBACK_NBA },\n    NHL: { ...FALLBACK_NHL },\n  },",
        "fallback: {\n    NBA: { ...FALLBACK_NBA },\n    NHL: { ...FALLBACK_NHL },\n    NFL: { ...FALLBACK_NFL },\n  },",
    )
if "  NFL: {" not in bt.split("const EMPTY")[1][:800]:
    bt = bt.replace(
        "  NHL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: {\n      season: \"all\",\n      gameCount: 0,\n      ...FALLBACK_NHL,\n    },\n    usingFallback: true,\n  },\n};",
        "  NHL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: {\n      season: \"all\",\n      gameCount: 0,\n      ...FALLBACK_NHL,\n    },\n    usingFallback: true,\n  },\n  NFL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: { season: \"all\", gameCount: 0, ...FALLBACK_NFL },\n    usingFallback: true,\n  },\n};",
    )
bt = bt.replace('league: "NBA" | "NHL"', 'league: "NBA" | "NHL" | "NFL"', 3)
if "leagueAvgPenaltyYards?: number;" not in bt.split("ResolvedBaseline")[0]:
    bt = bt.replace("leagueOvertimeRate?: number;\n  source:", "leagueOvertimeRate?: number;\n  leagueAvgPenaltyYards?: number;\n  source:")
if "leagueAvgPenaltyYards: baseline" not in bt:
    bt = bt.replace("leagueOvertimeRate: baseline.leagueOvertimeRate,\n    source,", "leagueOvertimeRate: baseline.leagueOvertimeRate,\n    leagueAvgPenaltyYards: baseline.leagueAvgPenaltyYards,\n    source,")
bl.write_text(bt)

sec = """import { TermHelp } from \"@/components/TermHelp\";
import { RefDashboardStatCell, RefDashboardStatGrid } from \"@/components/RefDashboardStatGrid\";
import { formatPct } from \"@/lib/nfl/data\";
import { formatSigned } from \"@/lib/stats-utils\";
import type { NflRefAnalytics } from \"@/lib/types\";

export function NflRefAnalyticsSection({ analytics, leagueAvgFouls, leagueAvgPenaltyYards, showMetrics = true }: { analytics: NflRefAnalytics; leagueAvgFouls?: number; leagueAvgPenaltyYards?: number; showMetrics?: boolean }) {
  const lf = leagueAvgFouls ?? 13;
  const ly = leagueAvgPenaltyYards ?? 95;
  const prov = analytics.provenance;
  return (
    <section className=\"data-card\">
      <div className=\"ref-table-section-header\"><h2 className=\"text-sm font-semibold text-zinc-800\"><TermHelp id=\"nhl-ref-analytics\">Whistle analytics</TermHelp></h2></div>
      {!showMetrics ? <p className=\"px-4 py-6 text-sm text-zinc-600\">Sample gate not cleared.</p> : (
        <div className=\"px-4 py-4 sm:px-5\"><RefDashboardStatGrid>
          <RefDashboardStatCell label=\"Flags per game\" value={String(analytics.avgFlagsPerGame)} detail={`${formatSigned(analytics.flagsDelta)} vs ${lf}`} provenance={prov?.avgFlagsPerGame} />
          <RefDashboardStatCell label=\"Penalty yards\" value={String(analytics.avgPenaltyYardsPerGame)} detail={`${formatSigned(analytics.penaltyYardsDelta)} vs ${ly}`} provenance={prov?.penaltyYards} />
          <RefDashboardStatCell label=\"Balance\" value={analytics.balanceKind} detail={formatPct(analytics.balancedGameRate)} provenance={prov?.penaltyBalance} />
        </RefDashboardStatGrid></div>
      )}
    </section>
  );
}
"""
(R / "src/components/NflRefAnalyticsSection.tsx").write_text(sec)

for rel in ["src/components/RefAvatar.tsx", "src/components/TeamCrewPage.tsx", "src/components/TeamLogo.tsx"]:
    fp = R / rel
    if fp.exists():
        fp.write_text(fp.read_text().replace('sport: "nba" | "nhl"', 'sport: "nba" | "nhl" | "nfl"').replace('sport?: "nba" | "nhl"', 'sport?: "nba" | "nhl" | "nfl"'))

rslug = R / "src/app/nfl/refs/[slug]/page.tsx"
if rslug.exists():
    rt = rslug.read_text().replace('sport="nhl"', 'sport="nfl"').replace("leagueAvgMinors", "leagueAvgFouls").replace("leagueOvertimeRate", "leagueAvgPenaltyYards")
    rslug.write_text(rt)

print("round5 ok")
# round 6
for rel in ["src/components/FavoritesStar.tsx", "src/components/TeamInsightCards.tsx"]:
    fp = R / rel
    if fp.exists():
        fp.write_text(fp.read_text().replace('"nba" | "nhl"', '"nba" | "nhl" | "nfl"'))

bl = R / "src/lib/baselines.ts"
bt = bl.read_text()
if "  NFL: {" not in bt.split("const EMPTY")[1].split("function readBaselines")[0]:
    bt = bt.replace(
        "    usingFallback: true,\n  },\n};\n\nfunction readBaselines",
        "    usingFallback: true,\n  },\n  NFL: {\n    currentSeason: null,\n    seasons: {},\n    aggregate: { season: \"all\", gameCount: 0, ...FALLBACK_NFL },\n    usingFallback: true,\n  },\n};\n\nfunction readBaselines",
        1,
    )
    if "FALLBACK_NFL" not in bt:
        bt = bt.replace("FALLBACK_NHL,\n} from", "FALLBACK_NHL,\n  FALLBACK_NFL,\n} from")
    if "NFL: { ...FALLBACK_NFL }" not in bt:
        bt = bt.replace("NHL: { ...FALLBACK_NHL },\n  },", "NHL: { ...FALLBACK_NHL },\n    NFL: { ...FALLBACK_NFL },\n  },")
    bl.write_text(bt)

(R / ".next/types").mkdir(parents=True, exist_ok=True)
(R / ".next/types/cache-life.d.ts").write_text("export {}\n")
print("round6 ok")
# round 7 - rewrite EMPTY baselines block cleanly
bl = R / "src/lib/baselines.ts"
bt = bl.read_text()
if "FALLBACK_NFL" not in bt:
    bt = bt.replace("FALLBACK_NHL,\n} from", "FALLBACK_NHL,\n  FALLBACK_NFL,\n} from")
empty = """const EMPTY: BaselinesFile = {
  generatedAt: \"\",
  fallback: {
    NBA: { ...FALLBACK_NBA },
    NHL: { ...FALLBACK_NHL },
    NFL: { ...FALLBACK_NFL },
  },
  NBA: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: \"all\", gameCount: 0, ...FALLBACK_NBA },
    usingFallback: true,
  },
  NHL: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: \"all\", gameCount: 0, ...FALLBACK_NHL },
    usingFallback: true,
  },
  NFL: {
    currentSeason: null,
    seasons: {},
    aggregate: { season: "all", gameCount: 0, ...FALLBACK_NFL },
    usingFallback: true,
  },
};"""
bt = re.sub(r"const EMPTY: BaselinesFile = \{[\s\S]*?\};\n\nfunction readBaselines", empty + "\n\nfunction readBaselines", bt, count=1)
bl.write_text(bt)
print("round7 ok")






import subprocess
subprocess.run(["npm", "run", "generate-nfl-seed"], cwd=R, check=False)
tc = subprocess.run(["npm", "run", "typecheck"], cwd=R, capture_output=True, text=True)
print(tc.stdout[-8000:])
print(tc.stderr[-2000:] if tc.stderr else "")
print("TYPECHECK_EXIT", tc.returncode)
