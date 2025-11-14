import { Outlet } from 'react-router-dom'
import HeaderBar from '../components/HeaderBar'
import FooterBar from '../components/FooterBar'

export default function PublicLayout() {
  return (
    <div className="app-root">
      <HeaderBar context="public" />
      <main className="main public-main">
        <Outlet />
      </main>
      <FooterBar />
    </div>
  )
}