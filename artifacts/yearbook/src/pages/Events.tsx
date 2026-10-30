import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useListEvents } from "@workspace/api-client-react";

type EventItem = {
  id: string | number;
  title: string;
  description?: string | null;
  event_date: string;
  location?: string | null;
};

type EventDraft = {
  title: string;
  description: string;
  event_date: string;
  location: string;
};

const EMPTY_DRAFT: EventDraft = {
  title: "",
  description: "",
  event_date: "",
  location: "",
};

function getStatus(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "unknown";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  return day >= today ? "upcoming" : "past";
}

export default function Events() {
  const { data, isLoading, isError } = useListEvents();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [notice, setNotice] = useState("");

  const events = useMemo(() => {
    const items = Array.isArray(data) ? (data as EventItem[]) : [];

    return [...items]
      .filter((event) => {
        const matchesSearch = [
          event.title,
          event.description ?? "",
          event.location ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

        const status = getStatus(event.event_date);
        const matchesFilter =
          filter === "all" ||
          (filter === "upcoming" && status === "upcoming") ||
          (filter === "past" && status === "past");

        return matchesSearch && matchesFilter;
      })
      .sort(
        (a, b) =>
          new Date(a.event_date).getTime() -
          new Date(b.event_date).getTime(),
      );
  }, [data, search, filter]);

  const allEvents = Array.isArray(data) ? (data as EventItem[]) : [];
  const upcomingCount = allEvents.filter(
    (event) => getStatus(event.event_date) === "upcoming",
  ).length;
  const pastCount = allEvents.filter(
    (event) => getStatus(event.event_date) === "past",
  ).length;

  function updateDraft(
    field: keyof EventDraft,
    value: string,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // TODO: Gọi API tạo sự kiện của backend tại đây.
    // Hiện tại chưa lưu vào cơ sở dữ liệu.
    setNotice(
      "Form hợp lệ. Cần kết nối API tạo sự kiện để lưu dữ liệu.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays size={17} />
            Không gian lớp học
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Quản lý sự kiện
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tạo và quản lý những dịp đáng nhớ của lớp.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDraft(EMPTY_DRAFT);
            setNotice("");
            setShowForm(true);
          }}
          className="rainbow-button inline-flex items-center justify-center gap-2 px-5 py-3 font-bold"
        >
          <Plus size={18} />
          Tạo sự kiện
        </button>
      </header>

      
<section className="grid gap-4 sm:grid-cols-3">
  {[
    { label: "Tổng sự kiện", value: allEvents.length },
    { label: "Sắp diễn ra", value: upcomingCount },
    { label: "Đã diễn ra", value: pastCount },
  ].map((item) => (
    <div
      key={item.label}
      className="rainbow-card relative overflow-hidden p-5"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background:
            item.label === "Tổng sự kiện"
              ? "linear-gradient(90deg, #FF4D4D, #FF9800)"
              : item.label === "Sắp diễn ra"
                ? "linear-gradient(90deg, #FFD600, #4CAF50)"
                : "linear-gradient(90deg, #2196F3, #9C27B0)",
        }}
      />
      <p className="text-sm text-muted-foreground">
        {item.label}
      </p>
      <p className="mt-2 text-3xl font-bold">{item.value}</p>
    </div>
  ))}
</section>


      <section className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên hoặc địa điểm sự kiện..."
              className="w-full rounded-xl border-2 border-[#D6D8E6] bg-white py-3 pl-10 pr-4 text-[#1E1E1E] outline-none transition focus:border-[#2196F3] focus:ring-2 focus:ring-[#2196F3]/20"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-xl border bg-background px-4 py-3"
          >
            <option value="all">Tất cả sự kiện</option>
            <option value="upcoming">Sắp diễn ra</option>
            <option value="past">Đã diễn ra</option>
          </select>
        </div>

        {isLoading && (
          <p className="py-12 text-center text-muted-foreground">
            Đang tải sự kiện...
          </p>
        )}

        {isError && (
          <p className="rounded-xl border border-red-200 p-4 text-red-600">
            Không tải được danh sách sự kiện. B hãy kiểm tra API.
          </p>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="rounded-2xl border border-dashed p-12 text-center">
            <CalendarDays
              size={40}
              className="mx-auto mb-4 text-muted-foreground"
            />
            <h2 className="text-lg font-semibold">
              Chưa tìm thấy sự kiện
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Thử đổi bộ lọc hoặc tạo sự kiện mới cho lớp.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => {
            const upcoming = getStatus(event.event_date) === "upcoming";
            const date = new Date(event.event_date);

            return (
              <article
                key={event.id}
                className="overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
              >
                <div className="flex gap-4 p-5">
                  <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="text-xs font-semibold uppercase">
                      {Number.isNaN(date.getTime())
                        ? "--"
                        : date.toLocaleDateString("vi-VN", {
                            month: "short",
                          })}
                    </span>
                    <span className="text-3xl font-bold">
                      {Number.isNaN(date.getTime())
                        ? "--"
                        : date.getDate()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          upcoming
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {upcoming ? "Sắp diễn ra" : "Đã diễn ra"}
                      </span>
                    </div>
                    <h2 className="break-words text-lg font-semibold">
                      {event.title}
                    </h2>
                    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock3 size={15} />
                      {Number.isNaN(date.getTime())
                        ? "Chưa có ngày"
                        : date.toLocaleString("vi-VN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                    </p>
                    {event.location && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin size={15} />
                        {event.location}
                      </p>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="border-t px-5 py-4 text-sm text-muted-foreground">
                    {event.description}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-form-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-background p-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 id="event-form-title" className="text-xl font-bold">
                  Tạo sự kiện mới
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Điền thông tin cho sự kiện của lớp.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 hover:bg-muted"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  Tên sự kiện *
                </span>
                <input
                  required
                  maxLength={150}
                  value={draft.title}
                  onChange={(e) => updateDraft("title", e.target.value)}
                  placeholder="Ví dụ: Họp lớp cuối năm"
                  className="w-full rounded-xl border bg-background px-4 py-3"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">
                  Ngày và giờ *
                </span>
                <input
                  required
                  type="datetime-local"
                  value={draft.event_date}
                  onChange={(e) =>
                    updateDraft("event_date", e.target.value)
                  }
                  className="w-full rounded-xl border bg-background px-4 py-3"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Địa điểm</span>
                <input
                  value={draft.location}
                  onChange={(e) =>
                    updateDraft("location", e.target.value)
                  }
                  placeholder="Địa điểm tổ chức"
                  className="w-full rounded-xl border bg-background px-4 py-3"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Mô tả</span>
                <textarea
                  rows={4}
                  value={draft.description}
                  onChange={(e) =>
                    updateDraft("description", e.target.value)
                  }
                  placeholder="Nội dung và thông tin cần biết..."
                  className="w-full resize-y rounded-xl border bg-background px-4 py-3"
                />
              </label>

              {notice && (
                <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  {notice}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border px-4 py-2.5"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-5 py-2.5 font-medium text-primary-foreground"
                >
                  Kiểm tra thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
