"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Notification from "@/components/utils/Notification";
import { useRouter } from "next/navigation";
import { useEthereum } from "@/hooks/useEthereum";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { FaRobot } from "react-icons/fa";
import { RiTwitterXFill } from "react-icons/ri";
import { HiCheck } from "react-icons/hi";

import { CreateResult, ErrorResult } from "@/lib/types";

import styles from "./page.module.css";
import axios from "axios";

const CREATE_AGENT_URL = process.env.NEXT_PUBLIC_CREATE_AGENT_URL || "";

// Replace the TwitterLoginModal component with a function to open a popup window
const openTwitterPopup = (setConnectingTwitter) => {
  // Define popup dimensions and position
  const width = 500;
  const height = 600;
  const left = window.screen.width / 2 - width / 2;
  const top = window.screen.height / 2 - height / 2;
  
  // Open the popup window with the API route
  const popup = window.open(
    '/api/twitter-login',
    'TwitterLogin',
    `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
  );
  
  // Check if popup was closed without submitting
  const checkPopupClosed = setInterval(() => {
    if (popup && popup.closed) {
      clearInterval(checkPopupClosed);
      setConnectingTwitter(false);
    }
  }, 1000);
  
  // Return the popup reference so we can check its status
  return popup;
};

export default function CreatePage() {
  const [step, setStep] = useState(2);
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
  const [twitterModalOpen, setTwitterModalOpen] = useState(false);
  const [connectingTwitter, setConnectingTwitter] = useState(false);

  const router = useRouter();
  const { create } = useEthereum();
  const { connect } = useConnect();
  const { address: userAddress } = useAccount();

  // Ref for the file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Update the checkTwitterAccount function to work with the popup flow
  const checkTwitterAccount = async (credentials) => {
    setVerifyingTwitter(true);
    const result = await fetch("/api/verify", {
      method: "POST",
      body: JSON.stringify({
        username: credentials.username.replace("@", ""),
        password: credentials.password,
        email: credentials.email,
      }),
    });
    const { success } = await result.json();
    setVerifyingTwitter(false);
    
    if (success) {
      // Update agent details with the verified credentials
      setAgentDetails(prev => ({
        ...prev,
        username: credentials.username.replace("@", ""),
        password: credentials.password,
        email: credentials.email
      }));
    }
    
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
    setNotification(`Minting $${ticker}.`);
    const createResult = await create(name, ticker);

    if ((createResult as ErrorResult).message) {
      setShowError((createResult as ErrorResult).message);
      setLoading(false);
      return;
    }

    const { token, curve, block } = createResult as CreateResult;

    // Create the agent
    setNotification(`Deploying ${name}.`);
    console.log("url:", CREATE_AGENT_URL);
    const createResponse = await axios.post(CREATE_AGENT_URL, {
      user: userAddress,
      name,
      ticker: ticker.toUpperCase(),
      agentId: token,
      curve,
      block,
      image: imageUrl,
      background,
      username: username.replace("@", ""),
      email,
      password,
    });

    console.log("Create response:", createResponse);

    const { success, message } = createResponse.data;

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

  // Add a function to handle messages from the popup
  useEffect(() => {
    // Create a message handler for the popup window
    const handleTwitterMessage = (event) => {
      // Make sure the message is from our domain for security
      if (event.origin !== window.location.origin) return;
      
      console.log('Received message:', event.data);
      
      // Check if the message contains Twitter credentials
      if (event.data && event.data.type === 'TWITTER_CREDENTIALS') {
        const credentials = event.data.credentials;
        handleTwitterConnect(credentials);
      }
    };
    
    // Add the event listener
    window.addEventListener('message', handleTwitterMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleTwitterMessage);
    };
  }, []);

  // Add a timeout for the connection
  useEffect(() => {
    let timeoutId;
    
    if (connectingTwitter) {
      timeoutId = setTimeout(() => {
        setConnectingTwitter(false);
        setShowError("Connection timed out. Please try again.");
      }, 60000); // 1 minute timeout
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connectingTwitter]);

  const handleTwitterConnect = async (credentials) => {
    console.log('Credentials received:', credentials);
    
    // Keep the connecting state active during verification
    // (setConnectingTwitter is already true at this point)
    
    // Update the connecting message to show verification is happening
    setVerifyingTwitter(true);
    
    const isTwitterValid = await checkTwitterAccount(credentials);
    
    // Reset states
    setConnectingTwitter(false);
    setVerifyingTwitter(false);
    
    if (isTwitterValid) {
      setStep(3);
    } else {
      setShowError("Could not connect 𝕏 account - check your settings and disable 2FA");
    }
  };

  const handleNextStep = async () => {
    if (step === 1) {
      if (!userAddress) {
        connect({ connector: injected() });
        return;
      }
      if (validateStepOne()) {
        setStep(2);
      }
    } else if (step === 2) {
      // Open Twitter popup and set connecting state
      setConnectingTwitter(true);
      openTwitterPopup(setConnectingTwitter);
    }
  };

  // Needed for SSR issue
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const buttonLabel = !hasHydrated
  ? "Next Step"
  : userAddress ? "Next Step" : "Connect Wallet";

  return (
    <>
      {/* Regular notifications */}
      {notification && <Notification message={notification} type="info" onClose={handleNotificationClose} />}

      {/* Error notifications */}
      {showError && <Notification message={showError} type="error" duration={5000} onClose={handleNotificationClose} />}

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
                    maxLength={25}
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
                    maxLength={10}
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
                <button className={`${styles.nextButton} plausible-event-name=info`} onClick={handleNextStep}>
                  {buttonLabel}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepContent}>
                <h2>Connect 𝕏</h2>
                <div className={styles.twitterConnectContainer}>
                  <p>Connect your 𝕏 account to allow your agent to post automatically.</p>
                  <button 
                    className={`${styles.twitterConnectButton} plausible-event-name=connect-twitter`} 
                    onClick={handleNextStep}
                    disabled={connectingTwitter}
                  >
                    <RiTwitterXFill size={20} />
                    {connectingTwitter ? "Connecting..." : "Connect 𝕏 Account"}
                  </button>
                  {connectingTwitter && (
                    <div className={styles.connectingMessage}>
                      Please complete the authentication in the popup window...
                    </div>
                  )}
                  <div className={styles.twitterNotes}>
                    <p>Make sure your 𝕏 account:</p>
                    <ul>
                      <li>Has 2FA disabled</li>
                      <li>Is following relevant accounts</li>
                      <li>Is set to allow automated posting</li>
                    </ul>
                  </div>
                </div>
                <div className={styles.buttonGroup}>
                  <button 
                    className={styles.backButton} 
                    onClick={() => setStep(1)}
                    disabled={connectingTwitter}
                  >
                    Back
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
                    <li>${agentDetails.ticker} will be deployed on Base</li>
                    <li>{agentDetails.name} will start posting to 𝕏 within the hour</li>
                    <li>${agentDetails.ticker} must bond within 7 days for {agentDetails.name} to stay alive</li>
                    <li>Agents with the same 𝕏 account will be overwritten</li>
                    <li>Initial deployment may take a few minutes</li>
                  </ul>
                </div>

                <div className={styles.buttonGroup}>
                  <button className={styles.backButton} onClick={() => setStep(2)} disabled={loading}>
                    Back
                  </button>
                  <button className={`${styles.createButton} plausible-event-name=create`} onClick={handleSubmit} disabled={loading}>
                    {loading ? `Creating ${agentDetails.name}` : "Create Agent"}
                  </button>
                </div>
                <p className={styles.comingSoon}>Coming soon: agents will hold and trade their own $TOKEN</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
