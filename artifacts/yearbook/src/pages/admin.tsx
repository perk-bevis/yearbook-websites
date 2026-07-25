import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { getListStudentsQueryKey, getListPhotosQueryKey, getListMemoriesQueryKey, getListEventsQueryKey, getListTeacherMessagesQueryKey, getListFramesQueryKey } from "@workspace/api-client-react";

import { StudentAdmin } from "./admin-tabs/student-admin";
import { PhotoAdmin } from "./admin-tabs/photo-admin";
import { MemoryAdmin } from "./admin-tabs/memory-admin";
import { EventAdmin } from "./admin-tabs/event-admin";
import { TeacherAdmin } from "./admin-tabs/teacher-admin";
import { FrameAdmin } from "./admin-tabs/frame-admin";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("students");
  const queryClient = useQueryClient();

  // We can add simple refresh button
  const handleRefresh = () => {
    if (activeTab === "students") queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
    if (activeTab === "photos") queryClient.invalidateQueries({ queryKey: getListPhotosQueryKey() });
    if (activeTab === "memories") queryClient.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
    if (activeTab === "events") queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
    if (activeTab === "teachers") queryClient.invalidateQueries({ queryKey: getListTeacherMessagesQueryKey() });
    if (activeTab === "frames") queryClient.invalidateQueries({ queryKey: getListFramesQueryKey() });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Bảng Quản Trị</h1>
          <p className="text-muted-foreground mt-1">Quản lý nội dung cho trang kỷ yếu.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-8 flex flex-wrap h-auto bg-muted/50 p-1">
          <TabsTrigger value="students" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Học sinh</TabsTrigger>
          <TabsTrigger value="photos" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Gallery</TabsTrigger>
          <TabsTrigger value="memories" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Kỷ niệm</TabsTrigger>
          <TabsTrigger value="events" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Sự kiện</TabsTrigger>
          <TabsTrigger value="teachers" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Thầy cô</TabsTrigger>
          <TabsTrigger value="frames" className="rounded-full px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Khung ảnh</TabsTrigger>
        </TabsList>

        <div className="bg-card rounded-[2rem] border shadow-sm p-6 md:p-8 min-h-[500px]">
          <TabsContent value="students" className="mt-0 outline-none">
            <StudentAdmin />
          </TabsContent>
          <TabsContent value="photos" className="mt-0 outline-none">
            <PhotoAdmin />
          </TabsContent>
          <TabsContent value="memories" className="mt-0 outline-none">
            <MemoryAdmin />
          </TabsContent>
          <TabsContent value="events" className="mt-0 outline-none">
            <EventAdmin />
          </TabsContent>
          <TabsContent value="teachers" className="mt-0 outline-none">
            <TeacherAdmin />
          </TabsContent>
          <TabsContent value="frames" className="mt-0 outline-none">
            <FrameAdmin />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
