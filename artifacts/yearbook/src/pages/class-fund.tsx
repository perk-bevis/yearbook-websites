
import { Link } from "wouter";
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Heart,
  ReceiptText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: ReceiptText,
    title: "Theo dõi thu chi",
    description:
      "Ghi lại từng khoản thu, khoản chi và lý do sử dụng quỹ.",
  },
  {
    icon: ShieldCheck,
    title: "Công khai minh bạch",
    description:
      "Các thành viên có thể xem lịch sử giao dịch và nội dung chi tiêu.",
  },
  {
    icon: CalendarDays,
    title: "Góp quỹ cho hoạt động",
    description:
      "Cùng chuẩn bị họp lớp, thăm thầy cô và những dịp đặc biệt.",
  },
];

export default function ClassFund() {
  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Trở về trang chủ
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-[#eadbc8] bg-gradient-to-br from-[#fbf4e9] via-[#fffaf4] to-[#f5e5d5] p-5 text-[#49392e] sm:p-8">
          <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full bg-[#e6c9a8]/40 blur-2xl" />

          <div className="relative max-w-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-[#8d5e43] shadow-sm">
              <Wallet className="h-6 w-6" />
            </div>

            <p className="mt-5 text-xs font-bold tracking-[0.18em] text-[#8a6746]">
              CỘNG ĐỒNG LỚP MÌNH
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Quỹ lớp
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#786657] sm:text-base">
              Một nơi để cả lớp cùng theo dõi thu chi, chuẩn bị những
              buổi hội ngộ và tiếp tục giữ kết nối sau khi ra trường.
            </p>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-border/70 bg-card p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>

              <h2 className="mt-4 text-sm font-bold">{title}</h2>

              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center sm:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CircleDollarSign className="h-7 w-7" />
          </div>

          <h2 className="mt-4 text-lg font-bold">
            Chưa có dữ liệu quỹ lớp
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            Khu vực này sẽ tổng hợp số dư, các khoản thu chi và lịch sử
            đóng góp khi được kết nối với API và cơ sở dữ liệu quỹ lớp.
            Hiện chưa hiển thị số liệu giả như dữ liệu thật.
          </p>

          <Link href="/tin-nhan" className="mt-5 inline-flex">
            <Button variant="outline" className="rounded-xl">
              <Heart className="mr-2 h-4 w-4" />
              Trao đổi với các bạn
            </Button>
          </Link>
        </section>
      </div>
    </div>
  );
}
