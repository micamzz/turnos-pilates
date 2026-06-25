import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <p>Challenge Tecnico Aranguri Apps© {new Date().getFullYear()}</p>
    </footer>
  )
}

export default Footer