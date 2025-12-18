using Microsoft.Data.Sqlite;
using Musiclify.Models;

namespace Musiclify.Services;

public class DatabaseService
{
    private readonly string _connectionString;

    public DatabaseService(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> UserExists(string email)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Users WHERE Email = $email";
        command.Parameters.AddWithValue("$email", email);

        var count = Convert.ToInt64(await command.ExecuteScalarAsync());
        return count > 0;
    }

    public async Task SaveResetToken(string email, string token)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var deleteCommand = connection.CreateCommand();
        deleteCommand.CommandText = "DELETE FROM PasswordResetTokens WHERE Email = $email";
        deleteCommand.Parameters.AddWithValue("$email", email);
        await deleteCommand.ExecuteNonQueryAsync();

        var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = @"
            INSERT INTO PasswordResetTokens (Email, Token, ExpiresAt)
            VALUES ($email, $token, $expiresAt)
        ";
        insertCommand.Parameters.AddWithValue("$email", email);
        insertCommand.Parameters.AddWithValue("$token", token);
        insertCommand.Parameters.AddWithValue("$expiresAt", DateTime.Now.AddMinutes(15).ToString("yyyy-MM-dd HH:mm:ss"));

        await insertCommand.ExecuteNonQueryAsync();
    }

    public async Task<bool> ValidateResetToken(string email, string token)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT COUNT(*) FROM PasswordResetTokens 
            WHERE Email = $email AND Token = $token AND Used = 0 
            AND ExpiresAt > datetime('now')
        ";
        command.Parameters.AddWithValue("$email", email);
        command.Parameters.AddWithValue("$token", token);

        var count = Convert.ToInt64(await command.ExecuteScalarAsync());
        return count > 0;
    }

    public async Task MarkTokenAsUsed(string email, string token)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE PasswordResetTokens 
            SET Used = 1 
            WHERE Email = $email AND Token = $token
        ";
        command.Parameters.AddWithValue("$email", email);
        command.Parameters.AddWithValue("$token", token);

        await command.ExecuteNonQueryAsync();
    }

    public async Task<bool> UpdatePassword(string email, string passwordHash)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = @"
            UPDATE Users 
            SET PasswordHash = $passwordHash 
            WHERE Email = $email
        ";
        command.Parameters.AddWithValue("$passwordHash", passwordHash);
        command.Parameters.AddWithValue("$email", email);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        return rowsAffected > 0;
    }
}