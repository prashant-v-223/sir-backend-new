const { email } = require("../debugging/debug"),
  nodemailer = require("nodemailer");
module.exports.ticketsend = (customerEmail, username, id) => {
    let transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: "sirtoken21@gmail.com",
        pass: "qiebkwzdaaykswre",
      },
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
