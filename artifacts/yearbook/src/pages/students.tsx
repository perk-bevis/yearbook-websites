
import { useListStudents, useListFrames } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  UserCircle2,
  SlidersHorizontal,
  Award,
  X,
  Users,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarGradient } from "@/components/ui/avatar-gradient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RoleFilter = "all" | "monitor" | "vice_monitor" | "member";

export default function Students() {
  const { data: students, isLoading } = useListStudents();
  const { data: frames } = useListFrames();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const safeStudents = Array.isArray(students) ? students : [];
  const safeFrames = Array.isArray(frames) ? frames : [];

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("vi");

    return safeStudents.filter((student) => {
      const name = student?.name || "";
      const nickname = student?.nickname || "";

      const matchesSearch =
        name.toLocaleLowerCase("vi").includes(keyword) ||
        nickname.toLocaleLowerCase("vi").includes(keyword);

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "monitor" && student.role === "monitor") ||
        (roleFilter === "vice_monitor" &&
          student.role === "vice_monitor") ||
        (roleFilter === "member" &&
          student.role !== "monitor" &&
          student.role !== "vice_monitor");

      return matchesSearch && matchesRole;
    });
  }, [safeStudents, search, roleFilter]);

  const getStudentFrame = (frameId?: number | null) => {
    if (!frameId) return null;
    return safeFrames.find((frame) => frame.id === frameId);
  };

  const getRoleLabel = (role?: string | null) => {
    if (role === "monitor") return "Lớp trưởng";
    if (role === "vice_monitor") return "Lớp phó";
    return "Thành viên";
  };

  const roleOptions: { value: RoleFilter; label: string }[] = [
    { value: "all", label: "Tất cả thành viên" },
    { value: "monitor", label: "Lớp trưởng" },
    { value: "vice_monitor", label: "Lớp phó" },
    { value: "member", label: "Thành viên" },
  ];

  return (
    <div className="min-h-full bg-[#faf8f5]">
      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        {/* Tiêu đề */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fce9e4] text-[#d65d50]">
              <Users className="h-[18px] w-[18px]" />
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#292522] sm:text-2xl">
                Bạn học
              </h1>
              <p className="mt-0.5 text-xs text-[#898078] sm:text-sm">
                Danh sách thành viên lớp học của bạn
              </p>
            </div>
          </div>
        </motion.div>

        {/* Thanh tìm kiếm và bộ lọc */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a29a92]" />

              <Input
                type="search"
                placeholder="Tìm kiếm bạn học..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-10 rounded-xl border-[#eee7df] bg-white pl-9 pr-9 text-xs shadow-sm placeholder:text-[#aaa198] focus-visible:ring-[#e7a49a] sm:text-sm"
              />

              {search && (
                <button
                  type="button"
                  aria-label="Xóa tìm kiếm"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa198] hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters((value) => !value)}
              className={`h-10 shrink-0 gap-1.5 rounded-xl border-[#eee7df] px-3 text-xs ${
                roleFilter !== "all"
                  ? "border-[#e7b4a9] bg-[#fff0eb] text-[#c45e50]"
                  : "bg-white text-[#625a53]"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Lọc
              {roleFilter !== "all" && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d65d50] text-[10px] text-white">
                  1
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-[#eee7df] bg-white p-3 shadow-sm"
            >
              <p className="mb-2 text-xs font-semibold text-[#625a53]">
                Lọc theo vai trò
              </p>

              <div className="flex flex-wrap gap-2">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRoleFilter(option.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      roleFilter === option.value
                        ? "border-[#d65d50] bg-[#fff0eb] font-semibold text-[#c45e50]"
                        : "border-[#eee7df] bg-white text-[#766d65] hover:bg-[#faf6f1]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Số lượng thành viên */}
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-[#8b8178]">
            {isLoading
              ? "Đang tải danh sách..."
              : `${filteredStudents.length} thành viên`}
          </p>

          {(search || roleFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
              }}
              className="text-xs font-medium text-[#c45e50] hover:underline"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {/* Lưới học sinh */}
        <div className="rounded-2xl border border-[#eee7df] bg-white p-3 shadow-[0_2px_12px_rgba(70,50,30,0.035)] sm:p-4">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[150px] flex-col items-center rounded-xl border border-[#f0eae3] p-3 sm:min-h-[165px]"
                >
                  <Skeleton className="mb-3 h-12 w-12 rounded-full sm:h-14 sm:w-14" />
                  <Skeleton className="mb-2 h-3 w-24 max-w-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))
            ) : filteredStudents.length === 0 ? (
              <div className="col-span-full flex flex-col items-center py-14 text-center">
                <UserCircle2 className="mb-3 h-12 w-12 text-[#d8cec3]" />

                <h3 className="text-sm font-bold text-[#49413b]">
                  Không tìm thấy bạn học
                </h3>

                <p className="mt-1 text-xs text-[#91867c]">
                  Thử tên khác hoặc thay đổi bộ lọc nhé.
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-lg"
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("all");
                  }}
                >
                  Xem tất cả thành viên
                </Button>
              </div>
            ) : (
              filteredStudents.map((student, index) => {
                const frame = getStudentFrame(student.active_frame_id);
                const isMonitor = student.role === "monitor";
                const isViceMonitor = student.role === "vice_monitor";

                return (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min(index * 0.025, 0.2),
                    }}
                  >
                    <Link
                      href={`/students/${student.id}`}
                      className="group relative flex h-full min-h-[150px] flex-col items-center rounded-xl border border-[#f0eae3] bg-white px-2.5 py-3.5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#e8c6b9] hover:bg-[#fffdfa] hover:shadow-[0_5px_18px_rgba(80,50,30,0.07)] sm:min-h-[165px] sm:px-3 sm:py-4"
                    >
                      
                  {/* Huy hiệu lớp trưởng */}
                      {isMonitor && (
                      <div
                        title="Lớp trưởng"
                        aria-label="Lớp trưởng"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#fff1d6] text-[#b77916] ring-1 ring-[#f2d69b]"
  >
                          <Award className="h-4 w-4" />
                      </div>
                      )}
                      {/* Avatar và khung ảnh */}
                      <div className="relative mb-2.5 h-12 w-12 shrink-0 sm:h-14 sm:w-14">
                        {frame && (
                          <div
                            className="pointer-events-none absolute -inset-1.5 z-10 rounded-full opacity-90"
                            style={{
                              backgroundImage: `url("${frame.image_url}")`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                              WebkitMask:
                                "radial-gradient(transparent 61%, black 64%)",
                              mask:
                                "radial-gradient(transparent 61%, black 64%)",
                            }}
                          />
                        )}

                        <div className="relative z-0 h-full w-full overflow-hidden rounded-full bg-[#f4e7dd] ring-2 ring-white">
                          {student.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={student.name}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <AvatarGradient
                              name={student.name}
                              className="h-full w-full"
                              textClassName="text-lg sm:text-xl"
                            />
                          )}
                        </div>
                      </div>

                      {/* Tên và vai trò */}
                      <h3 className="w-full truncate text-[11px] font-bold text-[#39332e] transition-colors group-hover:text-[#c45e50] sm:text-xs">
                        {student.name}
                      </h3>

                      {student.nickname && (
                        <p className="mt-1 w-full truncate text-[10px] text-[#968a7f]">
                          {student.nickname}
                        </p>
                      )}

                      <div className="mt-1.5 flex min-h-[17px] items-center justify-center">
                        {(isMonitor || isViceMonitor) ? (
                          <Badge
                            className={`h-5 border-none px-2 text-[9px] font-medium ${
                              isMonitor
                                ? "bg-[#fff1d6] text-[#a36b10] hover:bg-[#fff1d6]"
                                : "bg-[#f5e9fa] text-[#8a5aa1] hover:bg-[#f5e9fa]"
                            }`}
                          >
                            {getRoleLabel(student.role)}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-[#a9a097]">
                            Thành viên
                          </span>
                        )}
                      </div>

                      <span className="mt-1 text-[10px] leading-none tracking-[2px] text-[#c5b9ad] transition-colors group-hover:text-[#d65d50]">
                        ···
                      </span>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>

          {!isLoading && filteredStudents.length > 0 && (
            <div className="mt-4 border-t border-[#f1ebe5] pt-3 text-center">
              <p className="text-[11px] text-[#9a8e83]">
                Đang hiển thị {filteredStudents.length} / {safeStudents.length} thành viên
              </p>
            </div>
          )}
        </div>

        {/* Chân trang được giữ ở Layout chung */}
      </div>
    </div>
  );
}

