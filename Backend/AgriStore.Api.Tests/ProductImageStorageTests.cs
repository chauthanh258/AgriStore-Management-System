using AgriStore.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;

namespace AgriStore.Api.Tests;

public sealed class ProductImageStorageTests
{
    private const string CloudName = "test-cloud";

    [Fact]
    public async Task SaveAsync_UploadsValidImageAndReturnsSecureUrl()
    {
        var imageBytes = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A };
        var cloudinary = new FakeCloudinaryImageClient();
        var storage = CreateStorage(cloudinary);

        var result = await storage.SaveAsync(CreateFile(imageBytes), CancellationToken.None);

        Assert.True(result.Succeeded);
        Assert.Equal(cloudinary.UploadResult.SecureUrl, result.ImageUrl);
        Assert.Equal(imageBytes, cloudinary.UploadedBytes);
        Assert.StartsWith("products/", cloudinary.PublicId);
        Assert.EndsWith(".png", cloudinary.FileName);
        Assert.Equal(cloudinary.PublicId, $"products/{Path.GetFileNameWithoutExtension(cloudinary.FileName)}");
    }

    [Theory]
    [InlineData(new byte[] { 1, 2, 3 })]
    public async Task SaveAsync_RejectsInvalidImageWithoutUploading(byte[] imageBytes)
    {
        var cloudinary = new FakeCloudinaryImageClient();
        var storage = CreateStorage(cloudinary);

        var result = await storage.SaveAsync(CreateFile(imageBytes), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.NotNull(result.Error);
        Assert.Equal(0, cloudinary.UploadCount);
    }

    [Fact]
    public async Task SaveAsync_RejectsFilesLargerThanFiveMegabytes()
    {
        var cloudinary = new FakeCloudinaryImageClient();
        var storage = CreateStorage(cloudinary);
        var fileBytes = new byte[ProductImageStorage.MaxFileSizeBytes + 1];

        var result = await storage.SaveAsync(CreateFile(fileBytes), CancellationToken.None);

        Assert.False(result.Succeeded);
        Assert.Equal(0, cloudinary.UploadCount);
    }

    [Fact]
    public async Task DeleteAsync_DeletesOnlyRecognizedProductImagesFromConfiguredCloud()
    {
        var cloudinary = new FakeCloudinaryImageClient();
        var storage = CreateStorage(cloudinary);
        var imageId = Guid.NewGuid().ToString("N");

        await storage.DeleteAsync(
            $"https://res.cloudinary.com/{CloudName}/image/upload/v1234567890/products/{imageId}.webp",
            CancellationToken.None);
        await storage.DeleteAsync("/uploads/products/legacy.png", CancellationToken.None);
        await storage.DeleteAsync(
            $"https://res.cloudinary.com/another-cloud/image/upload/v1234567890/products/{imageId}.png",
            CancellationToken.None);

        Assert.Equal($"products/{imageId}", cloudinary.DeletedPublicId);
        Assert.Equal(1, cloudinary.DeleteCount);
    }

    private static ProductImageStorage CreateStorage(FakeCloudinaryImageClient cloudinary)
    {
        return new ProductImageStorage(
            cloudinary,
            Options.Create(new CloudinaryOptions { CloudName = CloudName }));
    }

    private static IFormFile CreateFile(byte[] bytes)
    {
        return new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "product-image");
    }

    private sealed class FakeCloudinaryImageClient : ICloudinaryImageClient
    {
        public CloudinaryImageUploadResult UploadResult { get; } =
            new($"https://res.cloudinary.com/{CloudName}/image/upload/v1234567890/products/test.png");

        public byte[] UploadedBytes { get; private set; } = [];
        public string FileName { get; private set; } = string.Empty;
        public string PublicId { get; private set; } = string.Empty;
        public string? DeletedPublicId { get; private set; }
        public int UploadCount { get; private set; }
        public int DeleteCount { get; private set; }

        public async Task<CloudinaryImageUploadResult> UploadImageAsync(
            Stream file,
            string fileName,
            string publicId,
            CancellationToken cancellationToken)
        {
            UploadCount++;
            FileName = fileName;
            PublicId = publicId;
            using var buffer = new MemoryStream();
            await file.CopyToAsync(buffer, cancellationToken);
            UploadedBytes = buffer.ToArray();
            return UploadResult;
        }

        public Task DeleteImageAsync(string publicId, CancellationToken cancellationToken)
        {
            DeleteCount++;
            DeletedPublicId = publicId;
            return Task.CompletedTask;
        }
    }
}
