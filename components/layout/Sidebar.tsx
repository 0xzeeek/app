import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { HiOutlineDocument } from "react-icons/hi";
import { FaDiscord, FaGithub } from "react-icons/fa";

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <div className={styles.navContainer}>
        <nav className={styles.nav}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Resources</h3>
            <ul className={styles.linkList}>
              <li>
                <Link href="https://docs.example.com" className={styles.link}>
                  <HiOutlineDocument className={styles.icon} />
                  <p className={styles.linkDescription}>Documentation</p>
                </Link>
              </li>
              <li>
                <Link href="https://discord.gg/example" className={styles.link}>
                  <FaDiscord className={styles.icon} />
                  <p className={styles.linkDescription}>Discord</p>
                </Link>
              </li>
              <li>
                <Link href="https://github.com/example" className={styles.link}>
                  <FaGithub className={styles.icon} />
                  <p className={styles.linkDescription}>Github</p>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
        <div className={styles.logoContainer}>
          <Image
            src="/images/ghost.png"
            alt="powered by 3agent"
            fill
            sizes="(max-width: 768px) 150px, (max-width: 1200px) 100px, 50px"
          />
        </div>
      </div>
      <div className={styles.poweredBy}>
        <p>powered by 3agent</p>
      </div>
    </div>
  );
}
