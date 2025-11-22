import MainLayout from '@/components/common/layout'
import Dashboard from '@/components/features/dashboard'
import Reports from '@/components/features/reports'
import React from 'react'

const DashboardPage = () => {
  return (
    <MainLayout currentPageName="Dashboard">
        <Reports />
    </MainLayout>
  )
}

export default DashboardPage