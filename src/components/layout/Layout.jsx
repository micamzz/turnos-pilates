import Header from '../header/Header.jsx'
import Footer from '../footer/Footer.jsx'
import styles from './Layout.module.css'

export function Layout({ children }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <Header />
      </div>
      <main className={styles.main}>
        {children}
      </main>
      <Footer />
    </div>
  )
}