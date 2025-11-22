import MainLayout from "@/components/common/layout";
import HomeOwnerAnnouncement from "@/components/features/homeowner-announcement";

const HomeOwnerAnnouncementPage = () => {
  return (
    <MainLayout currentPageName="Homeowner Announcements">
      <HomeOwnerAnnouncement />
    </MainLayout>
  );
};

export default HomeOwnerAnnouncementPage;
