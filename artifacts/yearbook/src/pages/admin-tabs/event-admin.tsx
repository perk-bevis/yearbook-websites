import { useState } from "react";
import { useListEvents, useCreateEvent, useUpdateEvent, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

export function EventAdmin() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useListEvents();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const resetForm = () => {
    setTitle(""); setDescription(""); setEventDate(""); setPhotoUrl(""); setEditingId(null);
  };

  const openEdit = (evt: any) => {
    setTitle(evt.title); setDescription(evt.description || ""); 
    setEventDate(evt.event_date.split('T')[0]); // assuming ISO string
    setPhotoUrl(evt.photo_url || "");
    setEditingId(evt.id); setIsOpen(true);
  };

  const handleSave = () => {
    if (!title || !eventDate) return toast.error("Vui lòng điền tiêu đề và ngày diễn ra");
    
    const data = { title, description, event_date: eventDate, photo_url: photoUrl };

    if (editingId) {
      updateEvent.mutate({ id: editingId, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast.success("Cập nhật thành công"); setIsOpen(false); resetForm();
        }
      });
    } else {
      createEvent.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          toast.success("Thêm mới thành công"); setIsOpen(false); resetForm();
        }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa?")) {
      deleteEvent.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
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
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm sự kiện</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editingId ? "Sửa sự kiện" : "Thêm sự kiện mới"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Tiêu đề *</label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Ngày diễn ra *</label><Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Mô tả</label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">URL Ảnh</label><Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createEvent.isPending || updateEvent.isPending}>
                {(createEvent.isPending || updateEvent.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow><TableHead>Tiêu đề</TableHead><TableHead>Ngày diễn ra</TableHead><TableHead className="text-right">Thao tác</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={3} className="text-center py-8">Đang tải...</TableCell></TableRow>
            : events?.map(evt => (
              <TableRow key={evt.id}>
                <TableCell className="font-medium">{evt.title}</TableCell>
                <TableCell>{new Date(evt.event_date).toLocaleDateString('vi-VN')}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(evt)}><Edit2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(evt.id)}><Trash2 className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
