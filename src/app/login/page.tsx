"use client";

import { ArrowUpRight, Info } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const API_URL = "https://drvsrv-891166606972.asia-southeast1.run.app";

const USE_LOCAL_FALLBACK = true;

const DEBUG = true;

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordText, setForgotPasswordText] = useState("Forgot password?");
  const [isForgotClicked, setIsForgotClicked] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const [userIP, setUserIP] = useState("");
  const [initialLoading, setInitialLoading] = useState(true); // Initial loading state
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    console.log(
      "%cNgapain buka DevTools? Mau nyari celah? Percuma, gak bakal bisa.",
      "color: gray; font-size: 20px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;"
    );
    console.log(
      "%cMau hapus local storage? Gak akan ngaruh bro.",
      "color: gray; font-size: 20px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;"
    );
    console.log(
      "%cUdah, tutup DevTools-nya. Gak ada yang bisa dioprek di sini.",
      "color: gray; font-size: 20px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;"
    );
    console.log(`
░░░░░░▄▄▄▄▀▀▀▀▀▀▀▀▄▄▄▄▄▄▄
░░░░░█░░░░░░░░░░░░░░░░░░▀▀▄
░░░░█░░░░░░░░░░░░░░░░░░░░░░█
░░░█░░░░░░▄██▀▄▄░░░░░▄▄▄░░░░█
░▄▀░▄▄▄░░█▀▀▀▀▄▄█░░░██▄▄█░░░░█
█░░█░▄░▀▄▄▄▀░░░░░░░░█░░░░░░░░░█
█░░█░█▀▄▄░░░░░█▀░░░░▀▄░░▄▀▀▀▄░█
░█░▀▄░█▄░█▀▄▄░▀░▀▀░▄▄▀░░░░█░░█
░░█░░░▀▄▀█▄▄░█▀▀▀▄▄▄▄▀▀█▀██░█
░░░█░░░░██░░▀█▄▄▄█▄▄█▄▄██▄░░█
░░░░█░░░░▀▀▄░█░░░█░█▀█▀█▀██░█
░░░░░▀▄░░░░░▀▀▄▄▄█▄█▄█▄█▄▀░░█
░░░░░░░▀▄▄░░░░░░░░░░░░░░░░░░░█
░░▐▌░█░░░░▀▀▄▄░░░░░░░░░░░░░░░█
░░░█▐▌░░░░░░█░▀▄▄▄▄▄░░░░░░░░█
░░███░░░░░▄▄█░▄▄░██▄▄▄▄▄▄▄▄▀
░▐████░░▄▀█▀█▄▄▄▄▄█▀▄▀▄
░░█░░▌░█░░░▀▄░█▀█░▄▀░░░█
░░█░░▌░█░░█░░█░░░█░░█░░█
░░█░░▀▀░░██░░█░░░█░░█░░█
░░░▀▀▄▄▀▀░█░░░▀▄▀▀▀▀█░░█
░░░░░░░░░░█░░░░▄░░▄██▄▄▀
░░░░░░░░░░█░░░░▄░░████
░░░░░░░░░░█▄░░▄▄▄░░▄█
░░░░░░░░░░░█▀▀░▄░▀▀█
░░░░░░░░░░░█░░░█░░░█
░░░░░░░░░░░█░░░▐░░░█
░░░░░░░░░░░█░░░▐░░░█
░░░░░░░░░░░█░░░▐░░░█
░░░░░░░░░░░█░░░▐░░░█
░░░░░░░░░░░█░░░▐░░░█
░░░░░░░░░░░█▄▄▄▐▄▄▄█
░░░░░░░▄▄▄▄▀▄▄▀█▀▄▄▀▄▄▄▄
░░░░░▄▀▄░▄░▄░░░█░░░▄░▄░▄▀▄
░░░░░█▄▄▄▄▄▄▄▄▄▀▄▄▄▄▄▄▄▄▄█

%c Salam hangat "developer ganteng"`, `color: gray; font-size: 20px; font-weight: bold; font-family: Arial, Helvetica, sans-serif;
    `);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Keep loading on for initial data fetch
        setInitialLoading(true);
        
        // Fetch IP and block status in parallel
        const [ipResponse, blockResponse] = await Promise.allSettled([
          fetch(`${API_URL}/get-ip`),
          fetch(`${API_URL}/is-blocked`)
        ]);
        
        // Process IP response
        if (ipResponse.status === 'fulfilled' && ipResponse.value.ok) {
          const ipData = await ipResponse.value.json();
          setUserIP(ipData.ip);
        } else {
          console.error("Error fetching IP:", ipResponse);
          setUserIP("Unable to detect IP");
        }
        
        // Process block status response
        if (blockResponse.status === 'fulfilled' && blockResponse.value.ok) {
          const blockData = await blockResponse.value.json();
          if (blockData.blocked) {
            setIsLocked(true);
          }
        } else {
          console.error("Error checking block status:", blockResponse);
          // Use local storage as fallback
          if (localStorage.getItem("isLocked")) {
            setIsLocked(true);
          }
        }
        
        // Check local storage for disabled state
        if (localStorage.getItem("isDisabled")) {
          setIsDisabled(true);
        }
        
        // Simulate minimum loading time for better UX
        setTimeout(() => {
          setInitialLoading(false);
        }, 800); // Minimum loading time of 800ms for better visual effect
        
      } catch (error) {
        console.error("Error during initial data fetch:", error);
        
        // Fallback to local storage
        if (localStorage.getItem("isLocked")) {
          setIsLocked(true);
        }
        if (localStorage.getItem("isDisabled")) {
          setIsDisabled(true);
        }
        
        setInitialLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Report failed login attempts to the server
  const reportFailedAttempt = async (attempts: number) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Using correct endpoint from your server code
      const response = await fetch(`${API_URL}/login-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attempts }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Handle different response status codes
      if (response.status === 403) {
        triggerLockout();
        localStorage.setItem("isLocked", "true");
        return { blocked: true };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error reporting failed attempt:", error);
      // If API call fails, still trigger lockout after 3 attempts for client-side protection
      if (attempts >= 3) {
        triggerLockout();
        localStorage.setItem("isLocked", "true");
      }
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Jika akun terkunci, hentikan proses login
    if (isLocked) return;

    // Cek jika password kosong
    if (!password) {
      setError("Password cannot be empty.");
      return;
    }

    setIsLoading(true);
    setError("");

    // For debugging - log what's happening
    if (DEBUG) console.log("Attempting login with password:", password ? "********" : "empty");

    try {
      const res = await signIn("credentials", { 
        redirect: false,
        password,
        callbackUrl: "/"
      });

      if (DEBUG) console.log("Sign in response:", res);

      if (res?.error) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (DEBUG) console.log("Failed attempt #", newFailedAttempts);

        try {
          // Report failed attempt to server
          const reportResult = await reportFailedAttempt(newFailedAttempts);
          if (DEBUG) console.log("Report result:", reportResult);
        } catch (apiError) {
          console.error("Could not report to API, using local fallback");
          // Continue with local logic even if API call fails
        }

        setTimeout(() => {
          setIsLoading(false);

          if (newFailedAttempts >= 3) {
            // Trigger lockout
            if (DEBUG) console.log("Triggering lockout after 3 failed attempts");
            triggerLockout();
            localStorage.setItem("isLocked", "true");
          } else {
            setError(`Incorrect password. Please try again. (${newFailedAttempts}/3 attempts)`);
          }
        }, 1000);
      } else if (res?.url) {
        if (DEBUG) console.log("Login successful, redirecting to:", res.url);
        setTimeout(() => router.push("/"), 1000);
      } else {
        // Handle unexpected response
        if (DEBUG) console.log("Unexpected response:", res);
        setTimeout(() => {
          setError("An error occurred. Please try again.");
          setIsLoading(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Login error:", error);
      setTimeout(() => {
        setError("An error occurred. Please try again.");
        setIsLoading(false);
      }, 1000);
    }
  };

  const triggerLockout = () => {
    // Clear existing error
    setError("Your IP has been blocked due to multiple failed login attempts.");
    setIsLocked(true);
    
    // Start redirect countdown
    setRedirectCountdown(10);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isForgotClicked) return;
    
    setIsForgotClicked(true);
    
    // Erase text with typing animation
    let text = forgotPasswordText;
    const eraseInterval = setInterval(() => {
      text = text.substring(0, text.length - 1);
      setForgotPasswordText(text);
      
      if (text.length === 1) {
        clearInterval(eraseInterval);
        
        // Type new message
        const messages = [
          "Only admin has access to this feature.",
          "This feature is restricted."
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        let newText = "";
        let charIndex = 0;
        
        const typeInterval = setInterval(() => {
          newText += randomMessage[charIndex];
          setForgotPasswordText(newText);
          charIndex++;
          
          if (charIndex === randomMessage.length) {
            clearInterval(typeInterval);
            setIsDisabled(true);
            localStorage.setItem("isDisabled", "true");
          }
        }, 10);
      }
    }, 100);
  };

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null;
    
    if (redirectCountdown !== null && redirectCountdown > 0) {
      countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev !== null) {
            return prev - 1;
          }
          return null;
        });
      }, 1000);
    } else if (redirectCountdown === 0) {
      // Redirect to Google after countdown
      window.location.href = "https://www.google.com";
    }
    
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [redirectCountdown]);

  // If in initial loading state, show loading UI
  if (initialLoading) {
    return (
      <div className="min-h-screen px-20 select-none flex flex-col items-center justify-center p-4 transition-all duration-500 bg-base">
        <div className="w-full max-w-[58.5rem]">
          <div className="rounded-3xl overflow-hidden shadow-default p-8 relative transition-all duration-500 bg-fore">
            {/* Full-width loading bar */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 overflow-hidden">
              <div className="loading-bar"></div>
            </div>
            
            <div className="min-h-[286px] flex flex-col items-center justify-center">
              <img 
                src="/images/google.png" 
                alt="Google Logo" 
                className="mb-6 h-6 min-h-[2.4rem] min-w-[2.4rem]"
              />
              <div className="text-center">
                <h2 className="text-xl font-medium text-gray-700">Sign in to Google Drive</h2>
                <p className="text-sm text-gray-500 mt-2">Please wait while we set up a secure connection</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex text-gray-700 justify-between text-xs px-5">
            <a href="#" className="gap-1 flex items-center flex-row hover:bg-gray-200 rounded-md p-1 px-2 transition-colors duration-200 ">
              Privacy policy <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <div className="flex space-x-6 text-xs">
              <a href="#" className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200">Help</a>
              <a href="#" className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200">Terms</a>
            </div>
          </div>
        </div>
        
        {/* Add CSS for animations */}
        <style jsx global>{`
          /* Google-style loading bar animation */
          .loading-bar {
            width: 30%;
            height: 100%;
            background-color: #4285F4;
            position: absolute;
            animation: loading 1.5s infinite ease-in-out;
          }
          
          @keyframes loading {
            0% {
              left: -30%;
            }
            50% {
              left: 100%;
            }
            100% {
              left: 100%;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col select-none items-center justify-center p-4 px-20 transition-all duration-500 bg-base`}>
      <div className="w-full max-w-[58.5rem]">
        <div className={`rounded-3xl overflow-hidden shadow-default p-8 relative transition-all duration-500 bg-fore`}>
          {/* Google-style loop loading bar */}
          {isLoading && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 overflow-hidden">
              <div className="loading-bar"></div>
            </div>
          )}
          
          <div className="flex flex-row">
            <div className="mb-6 max-w-sm w-full mr-0 lg:mr-15">
              <img 
                src="/images/google.png" 
                alt="Google Logo" 
                className="mb-6 h-6 min-h-[2.4rem] min-w-[2.4rem]"
              />
              
              <h1 className={`!font-product-sans text-4xl font-light mb-4 ${isLocked ? 'text-gray-800' : 'text-gray-800'}`}>
                {isLocked || isDisabled ? "Access Restricted" : "Sign in"}
              </h1>
              <p className={`mt-1 text-sm font-light line-h text-gray-700`}>
                {isLocked ? 
                  "Too many failed login attempts. Please try again later." : 
                  isDisabled ? 
                    "You no longer have access to this website. Please leave and do not attempt to return." : 
                    "Enter the application password to continue. This is an independent service and not associated with Google."}
              </p>
              
              {redirectCountdown !== null && (
                <div className="mt-4 p-4 border border-blue-200 bg-blue-50 text-blue-800 rounded-md">
                  <p className="font-medium">Redirecting in {redirectCountdown} seconds</p>
                  <p className="text-sm mt-1">You will be automatically redirected to Google.com</p>
                </div>
              )}
            </div>
            
            <form ref={formRef} onSubmit={handleSubmit} className={`mt-18 flex flex-col w-full justify-center transition-all duration-300`}>
              <div className={`${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Google-style floating label input */}
                <div className={`relative ${isDisabled || isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    disabled={isLocked || isDisabled}
                    className={`text-sm w-full px-3.5 py-[0.83rem] border-[1.2px] rounded-smc text-gray-900 focus:outline-none focus:border-blue-500 transition-colors duration-200 ${isDisabled ? "cursor-not-allowed" : ""} ${isLocked || isDisabled ? 'border-gray-300 bg-gray-100' : 'border-gray-800'}`}
                    placeholder=""
                  />
                  <label 
                    htmlFor="password" 
                    className={`absolute text-sm text-light  transition-all duration-200 pointer-events-none px-1.5
                      ${isInputFocused || password ? 
                        'text-xxs -top-2 text-primary' : 
                        'top-1/2 transform -translate-y-1/2 text-gray-500'
                      } 
                      ${isLocked || isDisabled ? 'bg-gray-100' : 'bg-white'}
                      left-2`}
                  >
                    Enter password
                  </label>
                </div>
                
                <div className="mt-2">
                  <a 
                    href="#" 
                    onClick={handleForgotPassword}
                    className={`relative text-xs font-medium transition-colors duration-300
                      ${isForgotClicked ? 'text-gray-600 cursor-default' 
                        : isLocked || isDisabled ? 'text-gray-400 cursor-default' 
                        : 'text-primary hover:text-primary-dark'}
                      after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 
                      after:h-[0.3px] after:bg-blue-500 after:transition-all after:duration-300 hover:after:w-full`}
                  >
                    {forgotPasswordText}
                  </a>
                </div>
              </div>
              
              {error && (
                <div className="flex flex-row gap-2 mt-4 text-xs py-2 rounded-md text-red-600">
                  <Info className="w-4 h-4" strokeWidth={1} />
                  {error}
                </div>
              )}

              <div className="mt-6 text-xs">
                <p className={`${isLocked ? "text-red-400" : "text-gray-600"} `}>
                  {isLocked ? "Your current IP address has been temporarily blocked due to multiple failed login attempts." : isDisabled ? "You're attempting to log in? Interesting. However, this isn't for you." : "Your current IP address will be blocked after multiple failed attempts."} 
                </p>
                <a href="#" className={`relative text-xs font-medium 
                  ${isLocked ? 'text-gray-500 hover:text-gray-700' : 'text-primary hover:text-primary-dark'}
                  after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[0.3px] 
                  after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 
                  hover:after:scale-x-100`}>
                  {isDisabled ? "Learn more about restricted access policies" 
                              : isLocked && userIP ? `IPv6: ${userIP}` 
                              : "Need help? Learn about login requirements"}
                </a>
              </div>

              <div className="flex justify-end gap-3 items-center mt-8">
                <div className="hover:bg-hover rounded-md px-4 py-2">

                  <div
                    onClick={() => (window.location.href = "https://drive.google.com/")}
                    className={`text-xs font-medium px-4 py-2 bg-white hover:bg-secondary transition-all duration-300 rounded-full cursor-pointer ${isLocked ? "text-gray-600" : "text-primary"}`}
                  >
                    Go to Google Drive
                  </div>

                </div>
                <button
                  type="submit"
                  disabled={isLoading || isLocked}
                  className={`px-6 py-2 rounded-full text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 relative overflow-hidden 
                    ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
                    ${isLocked || isDisabled ? 
                      'bg-gray-400 cursor-not-allowed' : 
                      isLoading ? 
                        'bg-primary cursor-not-allowed' : 
                        'bg-primary hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 focus:ring-primary'}`}
                >
                  {isLoading ? (
                    <div className={`flex flex-row items-center `}>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Next
                    </div>
                  ) : isLocked ? 'Locked' : 'Next'}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="mt-6 flex text-gray-700 justify-between text-xs px-5">
          <a href="#" className="gap-1 flex items-center flex-row hover:bg-gray-200 rounded-md p-1 px-2 transition-colors duration-200 ">
            Privacy policy <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <div className="flex space-x-6 text-xs">
            <a href="#" className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200">Help</a>
            <a href="#" className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200">Terms</a>
          </div>
        </div>
      </div>
      
      {/* Add CSS for animations */}
      <style jsx global>{`
        /* Google-style loading bar animation */
        .loading-bar {
          width: 30%;
          height: 100%;
          background-color: #4285F4;
          position: absolute;
          animation: loading 1.5s infinite ease-in-out;
        }
        
        @keyframes loading {
          0% {
            left: -30%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}