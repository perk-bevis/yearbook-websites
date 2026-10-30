
import { useState } from "react";
import {
  Lightbulb,
  Send,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

export default function FeatureRequests() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("experience");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // TODO: Gọi API gửi đề xuất khi backend đã có endpoint.
    setNotice(
      "Thông tin đã được kiểm tra trên giao diện. Chưa lưu vào máy chủ vì chưa kết nối API.",
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-5 md:p-8">
      <header className="relative overflow-hidden rounded-3xl border bg-card p-6 md:p-10">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
            <Sparkles size={16} />
            Cùng nhau phát triển
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Đề xuất tính năng
          </h1>

          <p className="mt-4 leading-7 text-muted-foreground">
            B có ý tưởng nào giúp việc lưu giữ kỷ niệm,
            kết nối bạn bè và quản lý lớp tốt hơn không?
            Hãy chia sẻ với chúng mình nhé!
          </p>
        </div>

        <Lightbulb
          aria-hidden="true"
          className="absolute -right-5 -top-5 h-40 w-40 rotate-12 text-primary/10 md:h-56 md:w-56"
        />
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border bg-card p-5 md:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <MessageSquareText size={23} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                Chia sẻ ý tưởng của b
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mô tả càng rõ, đội ngũ phát triển càng dễ hiểu.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Tên tính năng *
              </span>
              <input
                required
                minLength={3}
                maxLength={150}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tạo album ảnh chung cho lớp"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Danh mục *
              </span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3"
              >
                <option value="experience">Trải nghiệm người dùng</option>
                <option value="memories">Kỷ niệm và hình ảnh</option>
                <option value="community">Bạn bè và cộng đồng</option>
                <option value="management">Quản lý lớp</option>
                <option value="other">Khác</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Mô tả tính năng *
              </span>
              <textarea
                required
                minLength={10}
                maxLength={3000}
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tính năng này sẽ hoạt động như thế nào?"
                className="w-full resize-y rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground">
                {description.length}/3000 ký tự
              </span>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium">
                Lý do nên có tính năng này
              </span>
              <textarea
                rows={3}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tính năng này sẽ giúp người dùng giải quyết vấn đề gì?"
                className="w-full resize-y rounded-xl border bg-background px-4 py-3"
              />
            </label>

            {notice && (
              <p
                role="status"
                className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
              >
                {notice}
              </p>
            )}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
            >
              <Send size={17} />
              Kiểm tra đề xuất
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <Lightbulb size={25} className="mb-3 text-primary" />
            <h3 className="font-semibold">Một đề xuất tốt gồm gì?</h3>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>• Nêu rõ vấn đề đang gặp phải.</li>
              <li>• Mô tả cách tính năng hoạt động.</li>
              <li>• Giải thích lợi ích đối với cộng đồng.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-dashed p-5">
            <h3 className="font-semibold">Ý tưởng của b rất đáng quý!</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Những góp ý thực tế giúp nền tảng kỷ yếu
              ngày càng hữu ích hơn với mọi lớp học.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
