import nodemailer from "nodemailer";

export async function sendEmail(to: string, subject: string, html: string) {
  // const testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "iedk7ubdponpg5vq@ethereal.email",
      pass: "4tbf7s4TSTwn8rsTP3",
    },
  });

  const info = await transporter.sendMail({
    from: '"Fred Foo 👻" <foo@example.com>',
    to, // list of receivers
    subject, // Subject line
    html, // html body
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
