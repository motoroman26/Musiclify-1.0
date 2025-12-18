using Microsoft.Data.Sqlite;
using System.Text.Json;
using Musiclify.Models;
using Musiclify.Services;

namespace Musiclify.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app, string connectionString)
    {
        var passwordService = new PasswordService();
        var databaseService = new DatabaseService(connectionString);

        app.MapPost("/api/auth/register", async (HttpContext context) =>
        {
            try
            {
                using var reader = new StreamReader(context.Request.Body);
                var requestBody = await reader.ReadToEndAsync();
                
                Console.WriteLine($"✅ Отримано запит реєстрації: {requestBody}");

                var request = JsonSerializer.Deserialize<RegisterRequest>(requestBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (request == null)
                {
                    return Results.BadRequest(new { message = "Некоректні дані" });
                }

                if (string.IsNullOrWhiteSpace(request.Username) || 
                    string.IsNullOrWhiteSpace(request.Email) || 
                    string.IsNullOrWhiteSpace(request.Password))
                {
                    return Results.BadRequest(new { message = "Усі поля обов'язкові" });
                }

                if (request.Password.Length < 6)
                {
                    return Results.BadRequest(new { message = "Пароль має містити принаймні 6 символів" });
                }

                if (request.Password != request.ConfirmPassword)
                {
                    return Results.BadRequest(new { message = "Паролі не співпадають" });
                }

                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var checkCommand = connection.CreateCommand();
                checkCommand.CommandText = @"
                    SELECT COUNT(*) FROM Users 
                    WHERE Email = $email OR Username = $username
                ";
                checkCommand.Parameters.AddWithValue("$email", request.Email);
                checkCommand.Parameters.AddWithValue("$username", request.Username);

                var existingCount = Convert.ToInt64(await checkCommand.ExecuteScalarAsync());
                if (existingCount > 0)
                {
                    return Results.BadRequest(new { message = "Користувач з таким email або іменем вже існує" });
                }

                var insertCommand = connection.CreateCommand();
                insertCommand.CommandText = @"
                    INSERT INTO Users (Username, Email, PasswordHash)
                    VALUES ($username, $email, $passwordHash)
                ";
                insertCommand.Parameters.AddWithValue("$username", request.Username);
                insertCommand.Parameters.AddWithValue("$email", request.Email);
                insertCommand.Parameters.AddWithValue("$passwordHash", passwordService.HashPassword(request.Password));

                await insertCommand.ExecuteNonQueryAsync();
                
                Console.WriteLine("✅ Користувач успішно зареєстрований");
                return Results.Ok(new { message = "Користувач успішно зареєстрований" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Помилка: {ex.Message}");
                return Results.Problem($"Помилка при реєстрації: {ex.Message}");
            }
        })
        .WithName("RegisterUser")
        .WithOpenApi();

        app.MapPost("/api/auth/login", async (HttpContext context) =>
        {
            try
            {
                var requestBody = await new StreamReader(context.Request.Body).ReadToEndAsync();
                Console.WriteLine($"✅ Отримано запит входу: {requestBody}");
                
                var request = JsonSerializer.Deserialize<LoginRequest>(requestBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (request == null)
                {
                    return Results.BadRequest(new { message = "Некоректні дані" });
                }

                if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                {
                    return Results.BadRequest(new { message = "Email та пароль обов'язкові" });
                }

                using var connection = new SqliteConnection(connectionString);
                await connection.OpenAsync();

                var command = connection.CreateCommand();
                command.CommandText = @"
                    SELECT UserId, Username, Email, PasswordHash, CreatedAt
                    FROM Users 
                    WHERE Email = $email
                ";
                command.Parameters.AddWithValue("$email", request.Email);

                using var reader = await command.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    return Results.BadRequest(new { message = "Невірний email або пароль" });
                }

                var userId = reader.GetInt32(0);
                var username = reader.GetString(1);
                var email = reader.GetString(2);
                var passwordHash = reader.GetString(3);
                var createdAt = reader.GetString(4);

                if (!passwordService.VerifyPassword(request.Password, passwordHash))
                {
                    return Results.BadRequest(new { message = "Невірний email або пароль" });
                }

                Console.WriteLine($"✅ Успішний вхід для користувача: {username}");
                return Results.Ok(new 
                { 
                    message = "Успішний вхід",
                    user = new { userId, username, email, createdAt }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Помилка при вході: {ex.Message}");
                return Results.Problem($"Помилка при вході: {ex.Message}");
            }
        })
        .WithName("LoginUser")
        .WithOpenApi();

        app.MapPost("/api/auth/forgot-password", async (HttpContext context) =>
        {
            try
            {
                Console.WriteLine("🔐 Отримано запит на відновлення пароля...");
                
                var requestBody = await new StreamReader(context.Request.Body).ReadToEndAsync();
                Console.WriteLine($"📧 Тіло запиту: {requestBody}");
                
                var request = JsonSerializer.Deserialize<ForgotPasswordRequest>(requestBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (request == null || string.IsNullOrWhiteSpace(request.Email))
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Email обов'язковий" 
                    });
                }

                Console.WriteLine($"📧 Перевіряємо email: {request.Email}");

                var userExists = await databaseService.UserExists(request.Email);
                Console.WriteLine($"🔍 Користувач існує: {userExists}");

                if (!userExists)
                {
                    return Results.Ok(new { 
                        success = true,
                        message = "Якщо email зареєстрований, ми відправили код відновлення" 
                    });
                }

                var resetCode = passwordService.GenerateResetCode();
                Console.WriteLine($"🔑 Згенеровано код відновлення для {request.Email}: {resetCode}");

                await databaseService.SaveResetToken(request.Email, resetCode);
                Console.WriteLine($"💾 Токен збережено в базі даних");

                Console.WriteLine($"📧 Відправляємо email...");
                var smtpSettings = app.Configuration.GetSection("SmtpSettings").Get<SmtpSettings>();
                
                var safeSmtpSettings = smtpSettings ?? new SmtpSettings();
                
                using var scope = app.Services.CreateScope();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<EmailService>>();
                var emailService = new EmailService(safeSmtpSettings, logger);
                var emailSent = await emailService.SendPasswordResetEmailAsync(request.Email, resetCode);

                if (emailSent)
                {
                    Console.WriteLine($"✅ Успішно оброблено запит для {request.Email}");
                    return Results.Ok(new { 
                        success = true,
                        message = "Якщо email зареєстрований, ми відправили код відновлення" 
                    });
                }
                else
                {
                    return Results.Problem("Не вдалося відправити код відновлення. Спробуйте ще раз.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Критична помилка: {ex.Message}");
                return Results.Problem("Сталася помилка при обробці запиту");
            }
        })
        .WithName("ForgotPassword")
        .WithOpenApi();

        app.MapPost("/api/auth/verify-reset-code", async (HttpContext context) =>
        {
            try
            {
                var requestBody = await new StreamReader(context.Request.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<VerifyResetCodeRequest>(requestBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Code))
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Email та код обов'язкові" 
                    });
                }

                var isValid = await databaseService.ValidateResetToken(request.Email, request.Code);
                
                if (!isValid)
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Невірний код або час його дії минув" 
                    });
                }

                return Results.Ok(new { 
                    success = true,
                    message = "Код підтверджено", 
                    valid = true 
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Помилка: {ex.Message}");
                return Results.Problem("Сталася помилка при перевірці коду");
            }
        })
        .WithName("VerifyResetCode")
        .WithOpenApi();

        app.MapPost("/api/auth/reset-password", async (HttpContext context) =>
        {
            try
            {
                var requestBody = await new StreamReader(context.Request.Body).ReadToEndAsync();
                var request = JsonSerializer.Deserialize<ResetPasswordRequest>(requestBody, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                
                if (request == null || string.IsNullOrWhiteSpace(request.Email) || 
                    string.IsNullOrWhiteSpace(request.Code) || string.IsNullOrWhiteSpace(request.NewPassword))
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Усі поля обов'язкові" 
                    });
                }

                if (request.NewPassword.Length < 6)
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Пароль має містити принаймні 6 символів" 
                    });
                }

                var isValid = await databaseService.ValidateResetToken(request.Email, request.Code);
                
                if (!isValid)
                {
                    return Results.BadRequest(new { 
                        success = false,
                        message = "Невірний код або час його дії минув" 
                    });
                }

                var passwordHash = passwordService.HashPassword(request.NewPassword);
                var success = await databaseService.UpdatePassword(request.Email, passwordHash);
                
                if (!success)
                {
                    return Results.Problem("Не вдалося оновити пароль");
                }

                await databaseService.MarkTokenAsUsed(request.Email, request.Code);

                Console.WriteLine($"✅ Пароль успішно оновлено для {request.Email}");
                return Results.Ok(new { 
                    success = true,
                    message = "Пароль успішно оновлено" 
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"💥 Помилка: {ex.Message}");
                return Results.Problem("Сталася помилка при оновленні пароля");
            }
        })
        .WithName("ResetPassword")
        .WithOpenApi();
    }
}