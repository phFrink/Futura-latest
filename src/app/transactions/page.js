import MainLayout from '@/components/common/layout'
import Transactions from '@/components/features/transactions'



const TransactionPage = () => {
  return (
    <MainLayout currentPageName="Transaction">
        <Transactions/>
    </MainLayout>
  )
}

export default TransactionPage