"use client"

import { useRef, useEffect } from 'react'
import ReCAPTCHA from "react-google-recaptcha"

interface ReCaptchaProps {
  onChange: (token: string | null) => void
  onExpired?: () => void
}

export const ReCaptchaComponent = ({ onChange, onExpired }: ReCaptchaProps) => {
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  // Function to reset the captcha
  const resetCaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset()
    }
  }

  // Effect to reset captcha on component mount
  useEffect(() => {
    resetCaptcha()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'} // Default is Google's test key
        onChange={onChange}
        onExpired={() => {
          onChange(null)
          if (onExpired) onExpired()
        }}
      />
    </div>
  )
}

export default ReCaptchaComponent 