import { NextResponse } from "next/server";
import { sendOTPEmail } from "@/lib/email";
import nodemailer from 'nodemailer';

// Create email transporter
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

export async function POST(request) {
  try {
    const { inquiryId, clientEmail, clientName, propertyTitle, message } = await request.json();

    if (!clientEmail || !message) {
      return NextResponse.json(
        { success: false, message: "Email and message are required" },
        { status: 400 }
      );
    }

    const transporter = createEmailTransporter();

    const mailOptions = {
      from: `"Futura Homes" <${process.env.EMAIL_USER}>`,
      to: clientEmail,
      subject: `Follow-up: ${propertyTitle || 'Your Inquiry'} - Futura Homes`,
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
            .message-box {
              background: #f3f4f6;
              border-left: 4px solid #dc2626;
              padding: 20px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 20px;
            }
            .contact-info {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Futura Homes</h1>
              <p>Follow-up on Your Inquiry</p>
            </div>
            <div class="content">
              <p>Hello ${clientName},</p>
              <p>Thank you for your inquiry about <strong>${propertyTitle || 'our property'}</strong>.</p>

              <div class="message-box">
                <h3 style="margin-top: 0; color: #dc2626;">Message from Futura Homes:</h3>
                <p style="white-space: pre-wrap;">${message}</p>
              </div>

              <div class="contact-info">
                <h4 style="margin-top: 0; color: #f59e0b;">📞 Need More Information?</h4>
                <p style="margin: 5px 0;">Feel free to reply to this email or contact us:</p>
                <p style="margin: 5px 0;"><strong>Phone:</strong> +639676484028</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> info@futurahomes.com</p>
              </div>

              <p>We look forward to helping you find your dream home!</p>

              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The Futura Homes Team</strong>
              </p>
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
      console.log('✅ Follow-up email sent successfully:', info.messageId);

      return NextResponse.json({
        success: true,
        messageId: info.messageId,
        message: 'Follow-up email sent successfully',
      });
    } catch (emailError) {
      console.error('❌ Email sending error:', emailError);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to send follow-up email. Please check your email configuration.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Send follow-up error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send follow-up: ' + error.message,
      },
      { status: 500 }
    );
  }
}
