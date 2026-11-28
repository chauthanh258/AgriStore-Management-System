using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;

namespace AgriStore.Api.Services;

public sealed class CloudinaryOptions
{
    public const string SectionName = "Cloudinary";

    public string CloudName { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
}

public interface ICloudinaryImageClient
{
    Task<CloudinaryImageUploadResult> UploadImageAsync(
        Stream file,
        string fileName,
        string publicId,
        CancellationToken cancellationToken);

    Task DeleteImageAsync(string publicId, CancellationToken cancellationToken);
}

public sealed record CloudinaryImageUploadResult(string SecureUrl);

public sealed class CloudinaryImageClient(IOptions<CloudinaryOptions> options) : ICloudinaryImageClient
{
    public async Task<CloudinaryImageUploadResult> UploadImageAsync(
        Stream file,
        string fileName,
        string publicId,
        CancellationToken cancellationToken)
    {
        var cloudinary = CreateClient();
        var result = await cloudinary.UploadAsync(
            new ImageUploadParams
            {
                File = new FileDescription(fileName, file),
                PublicId = publicId,
                UseFilename = false,
                UniqueFilename = false
            },
            cancellationToken);

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");
        }

        var secureUrl = result.SecureUrl?.ToString();
        if (!Uri.TryCreate(secureUrl, UriKind.Absolute, out var uri) ||
            !string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cloudinary upload did not return a valid HTTPS URL.");
        }

        return new CloudinaryImageUploadResult(secureUrl);
    }

    public async Task DeleteImageAsync(string publicId, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var result = await CreateClient().DestroyAsync(
            new DeletionParams(publicId)
            {
                ResourceType = ResourceType.Image,
                Invalidate = true
            });

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary deletion failed: {result.Error.Message}");
        }

        if (result.Result is not ("ok" or "not found"))
        {
            throw new InvalidOperationException(
                $"Cloudinary deletion returned an unexpected result: {result.Result ?? "unknown"}.");
        }
    }

    private Cloudinary CreateClient()
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.CloudName) ||
            string.IsNullOrWhiteSpace(settings.ApiKey) ||
            string.IsNullOrWhiteSpace(settings.ApiSecret))
        {
            throw new InvalidOperationException(
                "Cloudinary:CloudName, Cloudinary:ApiKey và Cloudinary:ApiSecret phải được cấu hình.");
        }

        var cloudinary = new Cloudinary(new Account(
            settings.CloudName,
            settings.ApiKey,
            settings.ApiSecret));
        cloudinary.Api.Secure = true;
        return cloudinary;
    }
}
