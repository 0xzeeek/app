import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // HTML content for the Twitter login page with dark theme
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to X</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #000;
          color: #fff;
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          width: 100%;
          max-width: 400px;
          padding: 24px;
        }
        .header {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        h2 {
          text-align: center;
          margin-bottom: 20px;
          font-size: 24px;
          font-weight: bold;
          color: #fff;
        }
        .form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin: 20px 0;
        }
        .inputGroup input {
          width: 100%;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #333;
          background-color: #000;
          color: #fff;
          font-size: 16px;
          box-sizing: border-box;
        }
        .inputGroup input:focus {
          outline: none;
          border-color: #1d9bf0;
        }
        .loginButton {
          background-color: #fff;
          color: #000;
          border: none;
          border-radius: 50px;
          padding: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .loginButton:hover {
          background-color: #e6e6e6;
        }
        .loginButton:disabled {
          background-color: #333;
          color: #666;
          cursor: not-allowed;
        }
        .disclaimer {
          font-size: 12px;
          color: #999;
          text-align: center;
          margin-top: 16px;
        }
        .errorMessage {
          background-color: rgba(255, 0, 0, 0.1);
          color: #ff4d4d;
          padding: 10px;
          border-radius: 4px;
          margin-bottom: 16px;
          text-align: center;
          display: none;
          border: 1px solid rgba(255, 0, 0, 0.2);
        }
        .xLogo {
          fill: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <svg viewBox="0 0 24 24" width="30" height="30" class="xLogo">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
        </div>
        <h2>Sign in to X</h2>
        
        <div id="errorMessage" class="errorMessage"></div>
        
        <form id="loginForm" class="form">
          <div class="inputGroup">
            <input
              type="text"
              id="username"
              placeholder="Username"
              required
            />
          </div>
          <div class="inputGroup">
            <input
              type="email"
              id="email"
              placeholder="Email"
              required
            />
          </div>
          <div class="inputGroup">
            <input
              type="password"
              id="password"
              placeholder="Password"
              required
            />
          </div>
          <button 
            type="submit" 
            id="submitButton"
            class="loginButton"
          >
            Sign in
          </button>
        </form>
        <p class="disclaimer">
          Your credentials are only used to post on behalf of your agent.
          <br>
          Make sure 2FA is disabled for your account.
        </p>
      </div>

      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const form = document.getElementById('loginForm');
          const errorMessage = document.getElementById('errorMessage');
          const submitButton = document.getElementById('submitButton');
          
          // Focus the first input field when the page loads
          document.getElementById('username').focus();
          
          // Handle form submission
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Basic validation
            if (!username || !email || !password) {
              errorMessage.textContent = 'All fields are required';
              errorMessage.style.display = 'block';
              return;
            }
            
            if (!email.includes('@')) {
              errorMessage.textContent = 'Please enter a valid email address';
              errorMessage.style.display = 'block';
              return;
            }
            
            submitButton.disabled = true;
            submitButton.textContent = 'Verifying...';
            
            // Send the credentials back to the parent window
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'TWITTER_CREDENTIALS',
                  credentials: { username, email, password }
                }, window.location.origin);
                
                // Close the popup after sending the message
                setTimeout(() => window.close(), 500);
              } else {
                throw new Error('Could not communicate with the main window');
              }
            } catch (error) {
              errorMessage.textContent = error.message || 'An error occurred';
              errorMessage.style.display = 'block';
              submitButton.disabled = false;
              submitButton.textContent = 'Sign in';
            }
          });
          
          // Handle window close event
          window.addEventListener('beforeunload', function() {
            // Try to notify the parent window that the popup was closed
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'TWITTER_POPUP_CLOSED'
                }, window.location.origin);
              }
            } catch (e) {
              // Ignore errors here
            }
          });
        });
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
} 