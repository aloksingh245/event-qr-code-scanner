require('dotenv').config({ path: __dirname + '/../.env' });
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  console.log('Testing email configuration for user:', process.env.EMAIL_USER);

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_real_email@gmail.com' || process.env.EMAIL_USER === 'your_email@gmail.com') {
    console.error('❌ Error: EMAIL_USER is still set to a placeholder.');
    process.exit(1);
  }

  if (!process.env.EMAIL_PASS || process.env.EMAIL_PASS === 'your_app_password' || process.env.EMAIL_PASS === 'abcdefghijklmnop') {
    console.error('❌ Error: EMAIL_PASS is still set to a placeholder.');
    process.exit(1);
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify connection configuration
    console.log('Attempting to connect to Gmail SMTP server...');
    await transporter.verify();
    console.log('✅ SMTP Connection Successful! Your credentials are correct.');

    // Send a test email
    console.log('Sending a test email to yourself...');
    const info = await transporter.sendMail({
      from: `"Event Registration Test" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // send to yourself
      subject: '✅ Email Configuration Works!',
      text: 'If you are reading this, your Node.js backend is successfully connected to your Gmail account and ready to send QR codes!',
    });

    console.log('✅ Test email sent successfully! Message ID:', info.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing email configuration:');
    console.error(error.message);
    if (error.response) {
      console.error(error.response);
    }
    process.exit(1);
  }
}

testEmailConfig();
