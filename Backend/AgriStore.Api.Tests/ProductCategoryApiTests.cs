using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.DTOs.Categories;
using AgriStore.Api.DTOs.Products;

namespace AgriStore.Api.Tests;

public sealed class ProductCategoryApiTests
{
    [Fact]
    public async Task CreateProduct_NormalizesCode_AndRejectsDuplicateCodes()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();

        var createResponse = await client.PostAsJsonAsync(
            "/api/products",
            NewProductRequest(catalog, "  apple-01  ", "Green Apple"));

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var product = await createResponse.Content.ReadFromJsonAsync<ProductResponse>();
        Assert.NotNull(product);
        Assert.Equal("APPLE-01", product.Code);

        var duplicateResponse = await client.PostAsJsonAsync(
            "/api/products",
            NewProductRequest(catalog, "apple-01", "Another Apple"));

        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
    }

    [Fact]
    public async Task CreateProduct_ReturnsBadRequest_WhenRequestIsInvalid()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();

        var response = await client.PostAsJsonAsync(
            "/api/products",
            NewProductRequest(catalog, "BAD CODE", "Invalid Product", sellingPrice: 0m));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListProducts_SearchesCaseInsensitively_AndPaginatesResults()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();
        await factory.SeedProductAsync(catalog, "APPLE-RED", "Red Gala");
        await factory.SeedProductAsync(catalog, "APPLE-GREEN", "Green Gala");
        await factory.SeedProductAsync(catalog, "PEAR-01", "Pear");

        var firstPage = await client.GetFromJsonAsync<ProductListResponse>(
            "/api/products?search=aPpLe&page=1&pageSize=1&sortBy=name&sortDirection=asc");
        var secondPage = await client.GetFromJsonAsync<ProductListResponse>(
            "/api/products?search=aPpLe&page=2&pageSize=1&sortBy=name&sortDirection=asc");
        var nameSearch = await client.GetFromJsonAsync<ProductListResponse>(
            "/api/products?search=gAlA&page=1&pageSize=10");

        Assert.NotNull(firstPage);
        Assert.NotNull(secondPage);
        Assert.NotNull(nameSearch);
        Assert.Equal(2, firstPage.TotalCount);
        Assert.Equal(2, firstPage.TotalPages);
        Assert.Single(firstPage.Items);
        Assert.Single(secondPage.Items);
        Assert.Equal("Green Gala", firstPage.Items.Single().Name);
        Assert.Equal("Red Gala", secondPage.Items.Single().Name);
        Assert.Equal(2, nameSearch.TotalCount);
        Assert.Equal(2, nameSearch.Items.Count);
    }

    [Fact]
    public async Task ListProducts_ReturnsBadRequest_WhenPriceRangeIsInvalid()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/products?minPrice=20&maxPrice=10");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ListProducts_FiltersInactiveProducts_WhenRequested()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();
        var activeProductId = await factory.SeedProductAsync(catalog, "ACTIVE-01", "Active product");
        await factory.SeedProductAsync(catalog, "INACTIVE-01", "Inactive product", isActive: false);

        var result = await client.GetFromJsonAsync<ProductListResponse>(
            "/api/products?isActive=true&page=1&pageSize=10");

        Assert.NotNull(result);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(activeProductId, Assert.Single(result.Items).Id);
    }

    [Fact]
    public async Task PublicProductEndpoints_HideInactiveProductsFromNonManagers()
    {
        using var factory = new ApiTestFactory();
        var catalog = await factory.SeedCatalogAsync();
        var activeProductId = await factory.SeedProductAsync(catalog, "ACTIVE-02", "Public product");
        var inactiveProductId = await factory.SeedProductAsync(
            catalog, "INACTIVE-02", "Hidden product", isActive: false);
        using var publicClient = factory.CreateClientAs(Guid.NewGuid());

        var publicList = await publicClient.GetFromJsonAsync<ProductListResponse>(
            "/api/products?isActive=false&page=1&pageSize=10");
        var inactiveDetails = await publicClient.GetAsync($"/api/products/{inactiveProductId}");

        Assert.NotNull(publicList);
        Assert.Equal(activeProductId, Assert.Single(publicList.Items).Id);
        Assert.Equal(HttpStatusCode.NotFound, inactiveDetails.StatusCode);

        using var adminClient = factory.CreateClient();
        var adminList = await adminClient.GetFromJsonAsync<ProductListResponse>(
            "/api/products?isActive=false&page=1&pageSize=10");
        var adminDetails = await adminClient.GetAsync($"/api/products/{inactiveProductId}");

        Assert.NotNull(adminList);
        Assert.Equal(inactiveProductId, Assert.Single(adminList.Items).Id);
        Assert.Equal(HttpStatusCode.OK, adminDetails.StatusCode);
    }

    [Fact]
    public async Task ProductImages_CanBeUploadedSelectedAndDeleted_AndRejectInvalidFiles()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        var catalog = await factory.SeedCatalogAsync();
        var productId = await factory.SeedProductAsync(catalog, "IMAGE-01", "Image Test");

        using var firstUpload = CreatePngUpload("first.png");
        var firstResponse = await client.PostAsync($"/api/products/{productId}/images", firstUpload);
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);
        var firstImage = await firstResponse.Content.ReadFromJsonAsync<ProductImageResponse>();
        Assert.NotNull(firstImage);
        Assert.True(firstImage.IsMain);

        using var invalidUpload = new MultipartFormDataContent();
        invalidUpload.Add(new ByteArrayContent("not an image"u8.ToArray()), "file", "invalid.txt");
        var invalidResponse = await client.PostAsync($"/api/products/{productId}/images", invalidUpload);
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);

        using var secondUpload = CreatePngUpload("second.png");
        var secondResponse = await client.PostAsync($"/api/products/{productId}/images", secondUpload);
        Assert.Equal(HttpStatusCode.Created, secondResponse.StatusCode);
        var secondImage = await secondResponse.Content.ReadFromJsonAsync<ProductImageResponse>();
        Assert.NotNull(secondImage);
        Assert.False(secondImage.IsMain);

        var setMainResponse = await client.PatchAsync(
            $"/api/products/{productId}/images/{secondImage.Id}/main",
            content: null);
        Assert.Equal(HttpStatusCode.OK, setMainResponse.StatusCode);

        var deleteMainResponse = await client.DeleteAsync(
            $"/api/products/{productId}/images/{secondImage.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteMainResponse.StatusCode);

        var product = await client.GetFromJsonAsync<ProductResponse>($"/api/products/{productId}");
        Assert.NotNull(product);
        var remainingImage = Assert.Single(product.Images);
        Assert.Equal(firstImage.Id, remainingImage.Id);
        Assert.True(remainingImage.IsMain);
        Assert.True(File.Exists(StoredImagePath(factory, firstImage.ImageUrl)));
        Assert.False(File.Exists(StoredImagePath(factory, secondImage.ImageUrl)));
    }

    [Fact]
    public async Task Categories_CreateParentAndChild_AndRejectDuplicatesAndCycles()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var parentResponse = await client.PostAsJsonAsync(
            "/api/categories",
            NewCategoryRequest("Fresh Produce"));
        Assert.Equal(HttpStatusCode.Created, parentResponse.StatusCode);
        var parent = await parentResponse.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(parent);

        var childResponse = await client.PostAsJsonAsync(
            "/api/categories",
            NewCategoryRequest("Leafy Greens", parent.Id));
        Assert.Equal(HttpStatusCode.Created, childResponse.StatusCode);
        var child = await childResponse.Content.ReadFromJsonAsync<CategoryResponse>();
        Assert.NotNull(child);
        Assert.Equal(parent.Id, child.ParentId);

        var children = await client.GetFromJsonAsync<CategoryListResponse>(
            $"/api/categories?parentId={parent.Id}&page=1&pageSize=10");
        Assert.NotNull(children);
        Assert.Equal(child.Id, Assert.Single(children.Items).Id);

        var duplicateResponse = await client.PostAsJsonAsync(
            "/api/categories",
            NewCategoryRequest("Fresh Produce"));
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        var cycleResponse = await client.PutAsJsonAsync(
            $"/api/categories/{parent.Id}",
            new UpdateCategoryRequest
            {
                Name = parent.Name,
                ParentId = child.Id,
                IsActive = true,
                SortOrder = parent.SortOrder
            });
        Assert.Equal(HttpStatusCode.Conflict, cycleResponse.StatusCode);
    }

    [Fact]
    public async Task ListCategories_SearchesAndPaginatesResults()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();
        foreach (var name in new[] { "Fruit Target A", "Fruit Target B", "Vegetable" })
        {
            var response = await client.PostAsJsonAsync("/api/categories", NewCategoryRequest(name));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        var firstPage = await client.GetFromJsonAsync<CategoryListResponse>(
            "/api/categories?search=Target&page=1&pageSize=1");
        var secondPage = await client.GetFromJsonAsync<CategoryListResponse>(
            "/api/categories?search=Target&page=2&pageSize=1");

        Assert.NotNull(firstPage);
        Assert.NotNull(secondPage);
        Assert.Equal(2, firstPage.TotalCount);
        Assert.Equal(2, firstPage.TotalPages);
        Assert.Single(firstPage.Items);
        Assert.Single(secondPage.Items);
        Assert.NotEqual(firstPage.Items.Single().Id, secondPage.Items.Single().Id);
    }

    private static CreateProductRequest NewProductRequest(
        CatalogSeed catalog,
        string code,
        string name,
        decimal sellingPrice = 10m) =>
        new()
        {
            Code = code,
            Name = name,
            CategoryId = catalog.CategoryId,
            UnitId = catalog.UnitId,
            CostPrice = 5m,
            SellingPrice = sellingPrice,
            MinStockAlert = 1m,
            IsActive = true
        };

    private static CreateCategoryRequest NewCategoryRequest(string name, Guid? parentId = null) =>
        new()
        {
            Name = name,
            ParentId = parentId,
            IsActive = true
        };

    private static MultipartFormDataContent CreatePngUpload(string fileName)
    {
        byte[] pngHeader =
        [
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x00
        ];
        var multipart = new MultipartFormDataContent();
        var image = new ByteArrayContent(pngHeader);
        image.Headers.ContentType = new("image/png");
        multipart.Add(image, "file", fileName);
        return multipart;
    }

    private static string StoredImagePath(ApiTestFactory factory, string imageUrl) =>
        Path.Combine(
            factory.TestWebRootPath,
            imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
}
