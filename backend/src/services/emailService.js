const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const sendEmailOTP = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: "BloodLink AI - Email Verification OTP",

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        background: #f8f9fb;
      ">

        <div style="
          background: white;
          border-radius: 16px;
          padding: 35px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
        ">

          <h1 style="
            margin: 0 0 10px;
            color: #dc2626;
          ">
            BloodLink AI
          </h1>

          <p style="color: #555; font-size: 16px;">
            Verify your email address to continue creating your BloodLink AI account.
          </p>

          <div style="
            margin: 30px 0;
            padding: 20px;
            background: #fff1f2;
            border-radius: 12px;
            text-align: center;
          ">

            <p style="
              margin: 0 0 8px;
              color: #666;
              font-size: 14px;
            ">
              Your verification OTP
            </p>

            <div style="
              font-size: 34px;
              font-weight: bold;
              letter-spacing: 8px;
              color: #dc2626;
            ">
              ${otp}
            </div>

          </div>

          <p style="color: #555;">
            This OTP is valid for <strong>10 minutes</strong>.
          </p>

          <p style="color: #777; font-size: 13px;">
            If you did not request this verification, you can safely ignore this email.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #eee;
            margin: 25px 0;
          ">

          <p style="
            color: #999;
            font-size: 12px;
            margin: 0;
          ">
            © BloodLink AI — Emergency Blood Response Network
          </p>

        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmailOTP,
};