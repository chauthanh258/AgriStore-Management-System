using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

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

public sealed class ProductImageStorage(
    ICloudinaryImageClient cloudinary,
    IOptions<CloudinaryOptions> options) : IProductImageStorage
{
    public const long MaxFileSizeBytes = 5 * 1024 * 1024;
    private const string ProductFolder = "products";

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

        var imageId = Guid.NewGuid().ToString("N");
        var publicId = $"{ProductFolder}/{imageId}";
        await using var source = file.OpenReadStream();
        var result = await cloudinary.UploadImageAsync(
            source,
            $"{imageId}{imageFormat}",
            publicId,
            cancellationToken);

        return new(result.SecureUrl, null);
    }

    public async Task DeleteAsync(string imageUrl, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryGetPublicId(imageUrl, out var publicId))
        {
            return;
        }

        await cloudinary.DeleteImageAsync(publicId, cancellationToken);
    }

    private bool TryGetPublicId(string imageUrl, out string publicId)
    {
        publicId = string.Empty;
        if (!Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(uri.Host, "res.cloudinary.com", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var cloudName = options.Value.CloudName;
        if (string.IsNullOrWhiteSpace(cloudName))
        {
            throw new InvalidOperationException(
                "Cloudinary:CloudName phải được cấu hình để xóa ảnh sản phẩm trên Cloudinary.");
        }

        var urlPrefix = $"/{cloudName}/image/upload/";
        if (!uri.AbsolutePath.StartsWith(urlPrefix, StringComparison.Ordinal))
        {
            return false;
        }

        var assetPath = uri.AbsolutePath[urlPrefix.Length..];
        var pathSegments = assetPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (pathSegments.Length == 3 && IsVersionSegment(pathSegments[0]))
        {
            pathSegments = pathSegments[1..];
        }

        if (pathSegments.Length != 2 ||
            !string.Equals(pathSegments[0], ProductFolder, StringComparison.Ordinal))
        {
            return false;
        }

        var fileName = pathSegments[1];
        var extensionIndex = fileName.LastIndexOf('.');
        var id = extensionIndex > 0 ? fileName[..extensionIndex] : fileName;
        if (!Guid.TryParseExact(id, "N", out _))
        {
            return false;
        }

        publicId = $"{ProductFolder}/{id}";
        return true;
    }

    private static bool IsVersionSegment(string segment)
    {
        return segment.Length > 1 &&
            segment[0] == 'v' &&
            int.TryParse(segment.AsSpan(1), out _);
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
