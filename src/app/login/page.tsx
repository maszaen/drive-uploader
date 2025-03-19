// app/login/page.tsx
'use client'

import { ArrowUpRight, Info } from 'lucide-react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const API_URL = 'https://drvsrv-891166606972.asia-southeast1.run.app'

export default function LoginPage() {
  const [password, setPassword] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [forgotPasswordText, setForgotPasswordText] =
    useState<string>('Forgot password?')
  const [isForgotClicked, setIsForgotClicked] = useState<boolean>(false)
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false)
  const [failedAttempts, setFailedAttempts] = useState<number>(0)
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isDisabled, setIsDisabled] = useState<boolean>(false)
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null
  )
  const [userIP, setUserIP] = useState<string>('')
  const [initialLoading, setInitialLoading] = useState<boolean>(true)
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('unknown')
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault()
    if (isForgotClicked) return

    setIsForgotClicked(true)

    let text = forgotPasswordText
    const eraseInterval = setInterval(() => {
      text = text.substring(0, text.length - 1)
      setForgotPasswordText(text)

      if (text.length === 1) {
        clearInterval(eraseInterval)

        const messages = [
          'Only admin has access to this feature.',
          'This feature is restricted.',
        ]

        const randomMessage =
          messages[Math.floor(Math.random() * messages.length)]
        let newText = ''
        let charIndex = 0

        const typeInterval = setInterval(() => {
          newText += randomMessage[charIndex]
          setForgotPasswordText(newText)
          charIndex++

          if (charIndex === randomMessage.length) {
            clearInterval(typeInterval)
            setIsDisabled(true)
          }
        }, 10)
      }
    }, 100)
  }

  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        const visitorId = result.visitorId

        setDeviceFingerprint(visitorId)

        document.cookie = `device_fingerprint=${visitorId}; path=/; max-age=2592000; samesite=strict${
          window.location.protocol === 'https:' ? '; secure' : ''
        }`
      } catch (error) {
        console.error('Error generating fingerprint:', error)
      }
    }

    generateFingerprint()
  }, [])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitialLoading(true)

        let fingerprint = 'unknown'
        try {
          const fp = await FingerprintJS.load()
          const result = await fp.get()
          fingerprint = result.visitorId
          setDeviceFingerprint(fingerprint)

          document.cookie = `device_fingerprint=${fingerprint}; path=/; max-age=2592000; samesite=strict${
            window.location.protocol === 'https:' ? '; secure' : ''
          }`
        } catch (fpError) {
          console.error('Error generating fingerprint:', fpError)
        }

        // Periksa status login
        try {
          const statusResponse = await fetch(`${API_URL}/check-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fingerprint }),
          })

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            console.log('Login status:', statusData)

            // Set jumlah percobaan
            if (statusData.attempts) {
              setFailedAttempts(statusData.attempts)
            }

            // Periksa jika diblokir
            if (statusData.blocked) {
              setIsLocked(true)
              localStorage.setItem('isLocked', 'true')
              setError(
                'Your access has been blocked due to too many failed attempts.'
              )
            }
            // Periksa jika ada countdown aktif
            else if (statusData.countdownActive && statusData.countdownUntil) {
              const now = Date.now()
              const timeLeft = Math.ceil(
                (statusData.countdownUntil - now) / 1000
              )

              if (timeLeft > 0) {
                setIsLocked(true)
                setRedirectCountdown(timeLeft)

                // Tampilkan pesan countdown berdasarkan jumlah percobaan
                if (statusData.attempts === 3) {
                  setError(
                    'Too many failed attempts! Please wait before trying again.'
                  )
                } else if (statusData.attempts === 5) {
                  setError(
                    'Too many failed attempts! Please wait before trying again.'
                  )
                } else if (statusData.attempts === 6) {
                  setError(
                    'Too many failed attempts! Please wait before trying again.'
                  )
                }
              }
            }
          }
        } catch (error) {
          console.error('Status check failed:', error)
          if (localStorage.getItem('isLocked')) {
            setIsLocked(true)
          }
        }

        if (localStorage.getItem('isDisabled')) {
          setIsDisabled(true)
        }

        setTimeout(() => {
          setInitialLoading(false)
        }, 800)
      } catch (error) {
        console.error('Initial data fetch failed:', error)
        setInitialLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  const reportFailedAttempt = async (attempts: number) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const fingerprintCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('device_fingerprint='))

      const fingerprint = fingerprintCookie
        ? fingerprintCookie.split('=')[1]
        : 'unknown'

      const response = await fetch(`${API_URL}/login-attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attempts,
          fingerprint,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.status === 403) {
        setIsLocked(true)
        localStorage.setItem('isLocked', 'true')
        return { blocked: true }
      }

      const data = await response.json()

      // Jika ada countdown, mulai countdown di sisi client
      if (data.countdownActive && data.countdownUntil) {
        const now = Date.now()
        const timeLeft = Math.ceil((data.countdownUntil - now) / 1000)

        if (timeLeft > 0) {
          setIsLocked(true)
          setRedirectCountdown(timeLeft)
        }
      }

      return data
    } catch (error) {
      console.error('Failed to report attempt:', error)
      if (attempts >= 7) {
        setIsLocked(true)
        localStorage.setItem('isLocked', 'true')
      }
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLocked || redirectCountdown !== null) return

    if (!password) {
      setError('Password cannot be empty.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await signIn('credentials', {
        redirect: false,
        password,
        fingerprint: deviceFingerprint,
        callbackUrl: '/',
      })

      if (res?.error) {
        const newFailedAttempts = failedAttempts + 1
        setFailedAttempts(newFailedAttempts)

        // Laporkan percobaan ke server
        const reportResult = await reportFailedAttempt(newFailedAttempts)

        // Periksa jika diblokir
        if (reportResult?.blocked) {
          setError(
            'Your account has been permanently blocked due to too many failed attempts.'
          )
        }
        // Tampilkan pesan countdown berdasarkan jumlah percobaan
        else if (newFailedAttempts === 3) {
          setError(
            'Too many failed attempts! Please wait 10 seconds before trying again.'
          )
        } else if (newFailedAttempts === 5) {
          setError(
            'Too many failed attempts! Please wait 20 seconds before trying again.'
          )
        } else if (newFailedAttempts === 6) {
          setError(
            'Too many failed attempts! Please wait 25 seconds before trying again.'
          )
        } else if (newFailedAttempts >= 7) {
          blockUserNow()
          setError(
            'Your account has been permanently blocked due to too many failed attempts.'
          )
        } else {
          setError(
            `Incorrect password. Please try again. (${newFailedAttempts}/7 attempts)`
          )
        }

        setTimeout(() => setIsLoading(false), 1000)
      } else if (res?.url) {
        // Reset percobaan pada login berhasil
        await reportFailedAttempt(0)
        setTimeout(() => router.push('/'), 1000)
      } else {
        setTimeout(() => {
          setError('An error occurred. Please try again.')
          setIsLoading(false)
        }, 1000)
      }
    } catch (error) {
      setTimeout(() => {
        setError('An error occurred. Please try again.')
        setIsLoading(false)
      }, 1000)
    }
  }

  const blockUserNow = async () => {
    try {
      const fingerprintCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('device_fingerprint='))

      const fingerprint = fingerprintCookie
        ? fingerprintCookie.split('=')[1]
        : 'unknown'

      const response = await fetch(`${API_URL}/block-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fingerprint,
        }),
      })

      setIsLocked(true)
      localStorage.setItem('isLocked', 'true')
      setError('Your IP and device fingerprint have been permanently blocked.')

      return response.json()
    } catch (error) {
      console.error('Failed to block user:', error)
      setIsLocked(true)
      localStorage.setItem('isLocked', 'true')
      setError('Your access has been blocked due to security concerns.')
      return null
    }
  }

  // Mengelola countdown timer
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout | null = null

    if (redirectCountdown !== null && redirectCountdown > 0) {
      countdownInterval = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev !== null && prev > 1) {
            return prev - 1
          } else {
            // Countdown selesai
            setIsLocked(false)
            return null
          }
        })
      }, 1000)
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval)
    }
  }, [redirectCountdown])

  if (initialLoading) {
    return (
      <div className="min-h-screen px-0 md:px-10 lg:px-20 select-none flex flex-col items-center justify-center transition-all duration-500 bg-fore md:bg-base">
        <div className="w-full max-w-full md:max-w-[58.5rem]">
          <div className="md:rounded-3xl h-screen md:h-auto overflow-hidden shadow-default p-8 relative transition-all duration-500 bg-fore">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 overflow-hidden">
              <div className="loading-bar"></div>
            </div>

            <div className="min-h-[286px] flex flex-col items-center justify-center">
              <img
                src="/images/drivogle.png"
                alt="Google Logo"
                className="mb-6 h-6 min-h-[2.4rem] min-w-[2.4rem]"
              />
              <div className="text-center">
                <h2 className="text-xl font-medium text-gray-700">
                  Sign in to Drivogle
                </h2>
                <p className="text-sm font-normal text-gray-500 mt-2">
                  Please wait while we set up a secure connection
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 hidden md:flex text-gray-700 justify-between text-xs px-5">
            <a
              href="#"
              className="gap-1 flex items-center flex-row hover:bg-gray-200 rounded-md p-1 px-2 transition-colors duration-200 "
            >
              Privacy policy{' '}
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <div className="flex space-x-6 text-xs">
              <a
                href="#"
                className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200"
              >
                Help
              </a>
              <a
                href="#"
                className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200"
              >
                Terms
              </a>
            </div>
          </div>
        </div>

        <style jsx global>{`
          .loading-bar {
            width: 30%;
            height: 100%;
            background-color: #4285f4;
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
    )
  }

  return (
    <div
      className={`min-h-screen flex flex-col select-none items-center justify-center px-0 md:px-10 lg:px-20 transition-all duration-500 bg-base md:bg-base`}
    >
      <div className="w-full max-w-[58.5rem]">
        <div
          className={`md:rounded-3xl overflow-hidden h-screen md:h-auto shadow-default p-8 relative transition-all duration-500 bg-fore`}
        >
          {isLoading && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 overflow-hidden">
              <div className="loading-bar"></div>
            </div>
          )}

          <div className="flex flex-col md:flex-row">
            <div className="mb-6 max-w-sm w-full mr-10 lg:mr-15">
              <img
                src="/images/drivogle.png"
                alt="Google Logo"
                className="mb-6 h-6 min-h-[2.4rem] min-w-[2.4rem]"
              />

              <h1
                className={`!font-product-sans text-4xl font-normal leading-10 pr-10 mb-4 ${isLocked ? 'text-gray-800' : 'text-gray-800'}`}
              >
                {isLocked || isDisabled ? 'Access Restricted' : 'Sign in'}
              </h1>
              <p
                className={`mt-1 text-sm font-normal line-h text-gray-700 pr-10`}
              >
                {isLocked && redirectCountdown !== null
                  ? `Login temporarily restricted. Please wait ${redirectCountdown} seconds before trying again.`
                  : isLocked
                    ? 'Your login attempts have exceeded the allowed limit. Your access has been blocked.'
                    : isDisabled
                      ? 'You no longer have access to this website. Please leave and do not attempt to return.'
                      : 'Enter the application password to continue. This is an independent service and not associated with Google.'}
              </p>

              {redirectCountdown !== null && (
                <div className="mt-4 p-4 border border-blue-200 bg-blue-50 text-blue-800 rounded-md">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Too many failed login attempts.
                      </p>
                      <p className="text-sm mt-2">
                        Please wait{' '}
                        <span className="font-bold">
                          {redirectCountdown} seconds
                        </span>{' '}
                        before trying again.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className={`mt-18 flex flex-col w-full justify-center transition-all duration-300`}
            >
              <div
                className={`${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div
                  className={`relative ${isDisabled || isLocked ? 'opacity-50 pointer-events-none' : ''}`}
                >
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
                    className={`text-sm w-full px-3.5 py-[0.83rem] border-[1.2px] rounded-smc text-gray-900 focus:outline-none focus:border-blue-500 transition-colors duration-200 ${isDisabled ? 'cursor-not-allowed' : ''} ${isLocked || isDisabled ? 'border-gray-300 bg-gray-100' : 'border-gray-800'}`}
                    placeholder=""
                  />
                  <label
                    htmlFor="password"
                    className={`absolute text-sm font-normal transition-all duration-200 pointer-events-none px-1.5
                      ${
                        isInputFocused || password
                          ? 'text-xxs -top-2 text-primary bg-white'
                          : 'top-1/2 transform -translate-y-1/2 text-gray-500'
                      } 
                      ${isLocked || isDisabled ? 'bg-gray-100' : ''}
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
                      ${
                        isForgotClicked
                          ? 'text-gray-600 cursor-default'
                          : isLocked || isDisabled
                            ? 'text-gray-400 cursor-default'
                            : 'text-primary hover:text-primary-dark'
                      }
                      after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 
                      after:h-[0.3px] after:bg-blue-500 after:transition-all after:duration-300 hover:after:w-full`}
                  >
                    {forgotPasswordText}
                  </a>
                </div>
              </div>

              {error && (
                <div className="flex flex-row font-normal gap-2 mt-4 text-xs py-2 rounded-md text-red-600">
                  <Info className="w-4 h-4" strokeWidth={1} />
                  {error}
                </div>
              )}

              <div className="mt-6 text-xs font-normal">
                <p
                  className={`${isLocked ? 'text-red-400' : 'text-gray-600'} `}
                >
                  {isLocked && redirectCountdown !== null
                    ? `Your login access is temporarily restricted for ${redirectCountdown} seconds.`
                    : isLocked
                      ? 'Your current IP address has been blocked due to multiple failed login attempts.'
                      : isDisabled
                        ? "You're attempting to log in? Interesting. However, this isn't for you."
                        : 'Your current IP address will be blocked after multiple failed attempts.'}
                </p>
                <a
                  href="#"
                  className={`relative text-xs font-medium 
                  ${isLocked ? 'text-gray-500 hover:text-gray-700' : 'text-primary hover:text-primary-dark'}
                  after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[0.3px] 
                  after:bg-primary after:scale-x-0 after:origin-left after:transition-transform after:duration-300 
                  hover:after:scale-x-100`}
                >
                  {isDisabled
                    ? 'Learn more about restricted access policies'
                    : isLocked && userIP
                      ? `IP: ${userIP}`
                      : 'Need help? Learn about login requirements'}
                </a>
              </div>

              <div className="flex justify-end gap-3 items-center mt-8">
                <div className="hover:bg-hover rounded-md px-4 py-2">
                  <div
                    onClick={() =>
                      (window.location.href = 'https://drive.google.com/')
                    }
                    className={`text-xs font-medium px-4 py-2 bg-white hover:bg-secondary transition-all duration-300 rounded-full cursor-pointer ${isLocked ? 'text-gray-600' : 'text-primary'}`}
                  >
                    Go to Google Drive
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || isLocked}
                  className={`px-6 py-2 rounded-full text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 relative overflow-hidden 
                    ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
                    ${
                      isLocked || isDisabled
                        ? 'bg-gray-400 cursor-not-allowed'
                        : isLoading
                          ? 'bg-primary cursor-not-allowed'
                          : 'bg-primary hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 focus:ring-primary'
                    }`}
                >
                  {isLoading ? (
                    <div className={`flex flex-row items-center `}>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Next
                    </div>
                  ) : redirectCountdown !== null ? (
                    `Wait ${redirectCountdown}s`
                  ) : isLocked ? (
                    'Locked'
                  ) : (
                    'Next'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="mt-6 hidden md:flex text-gray-700 justify-between text-xs px-5">
          <a
            href="#"
            className="gap-1 flex items-center flex-row hover:bg-gray-200 rounded-md p-1 px-2 transition-colors duration-200 "
          >
            Privacy policy{' '}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <div className="flex space-x-6 text-xs">
            <a
              href="#"
              className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200"
            >
              Help
            </a>
            <a
              href="#"
              className="rounded-md p-1 px-2 transition-colors duration-200 hover:bg-gray-200"
            >
              Terms
            </a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .loading-bar {
          width: 30%;
          height: 100%;
          background-color: #4285f4;
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
  )
}
