import MainLayout from '@/components/common/layout'
import Homeowners from '@/components/features/homeowners'
import React from 'react'

const PropertiesPage = () => {
  return (
    <MainLayout currentPageName="Properties">
        <Homeowners />
    </MainLayout>
  )
}

export default PropertiesPage