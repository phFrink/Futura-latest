import MainLayout from '@/components/common/layout'
import Appointments from '@/components/features/reservations'
import ProtectedRoute from '@/components/common/ProtectedRoute'

const ReservationsPage = () => {
  return (
    <ProtectedRoute requiredRoles={["admin", "customer service"]}>
      <MainLayout currentPageName="Appointments">
          <Appointments/>
      </MainLayout>
    </ProtectedRoute>
  )
}

export default ReservationsPage