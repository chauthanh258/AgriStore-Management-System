using Microsoft.AspNetCore.Http;

namespace AgriStore.Api.Services;

public interface IProductImageStorage
{
    Task<ProductImageStorageResult> SaveAsync(IFormFile file, CancellationToken cancellationToken);
    Task DeleteAsync(string imageUrl, CancellationToken cancellationToken);
}

public sealed record ProductImageStorageResult(string? ImageUrl, string? Error)
{
    public bool Succeeded => ImageUrl is not null;
}

public sealed class ProductImageStorage(IWebHostEnvironment environment) : IProductImageStorage
{
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private const string UrlPrefix = "/uploads/products/";

    public async Task<ProductImageStorageResult> SaveAsync(
        IFormFile file,
        CancellationToken cancellationToken)
    {
        if (file.Length is <= 0 or > MaxFileSizeBytes)
        {
            return new(null, "Ảnh phải có dung lượng từ 1 byte đến 5 MB.");
        }

        await using var input = file.OpenReadStream();
        var header = new byte[12];
        var bytesRead = await input.ReadAtLeastAsync(header, header.Length, false, cancellationToken);
        var imageFormat = GetImageFormat(header, bytesRead);
        if (imageFormat is null)
        {
            return new(null, "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP hợp lệ.");
        }

        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var directory = Path.Combine(webRoot, "uploads", "products");
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{imageFormat}";
        var filePath = Path.Combine(directory, fileName);
        try
        {
            await using var output = new FileStream(
                filePath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                FileOptions.Asynchronous);
            await using var source = file.OpenReadStream();
            await source.CopyToAsync(output, cancellationToken);
        }
        catch
        {
            File.Delete(filePath);
            throw;
        }

        return new($"{UrlPrefix}{fileName}", null);
    }

    public Task DeleteAsync(string imageUrl, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!imageUrl.StartsWith(UrlPrefix, StringComparison.Ordinal))
        {
            return Task.CompletedTask;
        }

        var fileName = imageUrl[UrlPrefix.Length..];
        if (string.IsNullOrWhiteSpace(fileName) || Path.GetFileName(fileName) != fileName)
        {
            return Task.CompletedTask;
        }

        var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
        var filePath = Path.Combine(webRoot, "uploads", "products", fileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }

        return Task.CompletedTask;
    }

    private static string? GetImageFormat(byte[] header, int bytesRead)
    {
        if (bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytesRead >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return ".png";
        }

        if (bytesRead >= 12 &&
            header.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
            header.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return ".webp";
        }

        return null;
    }
}