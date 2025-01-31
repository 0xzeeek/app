import React from 'react';
import styles from './loading.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContent}>
        <div className={styles.skeleton}>
          <div className={styles.skeletonRow}></div>
          <div className={styles.skeletonRow}></div>
          <div className={styles.skeletonRow}></div>
        </div>
      </div>
    </div>
  );
} 