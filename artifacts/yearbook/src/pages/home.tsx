import { useEffect, useState } from "react";
import {
  useGetStats,
  useListStudents,
  useListMemories,
  useListEvents,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Heart,
  Image as ImageIcon,
  Users,
  BookOpen,
  Plus,
  Search,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const BASE = import.meta.env.BASE_URL;

type YearbookItem = {
  id?: string | number;
  slug: string;
  class_name?: string;
  school_name?: string;
  academic_year?: string;
  cover_url?: string | null;
  cover_image?: string | null;
  photo_url?: string | null;
  member_count?: number;
  student_count?: number;
  role?: string;
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

function SectionHeading({
  title,
  description,
  href,
  linkLabel = "Xem tất cả",
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:text-sm"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  icon: Icon,
}: {
  value: number;
  label: string;
  icon: typeof Users;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-card p-3 sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight sm:text-2xl">
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function YearbookCard({ item }: { item: YearbookItem }) {
  const title = item.class_name || "Kỷ yếu của tôi";
  const school = item.school_name || "Chưa cập nhật trường học";
  const year = item.academic_year || "";
  const cover = item.cover_url || item.cover_image || item.photo_url;
  const memberCount = item.member_count ?? item.student_count;

  return (
    <Link
      href={`/yearbook/${item.slug}`}
      className="group block min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative h-32 overflow-hidden bg-muted sm:h-36">
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-muted to-primary/10">
            <BookOpen className="h-10 w-10 text-primary/60" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-8">
          <p className="truncate text-sm font-bold text-white">{title}</p>
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-semibold">{school}</p>
        {year && (
          <p className="mt-1 text-xs text-muted-foreground">{year}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {typeof memberCount === "number" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
              <Users className="h-3 w-3" />
              {memberCount} thành viên
            </span>
          )}
          {item.role && (
            <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
              {item.role === "owner" ? "Chủ sở hữu" : "Thành viên"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: students, isLoading: studentsLoading } = useListStudents();
  const { data: memories, isLoading: memoriesLoading } = useListMemories();
  const { data: events, isLoading: eventsLoading } = useListEvents();

  const [yearbooks, setYearbooks] = useState<YearbookItem[]>([]);
  const [yearbooksLoading, setYearbooksLoading] = useState(true);
  const [yearbooksError, setYearbooksError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadYearbooks() {
      setYearbooksLoading(true);
      setYearbooksError(false);

      try {
        const response = await fetch(`${BASE}api/yearbooks/mine`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Không tải được danh sách kỷ yếu");
        }

        const data = await response.json();
        const rows = Array.isArray(data)
          ? data
          : data.items || data.yearbooks || [];

        if (!cancelled) {
          setYearbooks(Array.isArray(rows) ? rows.slice(0, 6) : []);
        }
      } catch {
        if (!cancelled) {
          setYearbooksError(true);
        }
      } finally {
        if (!cancelled) {
          setYearbooksLoading(false);
        }
      }
    }

    void loadYearbooks();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredStudents = Array.isArray(students)
    ? students.slice(0, 4)
    : [];

  const latestMemories = Array.isArray(memories)
    ? memories.slice(0, 3)
    : [];

  const latestEvents = Array.isArray(events)
    ? events.slice(0, 3)
    : [];

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-[1400px] space-y-7 px-4 py-5 sm:px-6 sm:py-7">
        {/* Banner chào mừng */}
        <section className="relative min-h-[190px] sm:min-h-[230px] lg:min-h-[560px] overflow-hidden rounded-2xl border border-border/50 bg-muted ">
          <img src="/banner.jpeg"
            alt="Những kỷ niệm thời học sinh"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="relative z-10 flex min-h-[190px] max-w-2xl flex-col items-start justify-center p-5 text-white sm:min-h-[230px] sm:p-8"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Không gian lưu giữ thanh xuân
            </div>

            <h1 className="text-2xl font-bold leading-tight sm:text-4xl">
              Thanh xuân có bạn
              <br />
              là điều tuyệt vời nhất!
            </h1>

            <p className="mt-3 max-w-lg text-xs leading-5 text-white/85 sm:text-sm">
              Lưu giữ hình ảnh, câu chuyện và những khoảnh khắc đáng nhớ
              cùng bạn bè qua từng trang kỷ yếu.
            </p>

            <Link href="/yearbooks/mine" className="mt-5">
              <Button className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 sm:text-sm">
                Khám phá kỷ yếu
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </section>

        {/* Thống kê */}
        {!statsLoading && stats && (
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              value={stats.student_count}
              label="Thành viên"
              icon={Users}
            />
            <StatCard
              value={stats.photo_count}
              label="Bức ảnh"
              icon={ImageIcon}
            />
            <StatCard
              value={stats.memory_count}
              label="Kỷ niệm"
              icon={Heart}
            />
            <StatCard
              value={stats.event_count}
              label="Sự kiện"
              icon={Calendar}
            />
          </section>
        )}

        {statsLoading && (
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-[76px] rounded-xl" />
            ))}
          </section>
        )}

        {/* Kỷ yếu gần đây */}
        <section>
          <SectionHeading
            title="Kỷ yếu gần đây"
            description="Những không gian lưu giữ kỷ niệm của bạn."
            href="/yearbooks/mine"
          />

          {yearbooksLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-xl border border-border/60"
                >
                  <Skeleton className="h-32 rounded-none sm:h-36" />
                  <div className="space-y-3 p-3">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : yearbooks.length > 0 ? (
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.07 },
                },
              }}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {yearbooks.slice(0, 6).map((item, index) => (
                <motion.div key={item.id ?? item.slug ?? index} variants={fadeUp}>
                  <YearbookCard item={item} />
                </motion.div>
              ))}

              <Link
                href="/yearbooks/mine"
                className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-primary/40 bg-primary/[0.035] p-5 text-center transition-colors hover:bg-primary/[0.08]"
              >
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-primary/30 bg-card text-primary">
                  <Plus className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold">Xem tất cả kỷ yếu</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Quản lý hoặc tạo kỷ yếu mới
                </span>
              </Link>
            </motion.div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-card px-5 py-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-primary/70" />

              <h3 className="mt-3 font-semibold">
                {yearbooksError
                  ? "Chưa thể tải danh sách kỷ yếu"
                  : "Bắt đầu tạo kỷ yếu của bạn"}
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {yearbooksError
                  ? "Bạn có thể thử tải lại hoặc mở trang quản lý kỷ yếu."
                  : "Tạo một không gian riêng để lưu giữ ảnh, kỷ niệm và câu chuyện của lớp."}
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {yearbooksError && (
                  <Button
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tải lại
                  </Button>
                )}

                <Link href="/yearbooks/mine">
                  <Button className="rounded-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Đến trang kỷ yếu
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Hoạt động mới nhất */}
        <section>
          <SectionHeading
            title="Hoạt động mới nhất"
            description="Cùng nhìn lại những gì đang diễn ra trong cộng đồng."
            href="/feed"
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {/* Kỷ niệm */}
            <div className="min-w-0 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Kỷ niệm mới</h3>
                    <p className="text-xs text-muted-foreground">
                      Những câu chuyện đáng nhớ
                    </p>
                  </div>
                </div>

                <Link
                  href="/memories"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Xem thêm
                </Link>
              </div>

              <div className="space-y-3">
                {memoriesLoading ? (
                  [1, 2, 3].map((item) => (
                    <Skeleton key={item} className="h-[76px] rounded-lg" />
                  ))
                ) : latestMemories.length > 0 ? (
                  latestMemories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex min-w-0 gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30"
                    >
                      {memory.photo_url ? (
                        <img
                          src={memory.photo_url}
                          alt=""
                          loading="lazy"
                          className="h-[68px] w-[76px] shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-[68px] w-[76px] shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Heart className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className="line-clamp-1 text-sm font-semibold">
                          {memory.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {memory.content}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {memory.author}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-muted/30 px-4 py-7 text-center text-sm text-muted-foreground">
                    Chưa có kỷ niệm nào được chia sẻ.
                  </p>
                )}
              </div>
            </div>

            {/* Sự kiện */}
            <div className="min-w-0 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Dòng thời gian</h3>
                    <p className="text-xs text-muted-foreground">
                      Các cột mốc quan trọng
                    </p>
                  </div>
                </div>

                <Link
                  href="/events"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Xem thêm
                </Link>
              </div>

              <div className="relative space-y-3 before:absolute before:bottom-5 before:left-[15px] before:top-5 before:w-px before:bg-border">
                {eventsLoading ? (
                  [1, 2, 3].map((item) => (
                    <Skeleton
                      key={item}
                      className="ml-8 h-[70px] rounded-lg"
                    />
                  ))
                ) : latestEvents.length > 0 ? (
                  latestEvents.map((event) => (
                    <div key={event.id} className="relative flex gap-3">
                      <div className="relative z-10 mt-4 h-[9px] w-[9px] shrink-0 rounded-full bg-primary ring-4 ring-card" />

                      <div className="min-w-0 flex-1 rounded-lg border border-border/50 p-3">
                        <p className="text-[11px] font-medium text-primary">
                          {format(
                            new Date(event.event_date),
                            "dd/MM/yyyy",
                            { locale: vi },
                          )}
                        </p>
                        <h4 className="mt-1 line-clamp-1 text-sm font-semibold">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-muted/30 px-4 py-7 text-center text-sm text-muted-foreground">
                    Chưa có sự kiện nào được ghi lại.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bạn học */}
        <section>
          <SectionHeading
            title="Gương mặt thân quen"
            description="Những người bạn cùng lưu giữ kỷ niệm."
            href="/students"
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {studentsLoading ? (
              [1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-[170px] rounded-xl" />
              ))
            ) : featuredStudents.length > 0 ? (
              featuredStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="group overflow-hidden rounded-xl border border-border/70 bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  {student.photo_url ? (
                    <img
                      src={student.photo_url}
                      alt={student.name}
                      loading="lazy"
                      className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-border transition group-hover:ring-primary/40 sm:h-20 sm:w-20"
                    />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary sm:h-20 sm:w-20">
                      {student.name?.charAt(0) || "?"}
                    </div>
                  )}

                  <h3 className="mt-3 line-clamp-1 text-xs font-semibold sm:text-sm">
                    {student.name}
                  </h3>

                  <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                    {student.nickname || "Thành viên"}
                  </p>
                </Link>
              ))
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Chưa có dữ liệu bạn học.
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <Link href="/students">
              <Button variant="outline" className="rounded-lg text-xs">
                Xem danh sách bạn học
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* CTA cuối trang */}
        <section className="flex flex-col items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/30 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="text-base font-bold sm:text-lg">
              Cùng lưu giữ những năm tháng đẹp nhất
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Ảnh, kỷ niệm và những câu chuyện xứng đáng được lưu giữ.
            </p>
          </div>

          <Link href="/yearbooks/mine" className="shrink-0">
            <Button className="rounded-lg">
              <BookOpen className="mr-2 h-4 w-4" />
              Kỷ yếu của tôi
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
