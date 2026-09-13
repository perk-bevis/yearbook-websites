import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BASE = import.meta.env.BASE_URL;
const STORAGE_KEY = "ky_yeu_admin_token";

type Photo = {
  id: number;
  url: string;
  caption?: string | null;
  category: string;
};

export function PhotoAdmin() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("other");
  const [uploadedBy, setUploadedBy] = useState("");
  const [saving, setSaving] = useState(false);

  const loadPhotos = async () => {
    const response = await fetch(`${BASE}api/gallery`);
    if (response.ok) setPhotos(await response.json());
    setIsLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const resetForm = () => {
    setUrl("");
    setCaption("");
    setCategory("other");
    setUploadedBy("");
  };

  const handleSave = async () => {
    if (!url.trim()) {
      toast.error("URL ảnh không được để trống");
      return;
    }
    setSaving(true);
    const response = await fetch(`${BASE}api/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.trim(),
        caption: caption.trim() || null,
        category,
        uploaded_by: uploadedBy.trim() || "admin",
        admin_token: localStorage.getItem(STORAGE_KEY),
      }),
    });
    if (response.ok) {
      const created = await response.json();
      setPhotos((current) => [created, ...current]);
      toast.success("Đã thêm ảnh vào album");
      setIsOpen(false);
      resetForm();
    } else {
      toast.error("Không thể thêm ảnh");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa ảnh này?")) return;
    const token = encodeURIComponent(localStorage.getItem(STORAGE_KEY) || "");
    const response = await fetch(`${BASE}api/gallery/${id}?admin_token=${token}`, { method: "DELETE" });
    if (response.ok) {
      setPhotos((current) => current.filter((photo) => photo.id !== id));
      toast.success("Đã xóa ảnh");
    } else {
      toast.error("Không thể xóa ảnh");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm ảnh</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm ảnh mới</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Ảnh *</label>
                <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Chú thích</label>
                <Input value={caption} onChange={(event) => setCaption(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Danh mục</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classmates">Lớp học</SelectItem>
                    <SelectItem value="events">Sự kiện</SelectItem>
                    <SelectItem value="trips">Dã ngoại</SelectItem>
                    <SelectItem value="teachers">Thầy cô</SelectItem>
                    <SelectItem value="other">Khác</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Người đăng</label>
                <Input value={uploadedBy} onChange={(event) => setUploadedBy(event.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-24">Ảnh</TableHead>
              <TableHead>Chú thích</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8">Đang tải...</TableCell></TableRow>
            ) : photos.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
            ) : (
              photos.map((photo) => (
                <TableRow key={photo.id}>
                  <TableCell><img src={photo.url} alt="" className="w-12 h-12 object-cover rounded-md" /></TableCell>
                  <TableCell className="max-w-[200px] truncate">{photo.caption}</TableCell>
                  <TableCell>{photo.category}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(photo.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
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