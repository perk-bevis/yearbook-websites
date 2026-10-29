
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import {
  ArrowUpRight,
  BookHeart,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Globe2,
  ImagePlus,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  LoaderCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BASE = import.meta.env.BASE_URL;

type Yearbook = {
  id: number | string;
  slug: string;
  school_name: string;
  class_name: string;
  academic_year: string;
  description?: string | null;
  is_public?: boolean;
  member_count?: number;
  role?: string;
  cover_image?: string | null;
};

const roles: Record<string, string> = {
  owner: 'Chủ sở hữu',
  admin: 'Quản trị viên',
  teacher: 'Giáo viên',
  member: 'Thành viên',
  student: 'Học sinh',
};

function YearbookCard({ item }: { item: Yearbook }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card transition-shadow hover:shadow-lg">
      <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/20 via-orange-100 to-rose-100 dark:from-primary/20 dark:via-muted dark:to-secondary">
        {item.cover_image ? (
          <img
            src={item.cover_image}
            alt={`Ảnh bìa ${item.class_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[24px] border-white/25" />
            <div className="absolute -bottom-14 -left-5 h-36 w-36 rounded-full bg-white/25" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-2xl font-extrabold text-primary shadow-sm">
              {item.class_name || 'KY'}
            </div>
          </>
        )}

        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-stone-700">
          {item.is_public ? (
            <Globe2 className="h-3 w-3" />
          ) : (
            <LockKeyhole className="h-3 w-3" />
          )}
          {item.is_public ? 'Công khai' : 'Riêng tư'}
        </span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="truncate text-base font-bold">
            {item.class_name}
            <span className="font-medium text-muted-foreground"> — </span>
            {item.school_name}
          </h3>

          <p className="mt-1 text-sm text-muted-foreground">
            Niên khóa {item.academic_year}
          </p>

          {item.description && (
            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <b className="text-foreground">{item.member_count ?? '—'}</b>
            thành viên
          </span>

          <span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Sparkles className="mr-1 inline h-3 w-3 text-primary" />
            {roles[item.role || ''] || 'Thành viên'}
          </span>
        </div>

        <Link
          href={`/yearbook/${item.slug}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Mở kỷ yếu
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function CreateDialog({
  close,
  created,
}: {
  close: () => void;
  created: (item: Yearbook) => void;
}) {
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [year, setYear] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [close]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch(`${BASE}api/yearbooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: school.trim(),
          class_name: className.trim(),
          academic_year: year.trim(),
          description: description.trim() || null,
          is_public: isPublic,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? 'Bạn cần đăng nhập để tạo kỷ yếu.'
            : data.detail || 'Chưa tạo được kỷ yếu. Vui lòng thử lại.',
        );
      }

      created(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-stone-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border bg-background shadow-2xl sm:rounded-3xl"
      >
        <div className="flex justify-between border-b border-border/70 px-5 py-5 sm:px-7">
          <div>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BookHeart className="h-5 w-5" />
            </div>
            <h2 id="create-title" className="text-xl font-bold">
              Tạo kỷ yếu mới
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Bắt đầu một không gian lưu giữ kỷ niệm của lớp bạn.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 px-5 py-6 sm:px-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="yb-class">Tên lớp *</Label>
              <Input
                id="yb-class"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ví dụ: 9A"
                required
                maxLength={40}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="yb-year">Niên khóa *</Label>
              <Input
                id="yb-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2016–2019"
                required
                maxLength={30}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yb-school">Tên trường *</Label>
            <Input
              id="yb-school"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="THCS Vũ Lăng"
              required
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="yb-description">
              Lời giới thiệu (không bắt buộc)
            </Label>
            <textarea
              id="yb-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Vài dòng giới thiệu về lớp..."
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-2xl border border-border p-4">
            <p className="mb-3 text-sm font-semibold">
              Ai có thể xem kỷ yếu?
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`rounded-xl border p-3 text-left ${
                  isPublic
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border'
                }`}
              >
                <div className="mb-2 flex justify-between">
                  <Globe2 className="h-5 w-5 text-primary" />
                  {isPublic && <Check className="h-4 w-4 text-primary" />}
                </div>
                <b className="text-sm">Công khai</b>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Mọi người có thể tìm và xem.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`rounded-xl border p-3 text-left ${
                  !isPublic
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border'
                }`}
              >
                <div className="mb-2 flex justify-between">
                  <LockKeyhole className="h-5 w-5 text-primary" />
                  {!isPublic && <Check className="h-4 w-4 text-primary" />}
                </div>
                <b className="text-sm">Riêng tư</b>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Giới hạn quyền xem theo thành viên.
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={close}
              disabled={busy}
            >
              Hủy
            </Button>

            <Button
              type="submit"
              className="rounded-xl"
              disabled={
                busy ||
                !className.trim() ||
                !school.trim() ||
                !year.trim()
              }
            >
              {busy ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo kỷ yếu
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function MyYearbooks() {
  const [items, setItems] = useState<Yearbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [location] = useLocation();

  async function load() {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BASE}api/yearbooks/mine`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? 'Vui lòng đăng nhập để xem kỷ yếu của bạn.'
            : 'Không tải được danh sách kỷ yếu. Vui lòng thử lại.',
        );
      }

      const data = await res.json();
      setItems(
        Array.isArray(data) ? data : data.items || data.yearbooks || [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi khi tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get('q') || '');
  }, [location]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const q = query.trim().toLocaleLowerCase('vi');

      const matchesQuery =
        !q ||
        [
          item.class_name,
          item.school_name,
          item.academic_year,
          item.slug,
        ].some((value) =>
          (value || '').toLocaleLowerCase('vi').includes(q),
        );

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'owner'
          ? !item.role || item.role === 'owner'
          : !!item.role && item.role !== 'owner');

      const matchesVisibility =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'public'
          ? item.is_public === true
          : item.is_public === false);

      return matchesQuery && matchesRole && matchesVisibility;
    });
  }, [items, query, roleFilter, visibilityFilter]);

  function created(item: Yearbook) {
    setShowCreate(false);
    window.location.href = `${BASE.replace(/\/$/, '')}/yearbook/${item.slug}`;
  }

  const owned = items.filter(
    (item) => !item.role || item.role === 'owner',
  ).length;

  const publicCount = items.filter((item) => item.is_public).length;

  return (
    <div className="min-h-[calc(100dvh-60px)] bg-background">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookHeart className="h-4 w-4 text-primary" />
              KHÔNG GIAN CỦA BẠN
            </div>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Kỷ yếu của tôi
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Quản lý các kỷ yếu bạn đã tạo hoặc tham gia.
            </p>
          </div>

          <Button
            onClick={() => setShowCreate(true)}
            className="h-10 shrink-0 rounded-xl px-4"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo kỷ yếu mới
          </Button>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<BookOpen className="h-5 w-5" />}
            value={loading ? '—' : items.length}
            label="Kỷ yếu tham gia"
          />
          <Stat
            icon={<Sparkles className="h-5 w-5" />}
            value={loading ? '—' : owned}
            label="Kỷ yếu bạn sở hữu"
          />
          <Stat
            icon={<Globe2 className="h-5 w-5" />}
            value={loading ? '—' : publicCount}
            label="Đang công khai"
          />
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">Danh sách kỷ yếu</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mở kỷ yếu để xem nội dung hoặc quản lý không gian của bạn.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative sm:min-w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm tên lớp, trường..."
                  className="h-10 rounded-xl bg-card pl-9"
                  aria-label="Tìm kỷ yếu"
                />
              </div>

              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Lọc theo vai trò"
                  className="h-10 w-full appearance-none rounded-xl border border-input bg-card py-2 pl-3 pr-9 text-sm sm:w-40"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="owner">Tôi sở hữu</option>
                  <option value="member">Tôi tham gia</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>

              <div className="relative">
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value)}
                  aria-label="Lọc theo quyền xem"
                  className="h-10 w-full appearance-none rounded-xl border border-input bg-card py-2 pl-3 pr-9 text-sm sm:w-40"
                >
                  <option value="all">Mọi chế độ</option>
                  <option value="public">Công khai</option>
                  <option value="private">Riêng tư</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <div className="h-36 animate-pulse bg-muted" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-8 animate-pulse rounded-lg bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
              <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
              <h3 className="mt-3 font-semibold">Không tải được kỷ yếu</h3>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                className="mt-4 rounded-xl"
                onClick={() => void load()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Thử lại
              </Button>
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <YearbookCard key={item.id} item={item} />
              ))}

              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/30 bg-primary/[0.035] p-6 text-center transition hover:border-primary/60 hover:bg-primary/[0.07]"
              >
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-background text-primary">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="font-semibold">Tạo kỷ yếu mới</span>
                <span className="mt-2 max-w-[220px] text-xs leading-5 text-muted-foreground">
                  Bắt đầu hành trình lưu giữ kỷ niệm của lớp bạn.
                </span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center">
              {items.length > 0 ? (
                <>
                  <Search className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">
                    Không tìm thấy kỷ yếu phù hợp
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Hãy thử từ khóa khác hoặc xóa bộ lọc.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4 rounded-xl"
                    onClick={() => {
                      setQuery('');
                      setRoleFilter('all');
                      setVisibilityFilter('all');
                    }}
                  >
                    Xóa bộ lọc
                  </Button>
                </>
              ) : (
                <>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <ImagePlus className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold">
                    Bạn chưa có kỷ yếu nào
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Tạo kỷ yếu cho lớp mình và mời bạn học cùng tham gia nhé.
                  </p>
                  <Button
                    className="mt-5 rounded-xl"
                    onClick={() => setShowCreate(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tạo kỷ yếu đầu tiên
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 text-sm text-muted-foreground">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            Chỉ thành viên có quyền phù hợp mới có thể xem nội dung kỷ yếu
            riêng tư. Bạn có thể đổi chế độ truy cập trong cài đặt của từng
            kỷ yếu.
          </p>
        </div>
      </div>

      {showCreate && (
        <CreateDialog
          close={() => setShowCreate(false)}
          created={created}
        />
      )}
    </div>
  );
}
