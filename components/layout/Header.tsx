"use client";
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from './Header.module.css';
// import { FaGithub } from 'react-icons/fa'
import { IoMdCreate } from "react-icons/io";
import { CgProfile } from "react-icons/cg";
// import { HiDocumentText } from 'react-icons/hi'
import { BiSolidDashboard } from 'react-icons/bi'

export default function Header() {
  // const { address } = useAccount();
  
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <Link href="/" className={styles.logoLink}>
          {/* ... logo content ... */}
        </Link>
        
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            <BiSolidDashboard className={styles.icon} />
            Agents
          </Link>
          <Link href="/create" className={styles.navLink}>
            <IoMdCreate className={styles.icon} />
            Create
          </Link>
          <Link href="/dashboard" className={styles.navLink}>
            <CgProfile className={styles.icon} />
            Profile
          </Link>
          {/* <Link href="https://docs.example.com" className={styles.navLink}>
            <HiDocumentText className={styles.icon} />
            Docs
          </Link>
          <Link href="https://github.com/yourusername/yourrepo" className={styles.navLink}>
            <FaGithub className={styles.icon} />
            GitHub
          </Link> */}
        </nav>
      </div>
      <div className={styles.actions}>
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={true} />
      </div>
    </header>
  )
}
