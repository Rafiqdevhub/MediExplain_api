import nodemailer from "nodemailer";
import { config } from "../config/env";

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.auth.user,
    pass: config.email.auth.pass,
  },
});

const getVerificationEmailTemplate = (
  name: string,
  verificationUrl: string
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email - Photomonix</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideIn 0.6s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.15)"/><circle cx="10" cy="50" r="0.5" fill="rgba(255,255,255,0.15)"/><circle cx="90" cy="30" r="0.5" fill="rgba(255,255,255,0.15)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .logo {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
        }

        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
        }

        .content {
            padding: 50px 40px;
        }

        .greeting {
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
        }

        .highlight {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
        }

        .cta-section {
            text-align: center;
            margin: 40px 0;
        }

        .button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
            position: relative;
            overflow: hidden;
        }

        .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .button:hover::before {
            left: 100%;
        }

        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(102, 126, 234, 0.4);
        }

        .security-notice {
            background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            position: relative;
        }

        .security-notice::before {
            content: '⚠️';
            position: absolute;
            top: 20px;
            left: 15px;
            font-size: 18px;
        }

        .security-notice p {
            margin: 0 0 0 30px;
            color: #92400e;
            font-weight: 500;
        }

        .code-block {
            background: #f8fafc;
            border: 2px dashed #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
            font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            position: relative;
        }

        .code-block::before {
            content: '🔗';
            position: absolute;
            top: -10px;
            left: 20px;
            background: #ffffff;
            padding: 5px;
            border-radius: 50%;
            font-size: 16px;
        }

        .code-label {
            font-size: 12px;
            color: #718096;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .code-url {
            font-size: 14px;
            color: #2d3748;
            word-break: break-all;
            font-weight: 500;
            background: #ffffff;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            margin-bottom: 15px;
        }

        .footer {
            background: #f8fafc;
            padding: 30px 40px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }

        .footer p {
            color: #718096;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .social-links {
            margin: 20px 0;
        }

        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #a0aec0;
            text-decoration: none;
            font-size: 18px;
            transition: color 0.3s ease;
        }

        .social-links a:hover {
            color: #667eea;
        }

        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 20px 0;
        }

        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            .container {
                border-radius: 15px;
            }

            .header {
                padding: 30px 20px;
            }

            .content {
                padding: 30px 20px;
            }

            .greeting {
                font-size: 24px;
            }

            .button {
                padding: 16px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Photonomix</div>
            <div class="tagline">AI-Powered Image Enhancement</div>
        </div>

        <div class="content">
            <h1 class="greeting">Welcome aboard, ${name}!</h1>

            <p class="message">
                You're just one step away from unlocking the power of <span class="highlight">AI Image enhancement</span>.
                Verify your email address to start enhance the image
            </p>

            <div class="cta-section">
                <a href="${verificationUrl}" class="button">Verify My Email Address</a>
            </div>

            <div class="security-notice">
                <p><strong>Security First:</strong> This verification link expires in 24 hours and can only be used once for your protection.</p>
            </div>
            <p class="message">
                Didn't create an account? No worries! You can safely ignore this email.
            </p>
        </div>

        <div class="footer">
            <div class="divider"></div>
            <p>
                Questions? Reach out to our <a href="mailto:neatnode09@gmail.com">support team</a>
            </p>
            <p>
                © 2025 Photomonix
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string
): Promise<boolean> => {
  try {
    const verificationUrl = `${
      process.env.FRONTEND_URL || "https://photomonix-frontend.vercel.app/"
    }/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: "Verify Your Email - Photomonix",
      html: getVerificationEmailTemplate(name, verificationUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    return false;
  }
};

export const testEmailConnection = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("Email server connection successful");
    return true;
  } catch (error) {
    console.error("Email server connection failed:", error);
    return false;
  }
};

// Password Reset Email Template
const getPasswordResetEmailTemplate = (
  name: string,
  resetUrl: string
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Photomonix</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #1a202c;
            background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            animation: slideIn 0.6s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .header {
            background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="75" cy="75" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="50" cy="10" r="0.5" fill="rgba(255,255,255,0.15)"/><circle cx="10" cy="50" r="0.5" fill="rgba(255,255,255,0.15)"/><circle cx="90" cy="30" r="0.5" fill="rgba(255,255,255,0.15)"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .logo {
            font-size: 32px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
        }

        .tagline {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 1;
        }

        .content {
            padding: 50px 40px;
        }

        .greeting {
            font-size: 28px;
            font-weight: 700;
            color: #1a202c;
            margin-bottom: 16px;
            background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .message {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 30px;
            line-height: 1.7;
        }

        .highlight {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 600;
        }

        .cta-section {
            text-align: center;
            margin: 40px 0;
        }

        .button {
            display: inline-block;
            background: linear-gradient(135deg, #ed8936 0%, #c05621 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 18px 40px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            margin: 20px 0;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(237, 137, 54, 0.3);
            position: relative;
            overflow: hidden;
        }

        .button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s;
        }

        .button:hover::before {
            left: 100%;
        }

        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(237, 137, 54, 0.4);
        }

        .warning-box {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            position: relative;
        }

        .warning-box::before {
            content: '⏰';
            position: absolute;
            top: 20px;
            left: 15px;
            font-size: 18px;
        }

        .warning-box p {
            margin: 0 0 0 30px;
            color: #92400e;
            font-weight: 500;
        }

        .info-box {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            position: relative;
        }

        .info-box::before {
            content: 'ℹ️';
            position: absolute;
            top: 20px;
            left: 15px;
            font-size: 18px;
        }

        .info-box p {
            margin: 0 0 0 30px;
            color: #1e40af;
            font-weight: 500;
        }

     

        .link-label {
            font-size: 12px;
            color: #718096;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }

        .link-url {
            font-size: 13px;
            color: #2d3748;
            word-break: break-all;
            font-weight: 500;
            background: #ffffff;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .footer {
            background: #f8fafc;
            padding: 30px 40px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
        }

        .footer p {
            color: #718096;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .footer a {
            color: #ed8936;
            text-decoration: none;
            font-weight: 600;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
            margin: 20px 0;
        }

        @media (max-width: 600px) {
            body {
                padding: 10px;
            }

            .container {
                border-radius: 15px;
            }

            .header {
                padding: 30px 20px;
            }

            .content {
                padding: 30px 20px;
            }

            .greeting {
                font-size: 24px;
            }

            .button {
                padding: 16px 30px;
                font-size: 15px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">Photomonix</div>
            <div class="tagline">Secure Password Reset</div>
        </div>

        <div class="content">
            <h1 class="greeting">Password Reset Request</h1>

            <p class="message">
                Hi ${name},
            </p>

            <p class="message">
                We received a request to reset your password. If this was you, click the button below to create a new password.
                If you didn't request this, you can safely ignore this email.
            </p>

            <div class="cta-section">
                <a href="${resetUrl}" class="button">Reset My Password</a>
            </div>

            <div class="warning-box">
                <p><strong>Action Required:</strong> This link expires in 24 hours for your security.</p>
            </div>

            <p class="message">
                <strong>Didn't request a password reset?</strong> Your account is secure. If you didn't make this request, please contact our support team immediately.
            </p>
        </div>

        <div class="footer">
            <div class="divider"></div>
            <p>
                Questions? Reach out to our <a href="mailto:neatnode09@gmail.com">support team</a>
            </p>
            <p>
                © 2025 Photomonix
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> => {
  try {
    const resetUrl = `${
      process.env.FRONTEND_URL || "https://photomonix-frontend.vercel.app/"
    }/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: "Reset Your Password - Photomonix",
      html: getPasswordResetEmailTemplate(name, resetUrl),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
};
