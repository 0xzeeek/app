
import React from 'react';
import styles from './LoadingMultiple.module.css';

export default function Loading() {
  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {[...Array(6)].map((_, index) => (
          <div key={index} className={`${styles.card}`}>
            {/* Title placeholder */}
            <div className={`${styles.shimmer} ${styles.title}`}></div>
            
            {/* Description placeholder */}
            <div className={styles.description}>
              <div className={`${styles.shimmer} ${styles.line}`}></div>
              <div className={`${styles.shimmer} ${styles.line}`}></div>
            </div>
            
            {/* Stats placeholder */}
            <div className={styles.stats}>
              <div className={`${styles.shimmer} ${styles.stat}`}></div>
              <div className={`${styles.shimmer} ${styles.stat}`}></div>
            </div>
            
            {/* Shimmer overlay */}
            <div className={styles.shimmerOverlay}></div>
          </div>
        ))}
      </div>
    </div>
  );
} 