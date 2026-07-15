import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────
   Interfaces
───────────────────────────────────────────── */
interface TeamScore {
  runs?: number;
  wickets?: number;
  overs?: number;
  balls?: number;
  isDeclared?: boolean;
  isFollowOn?: boolean;
  target?: number;
}

interface InningsScore {
  inningsId?: number;
  r?: number;
  w?: number;
  o?: number;
  balls?: number;
  isDeclared?: boolean;
  isFollowOn?: boolean;
  target?: number;
}

interface TeamMatchScore {
  inngs1?: InningsScore;
  inngs2?: InningsScore;
}

interface TeamInfo {
  id?: number;
  name?: string;
  shortName?: string;
  imageId?: number;
}

interface VenueInfo {
  id?: number;
  name?: string;
  city?: string;
  country?: string;
  timezone?: string;
  displayName?: string;
}

interface MatchInfo {
  matchId?: number;
  seriesId?: number;
  seriesName?: string;
  matchDesc?: string;
  matchFormat?: string;
  startDate?: number | string;
  endDate?: number | string;
  state?: string;
  status?: string;
  team1?: TeamInfo;
  team2?: TeamInfo;
  venueInfo?: VenueInfo;
  currBatTeamId?: number;
  seriesStartDt?: number;
  seriesEndDt?: number;
  isTimeAnnounced?: boolean;
  playingxi?: boolean;
}

interface MatchScore {
  team1Score?: TeamMatchScore;
  team2Score?: TeamMatchScore;
}

interface MatchItem {
  matchInfo?: MatchInfo;
  matchScore?: MatchScore;
}

interface MatchWrapper {
  match?: MatchItem;
  adDetail?: unknown;
}

interface HomeApiResponse {
  matches?: MatchWrapper[];
  responseLastUpdated?: number;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const imgUrl = (imageId?: number): string | null =>
  imageId
    ? `https://static.cricbuzz.com/a/img/v1/i1/c${imageId}/i.jpg`
    : null;

const fmtScore = (inn?: InningsScore): string => {
  if (!inn || inn.r === undefined) return "";
  let s = `${inn.r}`;
  if (inn.w !== undefined && inn.w < 10) s += `/${inn.w}`;
  if (inn.o !== undefined) s += ` (${inn.o})`;
  if (inn.isDeclared) s += " d";
  if (inn.isFollowOn) s += " f/o";
  return s;
};

const fmtOvers = (o?: number): string =>
  o !== undefined ? `${o} ov` : "";

const tsToDate = (ts?: number | string): string | null => {
  if (!ts) return null;
  try {
    const ms = typeof ts === "string" ? parseInt(ts, 10) : ts;
    return new Date(ms).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return null;
  }
};

const countdown = (ts?: number | string): string | null => {
  if (!ts) return null;
  try {
    const ms = typeof ts === "string" ? parseInt(ts, 10) : ts;
    const diff = ms - Date.now();
    if (diff <= 0) return "Starting soon";
    const d = Math.floor(diff / 86_400_000);
    const h = Math.floor((diff % 86_400_000) / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    if (d > 0) return `Starts in ${d}d ${h}h`;
    if (h > 0) return `Starts in ${h}h ${m}m`;
    return `Starts in ${m}m`;
  } catch {
    return null;
  }
};

/* ─────────────────────────────────────────────
   State Badge Config
───────────────────────────────────────────── */
interface BadgeCfg {
  bg: string;
  text: string;
  dot?: string;
  label: string;
}

const stateConfig = (state?: string): BadgeCfg => {
  const s = (state || "").toLowerCase();
  if (s.includes("progress") || s === "in progress")
    return {
      bg: "bg-emerald-100 dark:bg-emerald-900/40",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      label: "Live",
    };
  if (s.includes("preview") || s === "preview")
    return {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-700 dark:text-blue-300",
      label: "Upcoming",
    };
  if (s.includes("complete") || s === "complete")
    return {
      bg: "bg-gray-100 dark:bg-gray-800",
      text: "text-gray-600 dark:text-gray-400",
      label: "Completed",
    };
  if (s.includes("rain"))
    return {
      bg: "bg-orange-100 dark:bg-orange-900/40",
      text: "text-orange-700 dark:text-orange-300",
      label: "Rain",
    };
  if (s.includes("stump"))
    return {
      bg: "bg-purple-100 dark:bg-purple-900/40",
      text: "text-purple-700 dark:text-purple-300",
      label: "Stumps",
    };
  if (s.includes("draw"))
    return {
      bg: "bg-indigo-100 dark:bg-indigo-900/40",
      text: "text-indigo-700 dark:text-indigo-300",
      label: "Draw",
    };
  if (s.includes("cancel") || s.includes("abandon"))
    return {
      bg: "bg-red-100 dark:bg-red-900/40",
      text: "text-red-700 dark:text-red-300",
      label: "Cancelled",
    };
  if (s.includes("no result"))
    return {
      bg: "bg-slate-100 dark:bg-slate-800",
      text: "text-slate-600 dark:text-slate-400",
      label: "No Result",
    };
  if (s.includes("toss"))
    return {
      bg: "bg-cyan-100 dark:bg-cyan-900/40",
      text: "text-cyan-700 dark:text-cyan-300",
      label: "Toss",
    };
  return {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    label: state || "—",
  };
};

const isLive = (state?: string): boolean => {
  const s = (state || "").toLowerCase();
  return (
    s.includes("progress") ||
    s === "in progress" ||
    s.includes("rain") ||
    s.includes("stump") ||
    s.includes("toss") ||
    s.includes("lunch") ||
    s.includes("tea") ||
    s.includes("drinks")
  );
};

const isPreview = (state?: string): boolean =>
  (state || "").toLowerCase().includes("preview");

const isComplete = (state?: string): boolean =>
  (state || "").toLowerCase().includes("complete");

/* ─────────────────────────────────────────────
   Format Badge
───────────────────────────────────────────── */
const fmtBadgeCfg = (fmt?: string) => {
  const f = (fmt || "").toUpperCase();
  if (f === "TEST")
    return "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-100 dark:border-red-800";
  if (f === "ODI")
    return "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-blue-100 dark:border-blue-800";
  if (f.includes("T20") || f === "T20I")
    return "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-purple-100 dark:border-purple-800";
  return "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-100 dark:border-gray-700";
};

/* ─────────────────────────────────────────────
   Team Logo Component
───────────────────────────────────────────── */
const TeamLogo = React.memo(
  ({ imageId, name }: { imageId?: number; name?: string }) => {
    const [err, setErr] = useState(false);
    const url = imgUrl(imageId);
    const initials = (name || "?")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

    if (!url || err) {
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-black shadow-sm flex-shrink-0">
          {initials}
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || ""}
        onError={() => setErr(true)}
        className="w-12 h-12 rounded-full object-contain border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-0.5 shadow-sm flex-shrink-0"
      />
    );
  }
);
TeamLogo.displayName = "TeamLogo";

/* ─────────────────────────────────────────────
   Score Display Component
───────────────────────────────────────────── */
const ScoreDisplay = React.memo(
  ({
    teamScore,
    isBatting,
  }: {
    teamScore?: TeamMatchScore;
    isBatting?: boolean;
  }) => {
    const inn1 = teamScore?.inngs1;
    const inn2 = teamScore?.inngs2;

    if (!inn1 && !inn2) {
      return (
        <span className="text-xs text-gray-400 dark:text-gray-600 italic">
          Yet to bat
        </span>
      );
    }

    return (
      <div className="flex flex-col gap-0.5">
        {inn1 && (
          <span
            className={`font-bold text-sm ${
              isBatting && !inn2
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {fmtScore(inn1)}
          </span>
        )}
        {inn2 && (
          <span
            className={`font-bold text-sm ${
              isBatting
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-800 dark:text-gray-200"
            }`}
          >
            {fmtScore(inn2)}
          </span>
        )}
      </div>
    );
  }
);
ScoreDisplay.displayName = "ScoreDisplay";

/* ─────────────────────────────────────────────
   Skeleton Card
───────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
      <div className="h-5 w-12 bg-gray-100 dark:bg-gray-800 rounded-full" />
    </div>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-3 w-6 bg-gray-100 dark:bg-gray-800 rounded" />
      <div className="flex items-center gap-2">
        <div className="h-4 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
    <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded" />
  </div>
);

/* ─────────────────────────────────────────────
   Match Card
───────────────────────────────────────────── */
const MatchCard = React.memo(
  ({
    item,
    onClick,
  }: {
    item: MatchItem;
    onClick: () => void;
  }) => {
    const info = item.matchInfo;
    const score = item.matchScore;

    const state = info?.state;
    const badge = stateConfig(state);
    const live = isLive(state);
    const preview = isPreview(state);
    const complete = isComplete(state);

    const team1 = info?.team1;
    const team2 = info?.team2;
    const t1Score = score?.team1Score;
    const t2Score = score?.team2Score;
    const isBattingT1 = info?.currBatTeamId === team1?.id;
    const isBattingT2 = info?.currBatTeamId === team2?.id;

    const startTs = info?.startDate;
    const cd = preview ? countdown(startTs) : null;

    return (
      <button
        onClick={onClick}
        className="w-full text-left group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        {/* Top strip — series + format + state badge */}
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
              {info?.seriesName || "—"}
            </span>
            {info?.matchDesc && (
              <span className="text-xs text-gray-300 dark:text-gray-600 hidden sm:inline">
                ·
              </span>
            )}
            {info?.matchDesc && (
              <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline truncate max-w-[120px]">
                {info.matchDesc}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {info?.matchFormat && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${fmtBadgeCfg(
                  info.matchFormat
                )}`}
              >
                {info.matchFormat.toUpperCase()}
              </span>
            )}
            <span
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}
            >
              {live && badge.dot && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${badge.dot} animate-pulse`}
                />
              )}
              {badge.label}
            </span>
          </div>
        </div>

        {/* Teams + Scores */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            {/* Team 1 */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <TeamLogo imageId={team1?.imageId} name={team1?.shortName} />
              <div className="min-w-0">
                <div
                  className={`font-bold text-sm sm:text-base truncate ${
                    isBattingT1
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {team1?.shortName || team1?.name || "—"}
                  {isBattingT1 && (
                    <span className="ml-1 text-[10px] text-emerald-500">
                      ●
                    </span>
                  )}
                </div>
                <ScoreDisplay
                  teamScore={t1Score}
                  isBatting={isBattingT1}
                />
              </div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center flex-shrink-0">
              <span className="text-xs font-black text-gray-300 dark:text-gray-600">
                VS
              </span>
            </div>

            {/* Team 2 */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div
                  className={`font-bold text-sm sm:text-base truncate ${
                    isBattingT2
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-gray-800 dark:text-gray-200"
                  }`}
                >
                  {isBattingT2 && (
                    <span className="mr-1 text-[10px] text-emerald-500">
                      ●
                    </span>
                  )}
                  {team2?.shortName || team2?.name || "—"}
                </div>
                <div className="flex justify-end">
                  <ScoreDisplay
                    teamScore={t2Score}
                    isBatting={isBattingT2}
                  />
                </div>
              </div>
              <TeamLogo imageId={team2?.imageId} name={team2?.shortName} />
            </div>
          </div>
        </div>

        {/* Status / Result / Countdown strip */}
        <div
          className={`px-4 py-2 border-t border-gray-50 dark:border-gray-800 ${
            live
              ? "bg-emerald-50/60 dark:bg-emerald-900/10"
              : complete
              ? "bg-gray-50/60 dark:bg-gray-800/20"
              : preview
              ? "bg-blue-50/60 dark:bg-blue-900/10"
              : "bg-gray-50/30 dark:bg-gray-800/10"
          }`}
        >
          {info?.status ? (
            <p
              className={`text-xs font-medium leading-snug line-clamp-2 ${
                live
                  ? "text-emerald-700 dark:text-emerald-400"
                  : complete
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {info.status}
            </p>
          ) : cd ? (
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              🕐 {cd}
            </p>
          ) : null}

          {/* Venue */}
          {(info?.venueInfo?.name || info?.venueInfo?.city) && (
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5 truncate">
              📍{" "}
              {[info.venueInfo.name, info.venueInfo.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}

          {/* Start date */}
          {preview && startTs && (
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">
              🗓 {tsToDate(startTs)}
            </p>
          )}
        </div>

        {/* Hover accent bottom line */}
        <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300 rounded-b-2xl" />
      </button>
    );
  }
);
MatchCard.displayName = "MatchCard";

/* ─────────────────────────────────────────────
   Search Bar
───────────────────────────────────────────── */
const SearchBar = React.memo(
  ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="relative flex-1 max-w-xs">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm pointer-events-none">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search teams, series…"
        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-xs"
        >
          ✕
        </button>
      )}
    </div>
  )
);
SearchBar.displayName = "SearchBar";

/* ─────────────────────────────────────────────
   Filter Tab
───────────────────────────────────────────── */
type FilterType = "All" | "Live" | "Upcoming" | "Completed";
const FILTERS: FilterType[] = ["All", "Live", "Upcoming", "Completed"];

const FilterTab = React.memo(
  ({
    active,
    label,
    count,
    onClick,
  }: {
    active: boolean;
    label: FilterType;
    count: number;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700"
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            active
              ? "bg-white/20 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  )
);
FilterTab.displayName = "FilterTab";

/* ─────────────────────────────────────────────
   Main Home Page
───────────────────────────────────────────── */
export default function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [refreshing, setRefreshing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* toggle dark */
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  /* fetch */
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
    }
    try {
      const res = await fetch("/api/score/home", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }
      const json: HomeApiResponse = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load matches"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  /* auto-refresh every 30s */
  useEffect(() => {
    timerRef.current = setInterval(() => fetchData(true), 30_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData]);

  /* all matches */
  const allMatches: MatchItem[] = useMemo(
    () =>
      (data?.matches || [])
        .map((w) => w?.match)
        .filter((m): m is MatchItem => !!m && !!m.matchInfo),
    [data]
  );

  /* counts per filter */
  const counts = useMemo(() => {
    const c: Record<FilterType, number> = {
      All: allMatches.length,
      Live: 0,
      Upcoming: 0,
      Completed: 0,
    };
    allMatches.forEach((m) => {
      const s = m.matchInfo?.state || "";
      if (isLive(s)) c.Live++;
      else if (isPreview(s)) c.Upcoming++;
      else if (isComplete(s)) c.Completed++;
    });
    return c;
  }, [allMatches]);

  /* filtered + searched */
  const visible = useMemo(() => {
    let arr = allMatches;
    if (filter !== "All") {
      arr = arr.filter((m) => {
        const s = m.matchInfo?.state || "";
        if (filter === "Live") return isLive(s);
        if (filter === "Upcoming") return isPreview(s);
        if (filter === "Completed") return isComplete(s);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (m) =>
          m.matchInfo?.team1?.name?.toLowerCase().includes(q) ||
          m.matchInfo?.team1?.shortName?.toLowerCase().includes(q) ||
          m.matchInfo?.team2?.name?.toLowerCase().includes(q) ||
          m.matchInfo?.team2?.shortName?.toLowerCase().includes(q) ||
          m.matchInfo?.seriesName?.toLowerCase().includes(q) ||
          m.matchInfo?.matchDesc?.toLowerCase().includes(q) ||
          m.matchInfo?.venueInfo?.city?.toLowerCase().includes(q)
      );
    }
    return arr;
  }, [allMatches, filter, search]);

  /* navigate to scorecard */
  const handleCardClick = useCallback(
    (matchId?: number) => {
      if (!matchId) return;
      navigate(`/live-score/${matchId}`);
    },
    [navigate]
  );

  /* live count for header pulse */
  const liveCount = counts.Live;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
      {/* ─── App Bar ─── */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        {/* Green top stripe */}
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 h-1" />

        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              🏏
            </div>
            <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight hidden sm:block">
              Cricket
              <span className="text-emerald-600">Live</span>
            </span>
          </div>

          {/* Live pulse */}
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {liveCount} Live
              </span>
            </div>
          )}

          {/* Search */}
          <div className="flex-1 min-w-0">
            <SearchBar value={search} onChange={setSearch} />
          </div>

          {/* Last updated */}
          {lastUpdated && (
            <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0 hidden md:block">
              {lastUpdated.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all disabled:opacity-50"
            aria-label="Refresh"
          >
            <span
              className={`text-sm ${refreshing ? "animate-spin" : ""}`}
            >
              🔄
            </span>
          </button>

          {/* Dark mode */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-5xl mx-auto px-3 sm:px-4 pb-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <FilterTab
              key={f}
              label={f}
              active={filter === f}
              count={counts[f]}
              onClick={() => setFilter(f)}
            />
          ))}
        </div>
      </header>

      {/* ─── Main ─── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4">
        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-5xl">🚨</div>
            <div className="text-center">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Failed to load matches
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                {error}
              </p>
              <button
                onClick={() => fetchData(false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-5xl">🏏</div>
            <div className="text-center">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {search
                  ? `No matches found for "${search}"`
                  : filter !== "All"
                  ? `No ${filter.toLowerCase()} matches right now`
                  : "No matches available"}
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-600">
                {search
                  ? "Try a different search term"
                  : "Check back soon!"}
              </p>
            </div>
            {(search || filter !== "All") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("All");
                }}
                className="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mt-1"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Cards grid */}
        {!loading && !error && visible.length > 0 && (
          <>
            {/* result count */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400 dark:text-gray-600">
                {visible.length} match{visible.length !== 1 ? "es" : ""}
                {filter !== "All" ? ` · ${filter}` : ""}
                {search ? ` · "${search}"` : ""}
              </p>
              {refreshing && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                  Refreshing…
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visible.map((match, i) => (
                <MatchCard
                  key={match?.matchInfo?.matchId ?? i}
                  item={match}
                  onClick={() =>
                    handleCardClick(match?.matchInfo?.matchId)
                  }
                />
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        {!loading && (data || error) && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[10px] text-gray-400 dark:text-gray-700 pb-4">
            <span>
              {lastUpdated
                ? `Last updated: ${lastUpdated.toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}`
                : ""}
            </span>
            {data?.responseLastUpdated && (
              <span>
                API timestamp: {tsToDate(data.responseLastUpdated)}
              </span>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
