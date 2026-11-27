using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.DTOs.ProductReviews;

namespace AgriStore.Api.Tests;

public sealed class ProductReviewApiTests
{
    [Fact]
    public async Task CustomerCanSubmitReview_AndAdminCanApproveIt()
    {
        using var factory = new ApiTestFactory();
        var catalog = await factory.SeedCatalogAsync();
        var productId = await factory.SeedProductAsync(catalog, "REVIEW-01", "Review Test Product");
        var customerUserId = Guid.NewGuid();
        await factory.SeedCompletedPurchaseAsync(customerUserId, productId);
        using var customerClient = factory.CreateClientAs(customerUserId, "Customer");

        var createResponse = await customerClient.PostAsJsonAsync(
            $"/api/products/{productId}/reviews",
            new CreateProductReviewRequest { Rating = 5, Comment = "Fresh and well packed." });

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var review = await createResponse.Content.ReadFromJsonAsync<ProductReviewResponse>();
        Assert.NotNull(review);
        Assert.False(review.IsApproved);

        var publicList = await customerClient.GetFromJsonAsync<ProductReviewListResponse>(
            $"/api/products/{productId}/reviews?page=1&pageSize=10");
        Assert.NotNull(publicList);
        Assert.Empty(publicList.Items);
        Assert.Equal(0, publicList.TotalCount);

        var pendingForCustomer = await customerClient.GetAsync(
            $"/api/products/{productId}/reviews?includePending=true");
        Assert.Equal(HttpStatusCode.Forbidden, pendingForCustomer.StatusCode);

        using var adminClient = factory.CreateClient();
        var pendingForAdmin = await adminClient.GetFromJsonAsync<ProductReviewListResponse>(
            $"/api/products/{productId}/reviews?page=1&pageSize=10&includePending=true");
        Assert.NotNull(pendingForAdmin);
        Assert.Equal(review.Id, Assert.Single(pendingForAdmin.Items).Id);

        var approvalResponse = await adminClient.PatchAsJsonAsync(
            $"/api/product-reviews/{review.Id}/approval",
            new SetProductReviewApprovalRequest { IsApproved = true });
        Assert.Equal(HttpStatusCode.OK, approvalResponse.StatusCode);

        var publishedReviews = await customerClient.GetFromJsonAsync<ProductReviewListResponse>(
            $"/api/products/{productId}/reviews?page=1&pageSize=10");
        Assert.NotNull(publishedReviews);
        Assert.Equal(review.Id, Assert.Single(publishedReviews.Items).Id);

        var duplicateResponse = await customerClient.PostAsJsonAsync(
            $"/api/products/{productId}/reviews",
            new CreateProductReviewRequest { Rating = 4, Comment = "A second review." });
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var deleteResponse = await adminClient.DeleteAsync($"/api/product-reviews/{review.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        var reviewsAfterDeletion = await customerClient.GetFromJsonAsync<ProductReviewListResponse>(
            $"/api/products/{productId}/reviews?page=1&pageSize=10");
        Assert.NotNull(reviewsAfterDeletion);
        Assert.Empty(reviewsAfterDeletion.Items);
    }

    [Fact]
    public async Task CreateReview_RejectsInvalidRatingAndCustomersWithoutCompletedPurchase()
    {
        using var factory = new ApiTestFactory();
        var catalog = await factory.SeedCatalogAsync();
        var productId = await factory.SeedProductAsync(catalog, "REVIEW-02", "Review Validation Product");
        var customerUserId = Guid.NewGuid();
        using var customerClient = factory.CreateClientAs(customerUserId, "Customer");

        var invalidRatingResponse = await customerClient.PostAsJsonAsync(
            $"/api/products/{productId}/reviews",
            new CreateProductReviewRequest { Rating = 0, Comment = "Invalid rating." });
        Assert.Equal(HttpStatusCode.BadRequest, invalidRatingResponse.StatusCode);

        var noPurchaseResponse = await customerClient.PostAsJsonAsync(
            $"/api/products/{productId}/reviews",
            new CreateProductReviewRequest { Rating = 4 });
        Assert.Equal(HttpStatusCode.Conflict, noPurchaseResponse.StatusCode);
    }

    [Fact]
    public async Task GetReviews_RejectsInvalidPagination()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();
        var productId = await factory.SeedProductAsync(catalog, "REVIEW-03", "Review Paging Product");

        var response = await client.GetAsync(
            $"/api/products/{productId}/reviews?page=1&pageSize=101");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
