import MainLayout from '@/components/common/layout'
import PropertyMap from '@/components/features/property-map'

const PropertyPage = () => {
  return (
    <MainLayout currentPageName="map">
        <PropertyMap />
    </MainLayout>
  )
}

export default PropertyPage