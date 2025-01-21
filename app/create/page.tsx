"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Notification from "@/components/utils/Notification";
import styles from "./page.module.css";
import { useEthereum } from "@/hooks/useEthereum";
import { useAccount } from "wagmi";
import { CreateResult, ErrorResult } from "@/lib/types";
import { FaRobot, FaTwitter } from 'react-icons/fa';
import { HiCheck } from 'react-icons/hi';

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showError, setShowError] = useState<string | null>(null);
  const [verifyingTwitter, setVerifyingTwitter] = useState(false);
  const [agentDetails, setAgentDetails] = useState({
    name: "",
    description: "",
    ticker: "",
    username: "",
    password: "",
    email: "",
    image: null as File | null,
    background: "",
  });

  const router = useRouter();
  const { create, loading } = useEthereum();
  const { address: userAddress } = useAccount();

  // Ref for the file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checkTwitterAccount = async () => {
    setVerifyingTwitter(true);
    const result = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({ username: agentDetails.username, password: agentDetails.password, email: agentDetails.email }),
    });
    const { success } = await result.json();
    setVerifyingTwitter(false);
    return success;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgentDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImage(file);
      setAgentDetails(prev => ({
        ...prev,
        image: file
      }));
    }
  };

  const handleSubmit = async () => {
    const { name, ticker, image, background, username, password } = agentDetails;
    if (!name || !ticker || !image || !background) {
      setShowError("Missing required fields");
      return;
    }

    // Upload image via the API route
    const formData = new FormData();
    formData.append("image", image);

    const uploadResult = await fetch("/api/upload", { // TODO: rate limit this endpoint
      method: "POST",
      body: formData,
    });

    const { success: uploadSuccess, message: uploadMessage, data: imageUrl } = await uploadResult.json();

    if (!uploadSuccess) {
      console.error(uploadMessage);
      setShowError(uploadMessage || "Image upload failed");
      return;
    }

    // Create the agent via the Ethereum contract
    const createResult = await create(name, ticker);

    if ((createResult as ErrorResult).message) {
      setShowError((createResult as ErrorResult).message);
      return;
    }

    const { token, curve } = createResult as CreateResult;

    // Save metadata via backend API call
    const metadataRes = await fetch(`/api/create/${userAddress}`, {
      method: "POST",
      body: JSON.stringify({ token, curve, image: imageUrl, background, name, ticker, username, password }),
    });
    
    const { success, message } = await metadataRes.json();

    if (!success) {
      setShowError(message);
      return;
    }

    router.push(`/agent/${token}`);
  };


  useEffect(() => {
    if (image) {
      const objectUrl = URL.createObjectURL(image);
      setImagePreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [agentDetails.image, image]);

  const handleNotificationClose = () => setShowError(null);

  // Clicking the image triggers file input click
  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const validateStepOne = () => {
    if (!agentDetails.name.trim()) {
      setShowError("Please enter an agent name");
      return false;
    }
    if (!agentDetails.ticker.trim()) {
      setShowError("Please enter a ticker symbol");
      return false;
    }
    if (!agentDetails.background.trim()) {
      setShowError("Please provide a background description");
      return false;
    }
    if (!image) {
      setShowError("Please upload an image");
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (validateStepOne()) {
        setStep(2);
      }
    } else if (step === 2) {
      // Verify Twitter account before proceeding
      const isTwitterValid = await checkTwitterAccount();
      if (isTwitterValid) {
        setStep(3);
      } else {
        setShowError("Could not connect twitter account");
      }
    }
  };

  return (
    <>
      {showError && <Notification message={showError} type="error" onClose={handleNotificationClose} />}
      {loading.isLoading && <Notification message={loading.message} type="info" duration={8000} />}
      <div className={styles.container}>
        <div className={styles.stepsContainer}>
          <div className={`${styles.step} ${step >= 1 ? styles.active : ""}`}>
            <div className={styles.stepIcon}>
              {step > 1 ? <HiCheck /> : <FaRobot />}
            </div>
            <span>Agent Details</span>
          </div>
          <div className={`${styles.stepConnector} ${step >= 2 ? styles.active : ""}`} />
          <div className={`${styles.step} ${step >= 2 ? styles.active : ""}`}>
            <div className={styles.stepIcon}>
              {step > 2 ? <HiCheck /> : <FaTwitter />}
            </div>
            <span>Connect Twitter</span>
          </div>
          <div className={`${styles.stepConnector} ${step === 3 ? styles.active : ""}`} />
          <div className={`${styles.step} ${step === 3 ? styles.active : ""}`}>
            <div className={styles.stepIcon}>
              <HiCheck />
            </div>
            <span>Create Agent</span>
          </div>
        </div>

        <div className={`${styles.formContainer} ${loading.isLoading ? styles.loading : ""}`}>
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2>Agent Details</h2>
              <div className={styles.imagePreviewContainer}>
                <Image
                  src={imagePreview || "/images/placeholder.jpg"}
                  width={200}
                  height={200}
                  alt="Agent Placeholder"
                  className={styles.imagePreview}
                  onClick={handleImageClick}
                  style={{ cursor: "pointer" }}
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="name">Agent Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={agentDetails.name}
                  onChange={handleInputChange}
                  placeholder="Enter agent name"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="ticker">Ticker</label>
                <input
                  type="text"
                  id="ticker"
                  name="ticker"
                  value={agentDetails.ticker}
                  onChange={handleInputChange}
                  placeholder="Enter ticker symbol"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="background">Background</label>
                <textarea
                  id="background"
                  name="background"
                  value={agentDetails.background}
                  onChange={handleInputChange}
                  placeholder="Describe your agent's background"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="image">Image</label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                />
              </div>
              <button 
                className={styles.nextButton} 
                onClick={handleNextStep}
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepContent}>
              <h2>Connect Twitter</h2>
              <div className={styles.inputGroup}>
                <label htmlFor="username">X Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={agentDetails.username}
                  onChange={handleInputChange}
                  placeholder="@username"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="email">X Email</label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={agentDetails.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="password">X Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={agentDetails.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                />
              </div>
              <div className={styles.buttonGroup}>
                <button className={styles.backButton} onClick={() => setStep(1)}>
                  Back
                </button>
                <button 
                  className={styles.nextButton} 
                  onClick={handleNextStep}
                  disabled={!agentDetails.username || !agentDetails.password}
                >
                  {verifyingTwitter ? "Verifying..." : "Next Step"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepContent}>
              <h2>Create Your Agent</h2>
              <div className={styles.summary}>
                <h3>Summary</h3>
                <p><strong>Name:</strong> {agentDetails.name}</p>
                <p><strong>Ticker:</strong> {agentDetails.ticker}</p>
                <p><strong>Background:</strong> {agentDetails.background}</p>
                <p><strong>Twitter:</strong> @{agentDetails.username}</p>
              </div>
              <div className={styles.buttonGroup}>
                <button className={styles.backButton} onClick={() => setStep(2)}>
                  Back
                </button>
                <button 
                  className={styles.createButton} 
                  onClick={handleSubmit}
                  disabled={loading.isLoading}
                >
                  {loading.isLoading ? "Creating..." : "Create Agent"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
