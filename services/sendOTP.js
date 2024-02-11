const { email } = require("../debugging/debug"),
  nodemailer = require("nodemailer");
module.exports.ticketsend = (customerEmail, username, id) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'otp@sirglobal.org',
      pass: 'otpSir@2024',
    },
    connectionTimeout: 5000, // 5 seconds
    socketTimeout: 7000
  });

  const mailToSend = {
    from: "otp@sirglobal.org",
    to: customerEmail,
    subject: "Verify your email",
    html:
      "<h3>" +
      "Hello :" +
      username +
      "</h3>" +
      "<h4>" +
      "Your request ticket" +
      " ( " +
      id +
      " ) " +
      "has been updated." +
      "</h4>" +
      "<h4>" +
      "UUDT" +
      "</h4>" +
      "<br/>" +
      "<h4>" +
      "This is an automated message. Please do not reply." +
      "</h4>",
  };

  transporter
    .sendMail(mailToSend)
    .then(() => email("Email has been sent.d"))
    .catch((e) => console.log(e));
};
