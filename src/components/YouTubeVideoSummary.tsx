import { CalendarDays, Clock3, Eye, UserRound } from "lucide-react";

interface YouTubeVideoSummaryProps {
  title: string;
  author: string;
  duration: string;
  thumbnail: string;
  publishedAt?: string | null;
  viewCount?: number | null;
}

interface MetadataRowProps {
  icon: typeof UserRound;
  label: string;
  value: string;
}

function formatDuration(seconds: string): string {
  const total = Number.parseInt(seconds, 10);
  if (!Number.isFinite(total) || total <= 0) return "暂无数据";

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatPublishedAt(value?: string | null): string {
  if (!value) return "暂无数据";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatViewCount(value?: number | null): string {
  if (!Number.isFinite(value) || !value || value < 0) return "暂无数据";
  return `${new Intl.NumberFormat("zh-CN").format(value)} 次观看`;
}

function MetadataRow({ icon: Icon, label, value }: MetadataRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
      <Icon className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" />
      <span className="shrink-0 text-gray-400 dark:text-gray-500">{label}</span>
      <span className="truncate font-medium text-gray-700 dark:text-gray-200">{value}</span>
    </div>
  );
}

export default function YouTubeVideoSummary({
  title,
  author,
  duration,
  thumbnail,
  publishedAt,
  viewCount,
}: YouTubeVideoSummaryProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex flex-col gap-4 p-3 sm:flex-row">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={title}
            className="aspect-video w-full shrink-0 rounded-md object-cover sm:h-32 sm:w-56"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-6 text-gray-900 dark:text-white">
            {title}
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MetadataRow icon={UserRound} label="频道" value={author || "暂无数据"} />
            <MetadataRow icon={CalendarDays} label="发布时间" value={formatPublishedAt(publishedAt)} />
            <MetadataRow icon={Clock3} label="时长" value={formatDuration(duration)} />
            <MetadataRow icon={Eye} label="播放量" value={formatViewCount(viewCount)} />
          </div>
        </div>
      </div>
    </section>
  );
}
