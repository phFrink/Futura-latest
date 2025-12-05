/**
 * Google reCAPTCHA v3 Verification Utility
 *
 * This utility provides server-side verification of reCAPTCHA tokens
 * to protect forms from spam and automated bot submissions.
 */

/**
 * Verify reCAPTCHA token with Google's API
 *
 * @param {string} token - The reCAPTCHA token from the client
 * @param {string} remoteIp - Optional IP address of the client (for additional verification)
 * @returns {Promise<{success: boolean, score: number, action: string, challenge_ts: string, hostname: string, error-codes?: string[]}>}
 */
export async function verifyRecaptcha(token, remoteIp = null) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error(' RECAPTCHA_SECRET_KEY is not configured in environment variables');
    throw new Error('reCAPTCHA is not configured on the server');
  }

  if (!token) {
    return {
      success: false,
      error: 'No reCAPTCHA token provided',
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);

    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    console.log('reCAPTCHA verification result:', {
      success: data.success,
      score: data.score,
      action: data.action,
      hostname: data.hostname,
      challenge_ts: data.challenge_ts,
    });

    return data;
  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return {
      success: false,
      error: 'Failed to verify reCAPTCHA token',
      details: error.message,
    };
  }
}

/**
 * Check if reCAPTCHA score meets the minimum threshold
 *
 * Score ranges from 0.0 (very likely a bot) to 1.0 (very likely a human)
 * Recommended thresholds:
 * - 0.9-1.0: Very likely human
 * - 0.7-0.9: Likely human
 * - 0.5-0.7: Neutral
 * - 0.3-0.5: Likely bot
 * - 0.0-0.3: Very likely bot
 *
 * @param {number} score - The reCAPTCHA score (0.0 to 1.0)
 * @param {number} threshold - Minimum acceptable score (default: 0.5)
 * @returns {boolean}
 */
export function isScoreAcceptable(score, threshold = 0.5) {
  return score >= threshold;
}

/**
 * Validate reCAPTCHA for inquiry submissions
 *
 * @param {string} token - The reCAPTCHA token
 * @param {string} expectedAction - Expected action name (e.g., 'inquiry_submit')
 * @param {number} minScore - Minimum acceptable score (default: 0.5)
 * @returns {Promise<{valid: boolean, score?: number, message?: string}>}
 */
export async function validateInquiryRecaptcha(token, expectedAction = 'inquiry_submit', minScore = 0.5) {
  const result = await verifyRecaptcha(token);

  // Check if verification was successful
  if (!result.success) {
    return {
      valid: false,
      message: 'reCAPTCHA verification failed. Please try again.',
      errors: result['error-codes'] || [result.error],
    };
  }

  // Check if action matches
  if (result.action !== expectedAction) {
    return {
      valid: false,
      score: result.score,
      message: 'Invalid reCAPTCHA action. Security check failed.',
    };
  }

  // Check if score meets threshold
  if (!isScoreAcceptable(result.score, minScore)) {
    return {
      valid: false,
      score: result.score,
      message: 'Security check failed. Your submission appears to be automated. If you are human, please try again or contact support.',
    };
  }

  return {
    valid: true,
    score: result.score,
    message: 'reCAPTCHA verification successful',
  };
}
