import React from 'react';
import Link from 'next/link';
import styles from './Sidebar.module.css';
import { HiOutlineDocument } from 'react-icons/hi';
import { FaDiscord, FaGithub } from 'react-icons/fa';

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <nav className={styles.nav}>
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Resources</h3>
          <ul className={styles.linkList}>
            <li>
              <Link href="https://docs.example.com" className={styles.link}>
                <HiOutlineDocument className={styles.icon} />
                Documentation
              </Link>
            </li>
            <li>
              <Link href="https://discord.gg/example" className={styles.link}>
                <FaDiscord className={styles.icon} />
                Discord
              </Link>
            </li>
            <li>
              <Link href="https://github.com/example" className={styles.link}>
                <FaGithub className={styles.icon} />
                Github
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <div className={styles.poweredBy}>
        powered by deepseek
      </div>
    </div>
  );
}