import MainLayout from '@/components/common/layout'
import ServiceRequests from '@/components/features/serviceRequest'

const ServiceRequestsPage = () => {
  return (
    <MainLayout currentPageName="Service Requests">
        <ServiceRequests/>
    </MainLayout>
  )
}

export default ServiceRequestsPage