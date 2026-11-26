using System.Net;
using System.Net.Http.Json;
using AgriStore.Api.DTOs.Suppliers;

namespace AgriStore.Api.Tests;

/// <summary>
/// Kiểm thử tích hợp toàn bộ luồng API Nhà cung cấp (/api/suppliers).
/// Tuần 9 — Nhiệm vụ: "Viết test API Nhà cung cấp và Đơn nhập hàng".
/// </summary>
public sealed class SupplierApiTests
{
    // ------------------------------------------------------------------ helpers

    private static CreateSupplierRequest ValidCreate(string suffix = "") => new()
    {
        Code = $"SUP-{suffix}{Guid.NewGuid():N}"[..10].ToUpperInvariant(),
        Name = $"Nhà cung cấp kiểm thử {suffix}".Trim(),
        ContactPerson = "Nguyễn Văn A",
        Phone = "0901234567",
        Email = "ncc@agristore.vn",
        Address = "123 Đường Nông Sản, Đà Lạt",
        TaxCode = "0123456789",
        Notes = "Hợp tác xã thử nghiệm"
    };

    private static UpdateSupplierRequest ToUpdate(CreateSupplierRequest src, string nameSuffix = " (đã cập nhật)") => new()
    {
        Code = src.Code,
        Name = src.Name + nameSuffix,
        ContactPerson = src.ContactPerson,
        Phone = src.Phone,
        Email = src.Email,
        Address = src.Address,
        TaxCode = src.TaxCode,
        Notes = src.Notes
    };

    // ------------------------------------------------------------------ tests

    /// <summary>
    /// POST /api/suppliers — tạo mới hợp lệ → 201 Created, trả về SupplierResponse.
    /// </summary>
    [Fact]
    public async Task CreateSupplier_ReturnsCreated_WhenValidRequest()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var request = ValidCreate();
        var response = await client.PostAsJsonAsync("/api/suppliers", request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        Assert.NotEqual(Guid.Empty, body.Id);
        Assert.Equal(request.Code, body.Code);
        Assert.Equal(request.Name, body.Name);
        Assert.True(body.IsActive);
    }

    /// <summary>
    /// POST /api/suppliers — mã trùng → 409 Conflict.
    /// </summary>
    [Fact]
    public async Task CreateSupplier_ReturnsConflict_WhenCodeIsDuplicated()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var request = ValidCreate("dup");
        await client.PostAsJsonAsync("/api/suppliers", request);

        // Gửi lại cùng mã Code
        var duplicate = new CreateSupplierRequest
        {
            Code = request.Code,
            Name = "Tên khác"
        };
        var response = await client.PostAsJsonAsync("/api/suppliers", duplicate);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    /// <summary>
    /// POST /api/suppliers — thiếu Name bắt buộc → 400 Bad Request.
    /// </summary>
    [Fact]
    public async Task CreateSupplier_ReturnsBadRequest_WhenNameIsEmpty()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        // Name là empty string — service sẽ trả 400
        var request = new CreateSupplierRequest
        {
            Code = "SUP-NONAME",
            Name = "   "   // chỉ có khoảng trắng
        };
        var response = await client.PostAsJsonAsync("/api/suppliers", request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /// <summary>
    /// GET /api/suppliers/{id} — id tồn tại → 200 OK với dữ liệu đúng.
    /// </summary>
    [Fact]
    public async Task GetSupplierById_ReturnsOk_WhenExists()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var created = await CreateSupplierAsync(client, ValidCreate("get"));

        var response = await client.GetAsync($"/api/suppliers/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        Assert.Equal(created.Id, body.Id);
        Assert.Equal(created.Name, body.Name);
    }

    /// <summary>
    /// GET /api/suppliers/{id} — id không tồn tại → 404 Not Found.
    /// </summary>
    [Fact]
    public async Task GetSupplierById_ReturnsNotFound_WhenMissing()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync($"/api/suppliers/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    /// <summary>
    /// PUT /api/suppliers/{id} — cập nhật tên → 200 OK, tên được cập nhật.
    /// </summary>
    [Fact]
    public async Task UpdateSupplier_ReturnsOk_AndNameIsUpdated()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var created = await CreateSupplierAsync(client, ValidCreate("upd"));
        var updateReq = ToUpdate(ValidCreate("upd"));
        // Giữ lại Code gốc
        var finalUpdate = updateReq with { Code = created.Code };

        var response = await client.PutAsJsonAsync($"/api/suppliers/{created.Id}", finalUpdate);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        Assert.Equal(finalUpdate.Name, body.Name);
        Assert.Equal(created.Id, body.Id);
    }

    /// <summary>
    /// PATCH /api/suppliers/{id}/status — tắt hoạt động → IsActive = false.
    /// </summary>
    [Fact]
    public async Task SetStatus_DeactivatesSupplier_ReturnsOk()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var created = await CreateSupplierAsync(client, ValidCreate("sta"));
        Assert.True(created.IsActive);

        var response = await client.PatchAsJsonAsync(
            $"/api/suppliers/{created.Id}/status",
            new SupplierStatusRequest(IsActive: false));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        Assert.False(body.IsActive);

        // Kiểm tra GET cũng phản ánh trạng thái mới
        var getBody = await client.GetFromJsonAsync<SupplierResponse>($"/api/suppliers/{created.Id}");
        Assert.NotNull(getBody);
        Assert.False(getBody.IsActive);
    }

    /// <summary>
    /// DELETE /api/suppliers/{id} — xóa mềm → IsActive = false.
    /// </summary>
    [Fact]
    public async Task DeleteSupplier_SoftDeletes_AndIsActiveBecomeFalse()
    {
        using var factory = new ApiTestFactory();
        using var client = factory.CreateClient();

        var created = await CreateSupplierAsync(client, ValidCreate("del"));

        var deleteResponse = await client.DeleteAsync($"/api/suppliers/{created.Id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
        var body = await deleteResponse.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        Assert.False(body.IsActive);

        // Confirm GET vẫn tìm thấy nhưng IsActive = false
        var getBody = await client.GetFromJsonAsync<SupplierResponse>($"/api/suppliers/{created.Id}");
        Assert.NotNull(getBody);
        Assert.False(getBody.IsActive);
    }

    // ------------------------------------------------------------------ helper

    private static async Task<SupplierResponse> CreateSupplierAsync(
        HttpClient client,
        CreateSupplierRequest request)
    {
        var response = await client.PostAsJsonAsync("/api/suppliers", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SupplierResponse>();
        Assert.NotNull(body);
        return body;
    }
}
