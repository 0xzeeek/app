import React from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./Sidebar.module.css";
import { HiOutlineDocument } from "react-icons/hi";
import { FaDiscord, FaTwitter } from "react-icons/fa";

export default function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <div className={styles.navContainer}>
        <nav className={styles.nav}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Resources</h3>
            <ul className={styles.linkList}>
              <li>
                <Link href="https://3agent.gitbook.io/3agent" className={styles.link} target="_blank">
                  <HiOutlineDocument className={styles.icon} />
                  <p className={styles.linkDescription}>Docs</p>
                </Link>
              </li>
              <li>
                <Link href="https://discord.gg/8sAKWfvP" className={styles.link} target="_blank">
                  <FaDiscord className={styles.icon} />
                  <p className={styles.linkDescription}>Discord</p>
                </Link>
              </li>
              <li>
                <Link href="https://x.com/0x3agent" className={styles.link} target="_blank">
                  <FaTwitter className={styles.icon} />
                  <p className={styles.linkDescription}>Twitter</p>
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
