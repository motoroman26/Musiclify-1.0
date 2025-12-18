namespace Musiclify.Models;

public record RegisterRequest(string Username, string Email, string Password, string ConfirmPassword);
public record LoginRequest(string Email, string Password);
public record ForgotPasswordRequest(string Email);
public record VerifyResetCodeRequest(string Email, string Code);
public record ResetPasswordRequest(string Email, string Code, string NewPassword);
public record AddAlbumRequest(string Title, string ArtistName, int Year, string? Cover = null);