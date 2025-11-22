import MainLayout from '@/components/common/layout'
import Properties from '@/components/features/properties'
import React from 'react'

const PropertiesPage = () => {
  return (
    <MainLayout currentPageName="Properties">
        <Properties />
    </MainLayout>
  )
}

export default PropertiesPage