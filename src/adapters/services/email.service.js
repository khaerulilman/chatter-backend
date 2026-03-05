import transporter from "../../frameworks/email/transporter.js";

// Kirim email.
export const sendMail = (mailOptions) => {
  const opts = {
    from: mailOptions.from || process.env.EMAIL_USER,
    ...mailOptions,
  };
  return transporter.sendMail(opts);
};
