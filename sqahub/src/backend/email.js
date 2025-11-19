import nodemailer from 'nodemailer';

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Em desenvolvimento, aceitar certificados auto-assinados
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  },
});

// Verificar conexão com servidor de email
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erro na configuração de email:', error);
  } else {
    console.log('✅ Servidor de email pronto');
  }
});

/**
 * Enviar email de login passwordless (magic link)
 */
export const sendPasswordlessEmail = async (email, token) => {
  const loginUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Login no ${process.env.APP_NAME}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0F172A; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 30px;
                     text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
            .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${process.env.APP_NAME}</h1>
            </div>
            <div class="content">
              <h2>Seu link de acesso está pronto!</h2>
              <p>Olá,</p>
              <p>Você solicitou acesso ao <strong>${process.env.APP_NAME}</strong>.
                 Clique no botão abaixo para fazer login:</p>

              <a href="${loginUrl}" class="button">Acessar ${process.env.APP_NAME}</a>

              <div class="warning">
                <strong>⚠️ Importante:</strong> Este link é válido por 10 minutos e pode ser usado apenas uma vez.
              </div>

              <p>Se você não solicitou este acesso, ignore este email.</p>

              <p style="color: #666; font-size: 12px;">
                Ou copie e cole este link no navegador:<br>
                <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${loginUrl}</code>
              </p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Login no ${process.env.APP_NAME}

      Você solicitou acesso ao ${process.env.APP_NAME}.

      Clique no link abaixo para fazer login:
      ${loginUrl}

      Este link é válido por 10 minutos e pode ser usado apenas uma vez.

      Se você não solicitou este acesso, ignore este email.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email enviado para ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw error;
  }
};

/**
 * Enviar email de boas-vindas
 */
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: `Bem-vindo ao ${process.env.APP_NAME}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0F172A; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bem-vindo ao ${process.env.APP_NAME}!</h1>
            </div>
            <div class="content">
              <h2>Olá, ${name}!</h2>
              <p>Estamos felizes em ter você conosco!</p>
              <p>Sua conta foi criada com sucesso e você já pode acessar todos os recursos da plataforma.</p>
              <p>Se precisar de ajuda, nossa equipe está à disposição.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${process.env.APP_NAME}. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email de boas-vindas enviado para ${email}`);
  } catch (error) {
    console.error('❌ Erro ao enviar email de boas-vindas:', error);
  }
};

export default transporter;
