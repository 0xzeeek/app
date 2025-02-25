"use client";

import { useState } from "react";
import { RiTwitterXFill } from "react-icons/ri";
import styles from "./page.module.css";

export default function TwitterLoginPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Send the credentials back to the parent window
    if (window.opener) {
      window.opener.postMessage({
        type: 'TWITTER_CREDENTIALS',
        credentials: { username, email, password }
      }, window.location.origin);
      
      // Close the popup after sending the message
      setTimeout(() => window.close(), 500);
    } else {
      setError("Could not communicate with the main window");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <RiTwitterXFill size={30} />
        </div>
        <h2>Sign in to X</h2>
        
        {error && <div className={styles.errorMessage}>{error}</div>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>
          <button 
            type="submit" 
            className={styles.loginButton}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Sign in"}
          </button>
        </form>
        <p className={styles.disclaimer}>
          Your credentials are only used to post on behalf of your agent.
          <br />
          Make sure 2FA is disabled for your account.
        </p>
      </div>
    </div>
  );
} 