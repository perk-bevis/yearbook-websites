import { useState } from "react";
import { useListStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function StudentAdmin() {
  const queryClient = useQueryClient();
  const { data: students, isLoading } = useListStudents();
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("student");
  const [photoUrl, setPhotoUrl] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [dream, setDream] = useState("");
  const [message, setMessage] = useState("");

  const resetForm = () => {
    setName(""); setNickname(""); setRole("student"); setPhotoUrl("");
    setBirthDate(""); setHobbies(""); setDream(""); setMessage("");
    setEditingId(null);
  };

  const openEdit = (student: any) => {
    setName(student.name);
    setNickname(student.nickname || "");
    setRole(student.role);
    setPhotoUrl(student.photo_url || "");
    setBirthDate(student.birth_date || "");
    setHobbies(student.hobbies || "");
    setDream(student.dream || "");
    setMessage(student.message || "");
    setEditingId(student.id);
    setIsOpen(true);
  };

  const handleSave = () => {
    if (!name) return toast.error("Tên không được để trống");
    
    const data = {
      name, nickname, role, photo_url: photoUrl, birth_date: birthDate, hobbies, dream, message
    };

    if (editingId) {
      updateStudent.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast.success("Cập nhật thành công");
          setIsOpen(false);
          resetForm();
        }
      });
    } else {
      createStudent.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast.success("Thêm mới thành công");
          setIsOpen(false);
          resetForm();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa?")) {
      deleteStudent.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          toast.success("Đã xóa");
        }
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm học sinh</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Sửa thông tin học sinh" : "Thêm học sinh mới"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Họ tên *</label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Biệt danh</label>
                <Input value={nickname} onChange={e => setNickname(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Vai trò</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Học sinh</SelectItem>
                    <SelectItem value="monitor">Lớp trưởng</SelectItem>
                    <SelectItem value="vice_monitor">Lớp phó</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Ngày sinh (YYYY-MM-DD)</label>
                <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">URL Ảnh đại diện</label>
                <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Sở thích</label>
                <Input value={hobbies} onChange={e => setHobbies(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Ước mơ</label>
                <Input value={dream} onChange={e => setDream(e.target.value)} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">Lời nhắn</label>
                <Textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createStudent.isPending || updateStudent.isPending}>
                {(createStudent.isPending || updateStudent.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Họ tên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ngày sinh</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : students?.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
            ) : (
              students?.map(student => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {student.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-primary font-bold text-xs">{student.name.charAt(0)}</span>}
                      </div>
                      {student.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.role === "monitor" ? "Lớp trưởng" : student.role === "vice_monitor" ? "Lớp phó" : "Học sinh"}
                  </TableCell>
                  <TableCell>{student.birth_date || "-"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(student)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(student.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
