using System.Net.Mail;
using System.Net;
using Musiclify.Models;

namespace Musiclify.Services;

public class EmailService
{
    private readonly SmtpSettings _smtpSettings;
    private readonly ILogger<EmailService> _logger;

    public EmailService(SmtpSettings? smtpSettings, ILogger<EmailService> logger)
    {
        _smtpSettings = smtpSettings ?? new SmtpSettings();
        _logger = logger;
    }

    public async Task<bool> SendPasswordResetEmailAsync(string email, string resetCode)
    {
        try
        {
            Console.WriteLine($"🎵 =================================");
            Console.WriteLine($"🎵 MUSICLIFY - КОД ВІДНОВЛЕННЯ ПАРОЛЯ");
            Console.WriteLine($"🎵 Email: {email}");
            Console.WriteLine($"🎵 Код: {resetCode}");
            Console.WriteLine($"🎵 Термін дії: 15 хвилин");
            Console.WriteLine($"🎵 =================================");
            
            if (!string.IsNullOrEmpty(_smtpSettings.Server) && 
                !string.IsNullOrEmpty(_smtpSettings.Username) && 
                !string.IsNullOrEmpty(_smtpSettings.Password))
            {
                try
                {
                    Console.WriteLine($"🔧 Спроба відправки через SMTP...");
                    
                    using var smtpClient = new SmtpClient(_smtpSettings.Server, _smtpSettings.Port)
                    {
                        EnableSsl = _smtpSettings.EnableSsl,
                        UseDefaultCredentials = false,
                        Credentials = new NetworkCredential(_smtpSettings.Username, _smtpSettings.Password),
                        DeliveryMethod = SmtpDeliveryMethod.Network,
                        Timeout = 10000
                    };

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(_smtpSettings.SenderEmail, _smtpSettings.SenderName),
                        Subject = "Відновлення пароля - Musiclify",
                        Body = $@"
                            <h2>Відновлення пароля</h2>
                            <p>Ваш код для відновлення пароля:</p>
                            <h1 style='color: #1DB954; font-size: 32px; text-align: center;'>{resetCode}</h1>
                            <p>Цей код дійсний протягом 15 хвилин.</p>
                            <br>
                            <p>З повагою,<br>Команда Musiclify 🎵</p>
                        ",
                        IsBodyHtml = true
                    };

                    mailMessage.To.Add(email);
                    await smtpClient.SendMailAsync(mailMessage);
                    
                    Console.WriteLine($"✅ Email успішно відправлено на {email}");
                    return true;
                }
                catch (Exception smtpEx)
                {
                    Console.WriteLine($"⚠️ SMTP помилка: {smtpEx.Message}");
                }
            }
            
            Console.WriteLine($"📧 Демо-режим: код показано вище");
            return true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"💥 Помилка відправки: {ex.Message}");
            return true;
        }
    }
}