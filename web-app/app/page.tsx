"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { animate, motion } from "framer-motion";
import { getSupabaseClient } from "@/lib/supabase";

const TOPIC_TOTALS = [
  { topic: "Arrays & Hashing", total: 22 },
  { topic: "Two Pointers", total: 13 },
  { topic: "Sliding Window", total: 9 },
  { topic: "Stack", total: 14 },
  { topic: "Binary Search", total: 14 },
  { topic: "Linked List", total: 14 },
  { topic: "Trees", total: 23 },
  { topic: "Heap / Priority Queue", total: 12 },
  { topic: "Backtracking", total: 17 },
  { topic: "Tries", total: 4 },
  { topic: "Graphs", total: 21 },
  { topic: "Advanced Graphs", total: 10 },
  { topic: "1-D DP", total: 17 },
  { topic: "2-D DP", total: 16 },
  { topic: "Greedy", total: 14 },
  { topic: "Intervals", total: 7 },
  { topic: "Math & Geometry", total: 13 },
  { topic: "Bit Manipulation", total: 10 }
] as const;

const TOTAL_PROBLEMS = TOPIC_TOTALS.reduce((sum, item) => sum + item.total, 0);
const DEFAULT_PROGRESS = TOPIC_TOTALS.reduce<Record<string, number>>((acc, item) => {
  acc[item.topic] = 0;
  return acc;
}, {});

const normalizeTopicName = (topic: string) => topic.toLowerCase().replace(/[^a-z0-9]/g, "");

const TOPIC_ALIASES: Record<string, string> = {
  [normalizeTopicName("Arrays & Hashing")]: "Arrays & Hashing",
  [normalizeTopicName("Two Pointers")]: "Two Pointers",
  [normalizeTopicName("Sliding Window")]: "Sliding Window",
  [normalizeTopicName("Stack")]: "Stack",
  [normalizeTopicName("Binary Search")]: "Binary Search",
  [normalizeTopicName("Linked List")]: "Linked List",
  [normalizeTopicName("Trees")]: "Trees",
  [normalizeTopicName("Tries")]: "Tries",
  [normalizeTopicName("Backtracking")]: "Backtracking",
  [normalizeTopicName("Heap / Priority Queue")]: "Heap / Priority Queue",
  [normalizeTopicName("Heaps / Priority Queue")]: "Heap / Priority Queue",
  [normalizeTopicName("Heaps")]: "Heap / Priority Queue",
  [normalizeTopicName("Heap")]: "Heap / Priority Queue",
  [normalizeTopicName("Priority Queue")]: "Heap / Priority Queue",
  [normalizeTopicName("Graphs")]: "Graphs",
  [normalizeTopicName("Advanced Graphs")]: "Advanced Graphs",
  [normalizeTopicName("1-D DP")]: "1-D DP",
  [normalizeTopicName("1D-DP")]: "1-D DP",
  [normalizeTopicName("1D DP")]: "1-D DP",
  [normalizeTopicName("1-D Dynamic Programming")]: "1-D DP",
  [normalizeTopicName("2-D DP")]: "2-D DP",
  [normalizeTopicName("2D-DP")]: "2-D DP",
  [normalizeTopicName("2D DP")]: "2-D DP",
  [normalizeTopicName("2-D Dynamic Programming")]: "2-D DP",
  [normalizeTopicName("Greedy")]: "Greedy",
  [normalizeTopicName("Intervals")]: "Intervals",
  [normalizeTopicName("Math & Geometry")]: "Math & Geometry",
  [normalizeTopicName("Math")]: "Math & Geometry",
  [normalizeTopicName("Bit Manipulation")]: "Bit Manipulation"
};

type ProgressMap = Record<string, number>;

function normalizeProgress(rawProgress: unknown): ProgressMap {
  const normalized = { ...DEFAULT_PROGRESS };
  if (!rawProgress || typeof rawProgress !== "object") {
    return normalized;
  }

  for (const [key, value] of Object.entries(rawProgress as Record<string, unknown>)) {
    const canonical = TOPIC_ALIASES[normalizeTopicName(key)];
    if (!canonical) continue;

    const count = Number(value);
    if (!Number.isFinite(count)) continue;
    normalized[canonical] = Math.max(0, Math.floor(count));
  }

  return normalized;
}

async function fetchProgressByTag(userTag: string): Promise<ProgressMap | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("user_progress")
    .select("progress")
    .eq("user_tag", userTag)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.progress) return null;

  return normalizeProgress(data.progress);
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      }
    });

    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}

function TopicProgressRow({
  topic,
  solved,
  total,
  index
}: {
  topic: string;
  solved: number;
  total: number;
  index: number;
}) {
  const displaySolved = Math.max(0, solved);
  const percent = Math.min((displaySolved / total) * 100, 100);
  const delay = (TOPIC_TOTALS.length - index) * 0.03;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between text-sm">
        <p className="text-zinc-200">{topic}</p>
        <p className="font-medium text-emerald-300">
          <AnimatedCounter value={displaySolved} /> / {total}
        </p>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 progress-shimmer"
          style={{ width: `${percent}%` }}
        />
      </div>
    </motion.div>
  );
}

function ProgressCard({
  label,
  tag,
  progress,
  isHero,
  loading,
  notFound,
  children
}: {
  label: string;
  tag: string;
  progress: ProgressMap | null;
  isHero?: boolean;
  loading?: boolean;
  notFound?: boolean;
  children?: ReactNode;
}) {
  const solvedTotal = useMemo(() => {
    if (!progress) return 0;
    return TOPIC_TOTALS.reduce((sum, item) => sum + Math.max(0, progress[item.topic] ?? 0), 0);
  }, [progress]);

  const completionPercent = Math.round((solvedTotal / TOTAL_PROBLEMS) * 100);
  const gaugeDegrees = completionPercent * 3.6;

  return (
    <motion.section
      whileHover={{ scale: 1.05, boxShadow: "0 0 42px rgba(16, 185, 129, 0.26)" }}
      transition={{ duration: 0.25 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md ${
        isHero ? "glow-pulse" : "hover:border-emerald-400/40"
      }`}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{label}</p>
          <p className="text-xl font-semibold text-white">{tag || "Not set"}</p>
        </div>
        {children}
      </div>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
        </div>
      ) : null}

      {!loading && notFound ? (
        <div className="rounded-xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-200">
          User not found.
        </div>
      ) : null}

      {!loading && progress ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:justify-between">
            <div className="relative h-32 w-32">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#10b981 ${gaugeDegrees}deg, rgba(255,255,255,0.12) ${gaugeDegrees}deg 360deg)`
                }}
              />
              <div className="absolute inset-[10px] rounded-full bg-[#0a0a0a]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <p className="text-lg font-bold text-emerald-300">
                  <AnimatedCounter value={solvedTotal} />
                </p>
                <p className="text-xs text-zinc-400">/ {TOTAL_PROBLEMS}</p>
              </div>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-zinc-400">Total Completion</p>
              <p className="text-3xl font-bold text-emerald-300">
                <AnimatedCounter value={completionPercent} />%
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {TOPIC_TOTALS.map((item, index) => (
              <TopicProgressRow
                key={item.topic}
                topic={item.topic}
                solved={progress[item.topic] ?? 0}
                total={item.total}
                index={index}
              />
            ))}
          </div>
        </div>
      ) : null}
    </motion.section>
  );
}

export default function Home() {
  const [myTag, setMyTag] = useState("");
  const [myTagDraft, setMyTagDraft] = useState("");
  const [friendTag, setFriendTag] = useState("");
  const [activeFriendTag, setActiveFriendTag] = useState("");
  const [myProgress, setMyProgress] = useState<ProgressMap | null>(null);
  const [friendProgress, setFriendProgress] = useState<ProgressMap | null>(null);
  const [loadingMy, setLoadingMy] = useState(false);
  const [loadingFriend, setLoadingFriend] = useState(false);
  const [friendNotFound, setFriendNotFound] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [friendError, setFriendError] = useState("");

  useEffect(() => {
    const storedTag = window.localStorage.getItem("myTag")?.trim() ?? "";
    if (!storedTag) return;

    const frameId = window.requestAnimationFrame(() => {
      setMyTag(storedTag);
      setMyTagDraft(storedTag);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!myTag) return;
    let isCancelled = false;

    const loadMyProgress = async () => {
      setLoadingMy(true);
      try {
        const data = await fetchProgressByTag(myTag);
        if (!isCancelled) {
          setMyProgress(data);
        }
      } finally {
        if (!isCancelled) {
          setLoadingMy(false);
        }
      }
    };

    void loadMyProgress();

    return () => {
      isCancelled = true;
    };
  }, [myTag]);

  async function handleSaveMyTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTag = myTagDraft.trim();

    if (!trimmedTag) {
      window.localStorage.removeItem("myTag");
      setMyTag("");
      setMyProgress(null);
      setShowTagEditor(false);
      return;
    }

    window.localStorage.setItem("myTag", trimmedTag);
    setMyTag(trimmedTag);
    setShowTagEditor(false);
  }

  async function handleFriendSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTag = friendTag.trim();
    if (!trimmedTag) return;

    setActiveFriendTag(trimmedTag);
    setLoadingFriend(true);
    setFriendNotFound(false);
    setFriendError("");
    setFriendProgress(null);

    try {
      const data = await fetchProgressByTag(trimmedTag);
      if (!data) {
        setFriendNotFound(true);
        setFriendProgress(null);
        return;
      }
      setFriendProgress(data);
    } catch (error) {
      setFriendProgress(null);
      setFriendError(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setLoadingFriend(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-60 [background:radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.16),transparent_35%),radial-gradient(circle_at_85%_12%,rgba(16,185,129,0.08),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.08),transparent_30%)]" />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <header className="sticky top-0 z-20 mb-6 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">NeetCode Tracker</h1>
              <p className="text-sm text-zinc-400">Compare your grind against friends in real time.</p>
            </div>
            <form onSubmit={handleFriendSearch} className="flex w-full gap-2 lg:max-w-xl">
              <input
                value={friendTag}
                onChange={(event) => setFriendTag(event.target.value)}
                placeholder="Search friend's tag..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/60"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Search
              </button>
            </form>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          <ProgressCard
            label="My Tag · My Progress"
            tag={myTag}
            progress={myProgress}
            isHero
            loading={loadingMy}
          >
            <button
              type="button"
              onClick={() => setShowTagEditor((value) => !value)}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-xs text-zinc-200 transition hover:border-emerald-400/70 hover:text-emerald-300"
            >
              ⚙ Edit Tag
            </button>
          </ProgressCard>

          {(activeFriendTag || loadingFriend || friendError) && (
            <ProgressCard
              label="The Challenger · Friend Progress"
              tag={activeFriendTag}
              progress={friendProgress}
              loading={loadingFriend}
              notFound={friendNotFound}
            />
          )}
        </div>

        {showTagEditor && (
          <motion.form
            onSubmit={handleSaveMyTag}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
          >
            <label className="mb-2 block text-sm text-zinc-300">My Tag</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={myTagDraft}
                onChange={(event) => setMyTagDraft(event.target.value)}
                placeholder="Enter your user tag"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/60"
              />
              <button
                type="submit"
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                Save
              </button>
            </div>
          </motion.form>
        )}

        {friendError && (
          <div className="mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {friendError}
          </div>
        )}
      </main>
    </div>
  );
}
