import MainLayout from '@/components/common/layout'
import Billings from '@/components/features/billing'


const BillingPage = () => {
  return (
    <MainLayout currentPageName="Billing">
        <Billings/>
    </MainLayout>
  )
}

export default BillingPage