"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Notification from "@/components/utils/Notification";
import { useRouter } from "next/navigation";
import { useEthereum } from "@/hooks/useEthereum";
import { useAccount } from "wagmi";
import { FaRobot } from "react-icons/fa";
import { RiTwitterXFill } from "react-icons/ri";
import { HiCheck } from "react-icons/hi";

import { CreateResult, ErrorResult } from "@/lib/types";

import styles from "./page.module.css";

export default function CreatePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
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
  const { create } = useEthereum();
  const { address: userAddress } = useAccount();

  // Ref for the file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const checkTwitterAccount = async () => {
    setVerifyingTwitter(true);
    const result = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({
        username: agentDetails.username.replace('@', ''),
        password: agentDetails.password,
        email: agentDetails.email,
      }),
    });
    const { success } = await result.json();
    setVerifyingTwitter(false);
    return success;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAgentDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Create an image element to get dimensions
      const imgElement = document.createElement("img");
      const imageUrl = URL.createObjectURL(file);

      imgElement.onload = async () => {
        // Calculate the square crop dimensions
        const size = Math.min(imgElement.width, imgElement.height);
        const x = (imgElement.width - size) / 2;
        const y = (imgElement.height - size) / 2;

        // Create canvas for cropping
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          console.error("Could not get canvas context");
          return;
        }

        // Draw cropped image
        ctx.drawImage(imgElement, x, y, size, size, 0, 0, size, size);

        // Convert to file
        canvas.toBlob((blob) => {
          if (!blob) {
            console.error("Could not create blob");
            return;
          }

          const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });
          setImage(croppedFile);
          setImagePreview(URL.createObjectURL(croppedFile));
          setAgentDetails((prev) => ({
            ...prev,
            image: croppedFile,
          }));
        }, "image/jpeg");
      };

      imgElement.src = imageUrl;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const { name, ticker, image, background, username, email, password } = agentDetails;
    if (!name || !ticker || !image || !background) {
      setShowError("Missing required fields");
      return;
    }

    // Upload image via the API route
    const formData = new FormData();
    formData.append("image", image);

    const uploadResult = await fetch("/api/upload", {
      // TODO: rate limit this endpoint
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
    setNotification(`Deploying ${ticker} onchain.`);
    const createResult = await create(name, ticker);

    if ((createResult as ErrorResult).message) {
      setShowError((createResult as ErrorResult).message);
      return;
    }

    const { token, curve } = createResult as CreateResult;

    // Create the agent
    setNotification(`Creating agent: ${name}`);
    const createResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/create/${userAddress}`, {
      method: "POST",
      body: JSON.stringify({ 
        name, 
        ticker, 
        token, 
        curve, 
        image: imageUrl, 
        background, 
        username: username.replace('@', ''), 
        email, 
        password 
      }),
    });

    const { success, message } = await createResponse.json();

    if (!success) {
      setShowError(`${message}. Please try again.`);
      setLoading(false);
      return;
    }

    setNotification("Agent created.");
    setLoading(false);
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
    if (!userAddress) {
      setShowError("Please connect your wallet to create an agent");
      return false;
    }
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
      {/* Regular notifications */}
      {notification && <Notification message={notification} type="info" onClose={handleNotificationClose} />}

      {/* Error notifications */}
      {showError && <Notification message={showError} type="error" onClose={handleNotificationClose} />}

      {/* Loading notifications */}
      {/* {loading.isLoading && <Notification message={loading.message} type="info" duration={8000} />} */}

      <div className={styles.main}>
        <div className={styles.container}>
          <div className={styles.stepsContainer}>
            <div className={`${styles.step} ${step >= 1 ? styles.active : ""}`}>
              <div className={styles.stepIcon}>{step > 1 ? <HiCheck /> : <FaRobot />}</div>
              <span>Agent Details</span>
            </div>
            <div className={`${styles.stepConnector} ${step >= 2 ? styles.active : ""}`} />
            <div className={`${styles.step} ${step >= 2 ? styles.active : ""}`}>
              <div className={styles.stepIcon}>{step > 2 ? <HiCheck /> : <RiTwitterXFill />}</div>
              <span>Connect 𝕏</span>
            </div>
            <div className={`${styles.stepConnector} ${step === 3 ? styles.active : ""}`} />
            <div className={`${styles.step} ${step === 3 ? styles.active : ""}`}>
              <div className={styles.stepIcon}>
                <HiCheck />
              </div>
              <span>Create Agent</span>
            </div>
          </div>

          <div className={`${styles.formContainer} ${loading ? styles.loading : ""}`}>
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
                <button className={styles.nextButton} onClick={handleNextStep}>
                  Next Step
                </button>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
                <h2>Connect 𝕏</h2>
                <div className={styles.inputGroup}>
                  <label htmlFor="username">𝕏 Username</label>
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
                  <label htmlFor="email">𝕏 Email</label>
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
                  <label htmlFor="password">𝕏 Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={agentDetails.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                  />
                </div>
                <h5>Make sure to set your 𝕏 account as automated in account settings</h5>
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
                  <div className={styles.summaryContent}>
                    <div className={styles.summaryHeader}>
                      <Image
                        src={imagePreview}
                        width={120}
                        height={120}
                        alt={`${agentDetails.name} preview`}
                        className={styles.summaryImage}
                      />
                      <div className={styles.summaryDetails}>
                        <p>
                          <strong>Name:</strong> {agentDetails.name}
                        </p>
                        <p>
                          <strong>Ticker:</strong> ${agentDetails.ticker}
                        </p>
                        <p>
                          <strong>𝕏:</strong> @{agentDetails.username}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.infoBox}>
                  <h4>What happens next?</h4>
                  <ul>
                    <li>${agentDetails.ticker} will be deployed on base</li>
                    <li>{agentDetails.name} will start posting to 𝕏 within the hour</li>
                    <li>You can&apos;t update {agentDetails.name}&apos;s details after creation</li>
                    <li>
                      ${agentDetails.ticker} must bond within 48 hoursfor {agentDetails.name} to stay alive
                    </li>
                    <li>Initial deployment may take a few minutes</li>
                  </ul>
                </div>

                <div className={styles.buttonGroup}>
                  <button className={styles.backButton} onClick={() => setStep(2)} disabled={loading}>
                    Back
                  </button>
                  <button className={styles.createButton} onClick={handleSubmit} disabled={loading}>
                    {loading ? `Creating ${agentDetails.name}` : "Create Agent"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
