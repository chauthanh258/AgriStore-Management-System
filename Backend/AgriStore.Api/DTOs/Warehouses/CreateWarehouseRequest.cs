using System.ComponentModel.DataAnnotations;

namespace AgriStore.Api.DTOs.Warehouses;

public class CreateWarehouseRequest
{
    [Required(ErrorMessage = "Tên kho không được để trống")]
    public string Name { get; set; } = string.Empty;

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public bool IsDefault { get; set; } = false;
}