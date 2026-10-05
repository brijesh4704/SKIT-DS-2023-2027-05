// Dummy implementation for emailService
const sendEmailOTP = async (email, otp) => {
  console.log(`[Email Service] Sending OTP ${otp} to ${email}`);
  return true;
};

module.exports = {
  sendEmailOTP,
};
