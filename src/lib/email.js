import nodemailer from "nodemailer";

// Create reusable transporter
export const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Send OTP email
export const sendOTPEmail = async (to, otp, purpose = "verification") => {
  const transporter = createEmailTransporter();

  const mailOptions = {
    from: `"Futura Homes" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: "Your OTP Code - Futura Homes",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
          }
          .header {
            background: linear-gradient(to right, #dc2626, #b91c1c);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .otp-box {
            background: #f3f4f6;
            border: 2px dashed #dc2626;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 8px;
          }
          .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏠 Futura Homes</h1>
            <p>Your Verification Code</p>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You requested a verification code for ${purpose}. Please use the code below:</p>

            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>

            <p>This code will expire in <strong>5 minutes</strong>.</p>

            <div class="warning">
              <strong>⚠️ Security Note:</strong> If you didn't request this code, please ignore this email. Never share this code with anyone.
            </div>

            <p>Best regards,<br>Futura Homes Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2025 Futura Homes. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};
