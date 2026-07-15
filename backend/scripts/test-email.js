require('dotenv').config({ path: __dirname + '/../.env' });

async function testEmailConfig() {
  console.log('Testing Brevo API configuration for user:', process.env.EMAIL_USER);

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || apiKey.startsWith('your_')) {
    console.error('❌ Error: BREVO_API_KEY is missing or set to a placeholder.');
    process.exit(1);
  }

  const senderEmail = process.env.EMAIL_USER || 'aloksinghrajput2405@gmail.com';

  try {
    console.log('Sending a test email via Brevo HTTP API...');
    const body = {
      sender: {
        name: 'Event Test System',
        email: senderEmail,
      },
      to: [
        {
          email: senderEmail,
          name: 'Event Admin',
        },
      ],
      subject: '✅ Brevo Email API Works!',
      htmlContent: '<h1>Success!</h1><p>Your Node.js backend is successfully connected to Brevo and ready to send tickets on Render!</p>',
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Test email sent successfully! Message ID:', data.messageId);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing Brevo configuration:');
    console.error(error.message);
    process.exit(1);
  }
}

testEmailConfig();
