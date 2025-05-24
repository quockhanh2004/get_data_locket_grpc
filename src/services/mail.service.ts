const nodemailer = require("nodemailer");
import { config } from "dotenv";
config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_SERVICE,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Gửi email
 * @param {string} to - Email người nhận
 * @param {string} subject - Tiêu đề email
 * @param {string} html - Nội dung HTML email
 */
export const sendMail = async (to: string, subject: string, html: string) => {
  const mailOptions = {
    from: `"Locket Upload" <${process.env.EMAIL_SERVICE}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};
