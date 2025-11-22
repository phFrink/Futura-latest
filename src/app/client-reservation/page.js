import MainLayout from "@/components/common/layout";
import Inquiries from "@/components/features/inquiries";
import ReservationDetails from "@/components/features/property-reservation";

const InquiriesPage = () => {
  return (
    <MainLayout currentPageName="Reservation">
      <ReservationDetails />
    </MainLayout>
  );
};

export default InquiriesPage;
