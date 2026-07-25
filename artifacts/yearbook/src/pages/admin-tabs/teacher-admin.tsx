import { useState } from "react";
import { useListTeacherMessages, useCreateTeacherMessage, useUpdateTeacherMessage, useDeleteTeacherMessage, getListTeacherMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export function TeacherAdmin() {
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useListTeacherMessages();
  const createMsg = useCreateTeacherMessage();
  const updateMsg = useUpdateTeacherMessage();
  const deleteMsg = useDeleteTeacherMessage();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [teacherName, setTeacherName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const resetForm = () => {
    setTeacherName(""); setSubject(""); setMessage(""); setPhotoUrl(""); setEditingId(null);
  };

  const openEdit = (msg: any) => {
    setTeacherName(msg.teacher_name); setSubject(msg.subject || ""); 
    setMessage(msg.message); setPhotoUrl(msg.photo_url || "");
    setEditingId(msg.id); setIsOpen(true);
  };

  const handleSave = () => {
    if (!teacherName || !message) return toast.error("Vui lòng điền tên và lời nhắn");
    
    const data = { teacher_name: teacherName, subject, message, photo_url: photoUrl };

    if (editingId) {
      updateMsg.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeacherMessagesQueryKey() });
          toast.success("Cập nhật thành công"); setIsOpen(false); resetForm();
        }
      });
    } else {
      createMsg.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeacherMessagesQueryKey() });
          toast.success("Thêm mới thành công"); setIsOpen(false); resetForm();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa?")) {
      deleteMsg.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTeacherMessagesQueryKey() });
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
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm lời nhắn</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Sửa lời nhắn" : "Thêm lời nhắn mới"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Tên thầy/cô *</label><Input value={teacherName} onChange={e => setTeacherName(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Môn dạy</label><Input value={subject} onChange={e => setSubject(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Lời nhắn *</label><Textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">URL Ảnh</label><Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createMsg.isPending || updateMsg.isPending}>
                {(createMsg.isPending || updateMsg.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow><TableHead>Tên thầy/cô</TableHead><TableHead>Môn dạy</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={3} className="text-center py-8">Đang tải...</TableCell></TableRow>
            : messages?.map(msg => (
              <TableRow key={msg.id}>
                <TableCell className="font-medium">{msg.teacher_name}</TableCell>
                <TableCell>{msg.subject}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(msg)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(msg.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
