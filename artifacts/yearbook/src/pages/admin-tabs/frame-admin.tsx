import { useState } from "react";
import { useListFrames, useCreateFrame, getListFramesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

export function FrameAdmin() {
  const queryClient = useQueryClient();
  const { data: frames, isLoading } = useListFrames();
  const createFrame = useCreateFrame();
  
  const [isOpen, setIsOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [priceLabel, setPriceLabel] = useState("");

  const resetForm = () => {
    setName(""); setImageUrl(""); setDescription(""); setIsFree(true); setPriceLabel("");
  };

  const handleSave = () => {
    if (!name || !imageUrl) return toast.error("Vui lòng điền Tên và Chuỗi CSS Gradient (image_url)");
    
    const data = { name, image_url: imageUrl, description, is_free: isFree, price_label: priceLabel };

    createFrame.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListFramesQueryKey() });
        toast.success("Thêm mới thành công"); setIsOpen(false); resetForm();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="rounded-full"><Plus className="w-4 h-4 mr-2" /> Thêm khung ảnh</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Thêm khung ảnh mới</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Tên khung ảnh *</label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">CSS Gradient *</label><Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="VD: linear-gradient(135deg, #f6d365 0%, #fda085 100%)" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Mô tả</label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="flex items-center gap-2 mt-4">
                <Checkbox id="isFree" checked={isFree} onCheckedChange={(c) => setIsFree(c as boolean)} />
                <label htmlFor="isFree" className="text-sm font-medium cursor-pointer">Miễn phí</label>
              </div>
              {!isFree && (
                <div className="space-y-2 mt-4"><label className="text-sm font-medium">Giá hiển thị (VD: 10.000đ)</label><Input value={priceLabel} onChange={e => setPriceLabel(e.target.value)} /></div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy</Button>
              <Button onClick={handleSave} disabled={createFrame.isPending}>
                {createFrame.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow><TableHead>Preview</TableHead><TableHead>Tên khung</TableHead><TableHead>Loại</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={3} className="text-center py-8">Đang tải...</TableCell></TableRow>
            : frames?.map(frame => (
              <TableRow key={frame.id}>
                <TableCell>
                  <div className="w-10 h-10 rounded-full" style={{ background: frame.image_url }}></div>
                </TableCell>
                <TableCell className="font-medium">{frame.name}</TableCell>
                <TableCell>{frame.is_free ? "Miễn phí" : frame.price_label}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
