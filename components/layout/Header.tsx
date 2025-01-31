"use client";
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styles from './Header.module.css';
import { IoMdCreate } from "react-icons/io";
import { CgProfile } from "react-icons/cg";
import { BiSolidDashboard } from 'react-icons/bi'
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [searchInput, setSearchInput] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/token/${searchInput.trim()}`);
      setSearchInput('');
    }
  };
  
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
          <Link href="/profile" className={styles.navLink}>
            <CgProfile className={styles.icon} />
            Profile
          </Link>
        </nav>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search token by address..."
            className={styles.searchInput}
          />
          <button 
            type="submit" 
            className={styles.searchButton}
            disabled={!searchInput.trim()}
          >
            Search
          </button>
        </form>
      </div>
      <div className={styles.actions}>
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={true} />
      </div>
    </header>
  )
}
