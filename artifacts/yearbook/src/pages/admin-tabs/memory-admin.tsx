import { useState } from "react";
import { useListMemories, useCreateMemory, useUpdateMemory, useDeleteMemory, getListMemoriesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export function MemoryAdmin() {
  const queryClient = useQueryClient();
  const { data: memories, isLoading } = useListMemories();
  const createMemory = useCreateMemory();
  const updateMemory = useUpdateMemory();
  const deleteMemory = useDeleteMemory();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [author, setAuthor] = useState("");

  const resetForm = () => {
    setTitle(""); setContent(""); setPhotoUrl(""); setAuthor(""); setEditingId(null);
  };

  const openEdit = (mem: any) => {
    setTitle(mem.title); setContent(mem.content); setPhotoUrl(mem.photo_url || ""); setAuthor(mem.author);
    setEditingId(mem.id); setIsOpen(true);
  };

  const handleSave = () => {
    if (!title || !content || !author) return toast.error("Vui lòng điền đủ thông tin bắt buộc");
    
    const data = { title, content, photo_url: photoUrl, author };

    if (editingId) {
      updateMemory.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
          toast.success("Cập nhật thành công"); setIsOpen(false); resetForm();
        }
      });
    } else {
      createMemory.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
          toast.success("Thêm mới thành công"); setIsOpen(false); resetForm();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa?")) {
      deleteMemory.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
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
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm kỷ niệm</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Sửa kỷ niệm" : "Thêm kỷ niệm mới"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Tiêu đề *</label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Tác giả *</label><Input value={author} onChange={e => setAuthor(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Nội dung *</label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={4} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">URL Ảnh minh họa</label><Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createMemory.isPending || updateMemory.isPending}>
                {(createMemory.isPending || updateMemory.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow><TableHead>Tiêu đề</TableHead><TableHead>Tác giả</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={3} className="text-center py-8">Đang tải...</TableCell></TableRow>
            : memories?.map(mem => (
              <TableRow key={mem.id}>
                <TableCell className="font-medium">{mem.title}</TableCell>
                <TableCell>{mem.author}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(mem)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(mem.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
