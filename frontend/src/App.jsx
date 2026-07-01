import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, TrendingDown, Loader2, X,
  BarChart3, Percent, DollarSign, Building2,
  Zap, AlertCircle, ChevronRight,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_URL = "http://127.0.0.1:8000/api/screener/search";

const SECTOR_COLORS = {
  Banking:    "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  Finance:    "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20",
  IT:         "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
  Pharma:     "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",
  Healthcare: "bg-teal-500/10 text-teal-400 border-teal-500/20 hover:bg-teal-500/20",
  Auto:       "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
  FMCG:       "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/20",
  Energy:     "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20",
  Metal:      "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20",
  Infra:      "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
  Telecom:    "bg-pink-500/10 text-pink-400 border-pink-500/20 hover:bg-pink-500/20",
};

const EXAMPLE_QUERIES = [
  "undervalued banking stocks",
  "IT companies with high ROE",
  "top 5 pharma by revenue growth",
  "debt-free FMCG stocks",
  "dividend-paying energy stocks",
  "worst ROE across all sectors",
];

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = {
  price: (v) =>
    v != null
      ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : "—",
  // ROE comes from backend as decimal (0.15 = 15%) — multiply by 100
  roe: (v) => (v != null ? `${(v * 100).toFixed(2)}%` : "—"),
  pct: (v) => (v != null ? `${(v * 100).toFixed(2)}%` : "—"),
  pe: (v) => (v != null ? v.toFixed(2) : "—"),
  de: (v) => (v != null ? v.toFixed(2) : "—"),
  mcap: (v) =>
    v != null
      ? v >= 100
        ? `₹${(v / 100).toFixed(1)}B`
        : `₹${v.toFixed(0)}Cr`
      : "—",
  range: (lo, hi) =>
    lo && hi ? `₹${lo.toFixed(0)} – ₹${hi.toFixed(0)}` : "—",
};

// ─── Small reusables ──────────────────────────────────────────────────────────

function SectorBadge({ sector }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium gap-1 border",
        SECTOR_COLORS[sector] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
      )}
    >
      <Building2 size={9} />
      {sector}
    </Badge>
  );
}

function MetricRow({ icon: Icon, label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon size={11} />
        {label}
      </span>
      <span className={cn("text-xs font-mono font-medium text-foreground", valueClass)}>
        {value}
      </span>
    </div>
  );
}

// ─── Skeleton loader cards ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <Card className="border-border/50 bg-card/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-8 w-28" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ─── Stock card ───────────────────────────────────────────────────────────────

function StockCard({ stock, index, onSelect }) {
  const roePositive = stock.roe != null && stock.roe > 0;
  const growthPositive = stock.revenue_growth != null && stock.revenue_growth >= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.28, delay: index * 0.045, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
    >
      <Card
        className={cn(
          "group relative border-border/50 bg-card/60 backdrop-blur-sm cursor-pointer overflow-hidden",
          "hover:border-border hover:bg-card hover:shadow-lg hover:shadow-black/20",
          "transition-colors duration-200"
        )}
        onClick={() => onSelect(stock)}
      >
        {/* Top gradient line — the one visual signature on each card */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono text-muted-foreground tracking-wider">
                  {stock.ticker}
                </span>
                <SectorBadge sector={stock.sector} />
              </div>
              <CardTitle className="text-sm font-semibold leading-snug truncate">
                {stock.name}
              </CardTitle>
            </div>
            <ChevronRight
              size={14}
              className="text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0 mt-0.5"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price — hero number */}
          <div>
            <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {fmt.price(stock.price)}
            </div>
            <CardDescription className="text-xs mt-0.5">Current price (NSE)</CardDescription>
          </div>

          {/* Three key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BarChart3 size={9} /> P/E
              </p>
              <p className="text-sm font-mono font-medium text-foreground">
                {fmt.pe(stock.pe_ratio)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Percent size={9} /> ROE
              </p>
              {/* ROE multiplied by 100 here */}
              <p className={cn(
                "text-sm font-mono font-medium",
                roePositive ? "text-emerald-400" : "text-red-400"
              )}>
                {fmt.roe(stock.roe)}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <DollarSign size={9} /> MCap
              </p>
              <p className="text-sm font-mono font-medium text-foreground">
                {fmt.mcap(stock.market_cap_cr)}
              </p>
            </div>
          </div>

          {/* Revenue growth indicator */}
          {stock.revenue_growth != null && (
            <div className="flex items-center gap-1.5 text-xs">
              {growthPositive
                ? <TrendingUp size={11} className="text-emerald-400" />
                : <TrendingDown size={11} className="text-red-400" />
              }
              <span className={growthPositive ? "text-emerald-400" : "text-red-400"}>
                {fmt.pct(stock.revenue_growth)} revenue growth
              </span>
            </div>
          )}

          {/* Footer hint */}
          <div className="flex items-center justify-between pt-1 border-t border-border/30">
            <span className="text-xs text-muted-foreground/50">Tap for full details</span>
            <span className="text-xs font-mono text-muted-foreground/40">{stock.nse_symbol}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────

function DetailDialog({ stock, open, onClose }) {
  if (!stock) return null;

  const roePositive = stock.roe != null && stock.roe > 0;
  const growthPositive = stock.revenue_growth != null && stock.revenue_growth >= 0;
  const earningsPositive = stock.earnings_growth != null && stock.earnings_growth >= 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md border-border/60 bg-background/95 backdrop-blur-xl">
        {/* Accent line at top */}
        <div className="absolute inset-x-0 top-0 h-px rounded-t-lg bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-muted-foreground tracking-wider">
              {stock.ticker}
            </span>
            <SectorBadge sector={stock.sector} />
          </div>
          <DialogTitle className="text-lg font-semibold">{stock.name}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              {fmt.price(stock.price)}
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Metrics list */}
        <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-1 mt-2">
          <MetricRow icon={BarChart3}   label="P/E Ratio (TTM)"   value={fmt.pe(stock.pe_ratio)} />
          <MetricRow icon={BarChart3}   label="Forward P/E"       value={fmt.pe(stock.forward_pe)} />
          <MetricRow
            icon={Percent}
            label="Return on Equity"
            value={fmt.roe(stock.roe)}
            valueClass={roePositive ? "text-emerald-400" : "text-red-400"}
          />
          <MetricRow icon={DollarSign}  label="Market Cap"        value={fmt.mcap(stock.market_cap_cr)} />
          <MetricRow icon={BarChart3}   label="Debt / Equity"     value={fmt.de(stock.debt_to_equity)} />
          <MetricRow
            icon={TrendingUp}
            label="Revenue Growth"
            value={fmt.pct(stock.revenue_growth)}
            valueClass={growthPositive ? "text-emerald-400" : "text-red-400"}
          />
          <MetricRow
            icon={TrendingUp}
            label="Earnings Growth"
            value={fmt.pct(stock.earnings_growth)}
            valueClass={earningsPositive ? "text-emerald-400" : "text-red-400"}
          />
          <MetricRow icon={Percent}     label="Profit Margin"     value={fmt.pct(stock.profit_margin)} />
          <MetricRow icon={DollarSign}  label="Dividend Yield"    value={fmt.pct(stock.dividend_yield)} />
          <MetricRow
            icon={BarChart3}
            label="52-Week Range"
            value={fmt.range(stock.week_52_low, stock.week_52_high)}
          />
          {stock.beta != null && (
            <MetricRow icon={Zap}       label="Beta"              value={stock.beta?.toFixed(2)} />
          )}
          {stock.recommendation && (
            <MetricRow
              icon={TrendingUp}
              label="Analyst Rating"
              value={stock.recommendation.toUpperCase()}
              valueClass="text-primary"
            />
          )}
        </div>

        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={onClose}
        >
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Parsed filters bar ───────────────────────────────────────────────────────

function ParsedFiltersBar({ filters }) {
  if (!filters) return null;

const chips = [
  filters.sectors?.length && filters.sectors[0] !== "All" && `Sector: ${filters.sectors.join(", ")}`,
  filters.max_pe != null && `P/E ≤ ${filters.max_pe}`,
  filters.min_pe != null && `P/E ≥ ${filters.min_pe}`,
  filters.min_roe != null && `ROE ≥ ${(filters.min_roe * 100).toFixed(0)}%`,
  filters.max_debt_to_equity != null && `D/E ≤ ${filters.max_debt_to_equity}`,
  filters.min_revenue_growth != null && `Rev Growth ≥ ${(filters.min_revenue_growth * 100).toFixed(0)}%`,
  filters.sort_by && `Sort: ${filters.sort_by} ${filters.sort_order === "asc" ? "↑" : "↓"}`,
  filters.limit && `Limit: ${filters.limit}`,
].filter(Boolean);

  if (!chips.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs text-muted-foreground">AI parsed:</span>
      {chips.map((chip) => (
        <Badge
          key={chip}
          variant="outline"
          className="text-xs bg-primary/10 text-primary border-primary/20 font-normal"
        >
          {chip}
        </Badge>
      ))}
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [parsedFilters, setParsedFilters] = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [hasSearched, setHasSearched]   = useState(false);

  async function handleSearch(overrideQuery) {
    const q = (overrideQuery ?? query).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResults([]);
    setParsedFilters(null);
    setHasSearched(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results ?? []);
      setParsedFilters(data.parsed_filters ?? null);
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running on :8000?");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setQuery("");
      setResults([]);
      setParsedFilters(null);
      setHasSearched(false);
      setError(null);
    }
  }

  function handleExampleClick(q) {
    setQuery(q);
    handleSearch(q);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setParsedFilters(null);
    setHasSearched(false);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient gradient orbs — purely decorative, pointer-events off */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 sm:px-6">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-primary/25 bg-primary/8 text-primary text-xs font-medium mb-6">
            <Zap size={10} className="fill-current" />
            Gemini AI · NSE Universe · 100+ stocks
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-foreground mb-4">
            AI Stock{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
              Screener
            </span>
          </h1>

          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Ask in plain English. Get ranked results from Indian equities.
          </p>
        </motion.div>

        {/* ── Search bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="mb-6"
        >
          <div className="flex gap-2 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <Input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g. "undervalued banking stocks with high ROE"'
                disabled={loading}
                className="pl-10 pr-9 h-11 bg-card/60 border-border/60 focus:border-primary/60 focus:ring-primary/20 placeholder:text-muted-foreground/50"
              />
              {query && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <Button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="h-11 px-5 gap-2 bg-primary hover:bg-primary/90"
            >
              {loading
                ? <Loader2 size={14} className="animate-spin" />
                : <Search size={14} />
              }
              <span>{loading ? "Scanning…" : "Screen"}</span>
            </Button>
          </div>

          {/* Example query chips */}
          <AnimatePresence>
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.3 } }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap justify-center gap-2 mt-3"
              >
                {EXAMPLE_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleExampleClick(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border hover:bg-card/70 transition-all duration-150"
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Parsed filters bar ── */}
        {parsedFilters && !loading && (
          <div className="max-w-2xl mx-auto mb-5">
            <ParsedFiltersBar filters={parsedFilters} />
          </div>
        )}

        {/* ── Error state ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto mb-6"
            >
              <Card className="border-destructive/30 bg-destructive/8">
                <CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <AlertCircle size={15} className="text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Screener error</p>
                    <p className="text-xs text-destructive/70 mt-0.5">{error}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Loading skeletons ── */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Results ── */}
        <AnimatePresence mode="wait">
          {!loading && results.length > 0 && (
            <motion.div key="results">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between mb-4"
              >
                <p className="text-sm text-muted-foreground">
                  {results.length} {results.length === 1 ? "stock" : "stocks"} found
                </p>
                <p className="text-xs text-muted-foreground/50 hidden sm:block">
                  Click any card for full details
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((stock, i) => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    index={i}
                    onSelect={setSelectedStock}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Empty state ── */}
          {!loading && hasSearched && results.length === 0 && !error && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-foreground font-medium mb-1">No stocks matched</p>
              <p className="text-muted-foreground text-sm">
                Try loosening your criteria or a different sector
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Detail dialog ── */}
      <DetailDialog
        stock={selectedStock}
        open={!!selectedStock}
        onClose={() => setSelectedStock(null)}
      />
    </div>
  );
}
