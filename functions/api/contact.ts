/// <reference types="@cloudflare/workers-types" />

interface Env {
  RESEND_API_KEY: string;
}

interface ContactFormData {
  email: string;
  company: string;
  size?: string;
  message?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const formData = await context.request.formData();

    // Check honeypot
    if (formData.get('botcheck')) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data: ContactFormData = {
      email: formData.get('email') as string,
      company: formData.get('company') as string,
      size: formData.get('size') as string || '',
      message: formData.get('message') as string || '',
    };

    // Validate required fields
    if (!data.email || !data.company) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Polus Contact Form <sales@polussolution.com>',
        to: ['sales@polussolution.com'],
        reply_to: data.email,
        subject: `New contact form submission from ${data.company}`,
        text: `New Contact Form Submission

Company: ${data.company}
Email: ${data.email}
${data.size ? `Team Size: ${data.size}\n` : ''}${data.message ? `\nMessage:\n${data.message}` : ''}

---
Reply directly to this email to respond to ${data.email}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Company:</strong> ${data.company}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          ${data.size ? `<p><strong>Team Size:</strong> ${data.size}</p>` : ''}
          ${data.message ? `<p><strong>Message:</strong></p><p>${data.message.replace(/\n/g, '<br>')}</p>` : ''}
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
          <p style="color: #666; font-size: 14px;">Reply directly to this email to respond to ${data.email}</p>
        `,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to send email' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
