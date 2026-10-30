
import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import {
  BookHeart, Home, Users, Heart, BookOpen, Trophy,
  ShoppingBag, Sparkles, Camera, Star, LoaderCircle,
  LockKeyhole, ArrowRight,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

type Yearbook = {
  id: number;
  slug: string;
  school_name: string;
  class_name: string;
  academic_year: string;
  description?: string | null;
  is_public?: boolean;
  cover_image?: string | null;
};

const menus = [
  { id: "home", label: "Trang chủ", icon: Home },
  { id: "members", label: "Thành viên", icon: Users },
  { id: "thanks", label: "Tường lời tri ân", icon: Heart },
  { id: "diary", label: "Nhật ký lớp", icon: BookOpen },
  { id: "awards", label: "Bảng vàng thành tích", icon: Trophy },
  { id: "shop", label: "Quà lưu niệm", icon: ShoppingBag },
  { id: "wishes", label: "Lời chúc theo dịp", icon: Sparkles },
];

export default function YearbookDetail() {
  const [, params] = useRoute("/yearbook/:slug");
  const [data, setData] = useState<Yearbook | null>(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState("home");

  useEffect(() => {
    if (!params?.slug) return;

    let cancelled = false;

    fetch(
      `${BASE}api/yearbooks/${encodeURIComponent(params.slug)}`,
      { credentials: "include" },
    )
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            json.detail || "Không tải được kỷ yếu.",
          );
        }
        return json;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [params?.slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf6ef] p-8 text-center">
        <h1 className="text-xl font-bold">Không mở được kỷ yếu</h1>
        <p className="mt-2 text-stone-600">{error}</p>
        <a href={`${BASE}yearbooks/mine`}
          className="mt-4 inline-block text-orange-600">
          Quay lại kỷ yếu của tôi
        </a>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#faf6ef]">
        <LoaderCircle className="mr-2 animate-spin" />
        Đang mở kỷ yếu...
      </div>
    );
  }

  const selected = menus.find((m) => m.id === active);
  const SelectedIcon = selected?.icon || Home;

  return (
    <main className="min-h-screen bg-[#faf6ef] p-3 text-[#432c22] sm:p-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white bg-[#fffdf8] shadow-xl">
        <header className="flex items-center gap-3 p-4 sm:px-7">
          <BookHeart className="h-8 w-8 text-[#df7057]" />
          <h1 className="font-serif text-xl font-bold">
            Kỷ yếu {data.class_name}
          </h1>
          <span className="ml-auto text-xs text-stone-500">
            {data.is_public
              ? "Kỷ yếu công khai"
              : "Riêng tư"}
          </span>
        </header>

        <section className="relative mx-3 flex min-h-64 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-[#e9cba7] to-[#f6cfc4] sm:min-h-80">
          {data.cover_image && (
            <img
              src={data.cover_image}
              alt="Ảnh bìa kỷ yếu"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 to-transparent" />
          <div className="relative p-6 text-white sm:p-10">
            <p className="mb-3 text-sm">Một miền ký ức</p>
            <h2 className="font-serif text-3xl font-bold sm:text-5xl">
              {data.class_name} — {data.school_name}
            </h2>
            <p className="mt-2 text-lg">
              Niên khóa {data.academic_year}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-6">
              {data.description ||
                "Thanh xuân có bạn, có chúng ta, có những tháng ngày không thể nào quên."}
            </p>
          </div>
        </section>

        <nav className="mx-3 mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-[#eee2d5] bg-white p-2">
          {menus.map((menu) => {
            const Icon = menu.icon;
            return (
              <button
                key={menu.id}
                onClick={() => setActive(menu.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-xs font-semibold sm:text-sm ${
                  active === menu.id
                    ? "bg-[#fff0e8] text-[#d9654f]"
                    : "text-stone-600 hover:bg-orange-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {menu.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-6 p-4 sm:p-7">
          {active === "home" ? (
            <>
              <section className="rounded-3xl border border-[#eee2d5] bg-gradient-to-br from-[#fff9f0] to-[#fff0e8] p-5 sm:p-7">
                <BookHeart className="mb-3 h-7 w-7 text-[#df7057]" />
                <h2 className="font-serif text-2xl font-bold sm:text-3xl">
                  Những năm tháng không quên
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  Lưu giữ những khoảnh khắc thanh xuân của chúng ta.
                </p>
                {data.cover_image && (
                  <img
                    src={data.cover_image}
                    alt="Khoảnh khắc của lớp"
                    className="mt-5 h-48 w-full rounded-2xl object-cover sm:h-64"
                  />
                )}
                <button
                  onClick={() => setActive("diary")}
                  className="mt-4 flex items-center gap-2 font-semibold text-[#d9654f]"
                >
                  Khám phá nhật ký lớp <ArrowRight className="h-4 w-4" />
                </button>
              </section>

              <h2 className="font-serif text-2xl font-bold">
                Dấu ấn của lớp
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Users, label: "Thành viên", value: "—" },
                  { icon: Camera, label: "Ảnh kỷ niệm", value: "—" },
                  { icon: Star, label: "Kỷ niệm", value: "—" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label}
                      className="flex items-center gap-4 rounded-2xl border border-[#eee2d5] bg-white p-5">
                      <Icon className="h-7 w-7 text-[#df7057]" />
                      <div>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <p className="text-sm text-stone-500">{stat.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <section className="rounded-3xl border border-[#eee2d5] bg-white px-5 py-12 text-center">
              <SelectedIcon className="mx-auto h-10 w-10 text-[#df7057]" />
              <h2 className="mt-4 font-serif text-2xl font-bold">
                {selected?.label}
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-500">
                {active === "thanks"
                  ? "Gửi lời cảm ơn đến thầy cô và bạn bè, có thể chọn ẩn danh hoặc công khai."
                  : active === "diary"
                    ? "Ghi lại những câu chuyện, chuyến đi và khoảnh khắc đáng nhớ của lớp."
                    : active === "awards"
                      ? "Tôn vinh thành tích và những dấu mốc đáng tự hào."
                      : active === "shop"
                        ? "Không gian dành cho những món quà lưu niệm của lớp."
                        : active === "wishes"
                          ? "Gửi lời chúc nhân ngày Nhà giáo Việt Nam, Tết, sinh nhật và dịp đặc biệt."
                          : "Danh sách các thành viên trong kỷ yếu."}
              </p>
              <p className="mt-4 text-xs text-stone-400">
                Phần này mới là giao diện; cần bổ sung API để lưu và hiển thị dữ liệu thật.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
