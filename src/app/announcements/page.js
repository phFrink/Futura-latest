import MainLayout from '@/components/common/layout'
import Announcement from '@/components/features/announcements'


const AnnouncementsPage = () => {
  return (
    <MainLayout currentPageName="Announcements">
        <Announcement />
    </MainLayout>
  )
}

export default AnnouncementsPage